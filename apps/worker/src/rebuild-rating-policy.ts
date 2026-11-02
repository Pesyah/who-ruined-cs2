import path from 'node:path';
import { prisma, ACTIVE_JOB_STAGES } from '@who-ruined/database';
import { H2_PARTICIPATION_RATING_POLICY, rebuildCanonicalMatchResult } from '@who-ruined/scoring';
import { publishCanonicalMatchResult, readCanonicalMatchResult, removeOwnedResult } from './match-result-storage.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dryRun = args.has('--dry-run');
const force = args.has('--force');
if (apply === dryRun) throw new Error('Specify exactly one of --dry-run or --apply');
const matchArg = [...args].find((arg) => arg.startsWith('--match='));
const selectedMatchId = matchArg?.slice('--match='.length);
const target = H2_PARTICIPATION_RATING_POLICY;
const dataRoot = path.resolve(process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'));
const matches = await prisma.match.findMany({
  where: { resultFilePath: { not: null }, ...(selectedMatchId ? { id: selectedMatchId } : {}) },
  orderBy: { id: 'asc' }
});
let ready = 0; let changed = 0; let blocked = 0; let maxReconstructionError = 0;
for (const match of matches) {
  try {
    if (match.deletionState) throw new Error('MATCH_DELETION_IN_PROGRESS');
    const activeJobs = await prisma.job.count({ where: { matchId: match.id, status: { in: [...ACTIVE_JOB_STAGES] } } });
    if (activeJobs) throw new Error('MATCH_ACTIVE');
    const current = await readCanonicalMatchResult(dataRoot, match.resultFilePath!, match.resultSha256 ?? undefined);
    const next = rebuildCanonicalMatchResult(current);
    for (const player of next.activeRating.players) {
      if (!player.rating) continue;
      maxReconstructionError = Math.max(
        maxReconstructionError,
        Math.abs(player.rating.value - player.rating.arithmetic.reconstructed)
      );
    }
    if (
      !force
      && current.internal.selectedPolicySelector === target.selector
      && current.internal.selectedPolicyId === target.id
      && current.internal.selectedPolicyDigest === target.digest
    ) {
      ready += 1; process.stdout.write(`${match.id}\tREADY\n`); continue;
    }
    if (!apply) { changed += 1; process.stdout.write(`${match.id}\tWOULD_REBUILD\n`); continue; }
    const published = await publishCanonicalMatchResult(dataRoot, next, async () => {
      const owned = await prisma.match.count({ where: { id: match.id, resultFilePath: match.resultFilePath, resultSha256: match.resultSha256, deletionState: null } });
      if (owned !== 1) throw new Error('MATCH_RESULT_POINTER_CHANGED');
    });
    await prisma.$transaction(async (transaction) => {
      const active = await transaction.job.count({ where: { matchId: match.id, status: { in: [...ACTIVE_JOB_STAGES] } } });
      if (active) throw new Error('MATCH_ACTIVE');
      const updated = await transaction.match.updateMany({
        where: { id: match.id, resultFilePath: match.resultFilePath, resultSha256: match.resultSha256, deletionState: null },
        data: { resultFilePath: published.relativePath, resultSha256: published.sha256, resultSchemaVersion: next.schemaVersion, resultPolicyId: target.id, resultPolicyDigest: target.digest }
      });
      if (updated.count !== 1) throw new Error('MATCH_RESULT_POINTER_CHANGED');
    });
    if (match.resultFilePath !== published.relativePath) await removeOwnedResult(dataRoot, match.resultFilePath!);
    changed += 1; process.stdout.write(`${match.id}\tREBUILT\n`);
  } catch (error) {
    blocked += 1; process.stderr.write(`${match.id}\tBLOCKED\t${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
  }
}
process.stdout.write(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  target: H2_PARTICIPATION_RATING_POLICY.selector,
  matches: matches.length,
  ready,
  changed,
  blocked,
  maxReconstructionError
}) + '\n');
await prisma.$disconnect();
if (blocked) process.exitCode = 2;
