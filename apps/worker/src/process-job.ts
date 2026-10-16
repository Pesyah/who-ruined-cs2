import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@who-ruined/database';
import { matchArtifactSchema, matchDataSchema } from '@who-ruined/contracts';
import { computeMatchAnalytics } from '@who-ruined/features';
import { normalizeSnapshot } from '@who-ruined/match-domain';
import { parseDemoSnapshot } from '@who-ruined/parser-adapter';
import { resolveDataPath } from './storage.js';

const zip = promisify(gzip);
const dataRoot = path.resolve(process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'));
function safePath(relativePath: string): string { return resolveDataPath(dataRoot, relativePath); }
async function stage(jobId: string, status: string): Promise<void> { await prisma.job.update({ where: { id: jobId }, data: { status, stage: status, leaseUntil: new Date(Date.now() + 120_000) } }); }

export async function processJob(jobId: string, matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.rawFilePath) throw new Error('Raw demo is unavailable');
  const started = Date.now();
  try {
    await stage(jobId, 'PARSING');
    const snapshot = parseDemoSnapshot(safePath(match.rawFilePath));
    if (Date.now() - started > Number(process.env.PARSE_TIMEOUT_MS ?? 120_000)) throw new Error('PARSE_TIMEOUT');
    await stage(jobId, 'NORMALIZING');
    const normalized = normalizeSnapshot({ matchId, fileSha256: match.fileSha256, snapshot });
    await stage(jobId, 'VALIDATING');
    const validated = matchDataSchema.parse(normalized);
    await stage(jobId, 'FEATURIZING');
    const analytics = computeMatchAnalytics(validated);
    const artifact = matchArtifactSchema.parse({ schemaVersion: 'm2-artifact-1', match: validated, analytics });
    const relative = `cache/${matchId}.json.gz`; const finalPath = safePath(relative); const temporary = `${finalPath}.${jobId}.tmp`;
    await mkdir(path.dirname(finalPath), { recursive: true });
    await writeFile(temporary, await zip(Buffer.from(JSON.stringify(artifact))));
    await rename(temporary, finalPath);
    const terminal = validated.quality === 'VALID' ? 'COMPLETED' : 'PARTIAL';
    await prisma.$transaction([
      prisma.match.update({ where: { id: matchId }, data: { status: terminal, quality: validated.quality, map: validated.map, normalizedFilePath: relative } }),
      prisma.job.update({ where: { id: jobId }, data: { status: terminal, stage: terminal, leaseUntil: null } })
    ]);
  } catch (error) {
    const timeout = error instanceof Error && error.message === 'PARSE_TIMEOUT';
    console.error(JSON.stringify({ level: 'error', jobId, matchId, message: error instanceof Error ? error.message : 'Unknown worker error' }));
    await prisma.$transaction([
      prisma.match.update({ where: { id: matchId }, data: { status: 'FAILED', quality: 'UNSUPPORTED' } }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED', stage: 'FAILED', leaseUntil: null, errorCode: timeout ? 'PARSE_TIMEOUT' : 'PARSE_FAILED', errorMessage: timeout ? 'Превышено время разбора демо.' : 'Парсер не смог безопасно обработать демо.' } })
    ]);
  }
}
