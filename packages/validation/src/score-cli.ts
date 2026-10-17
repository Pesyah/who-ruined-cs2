import { spawn } from 'node:child_process';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnonymousScoreResult } from './score-child.js';
import { assertAnonymousScoringExport } from './scoring-privacy.js';

async function findDemos(root: string): Promise<string[]> {
  const found: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.dem')) found.push(full);
    }
  }
  await visit(root);
  return found.sort((left, right) => left.localeCompare(right));
}

async function scoreIsolated(demoPath: string, timeoutMs = 240_000): Promise<AnonymousScoreResult> {
  const sourceRuntime = import.meta.url.endsWith('.ts');
  const childPath = fileURLToPath(new URL(sourceRuntime ? './score-child.ts' : './score-child.js', import.meta.url));
  return new Promise((resolve, reject) => {
    const args = [...(sourceRuntime ? ['--import', 'tsx'] : []), childPath, demoPath];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = ''; let stderr = ''; let settled = false;
    const finish = (callback: () => void): void => { if (settled) return; settled = true; clearTimeout(timer); callback(); };
    child.stdout.setEncoding('utf8'); child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('exit', (code) => finish(() => code === 0 ? resolve(JSON.parse(stdout) as AnonymousScoreResult) : reject(new Error(stderr || `Child exited ${code}`))));
    const timer = setTimeout(() => { child.kill(); finish(() => reject(new Error('Scoring child timed out'))); }, timeoutMs);
  });
}

const args = process.argv.slice(2).filter((argument) => argument !== '--');
const rootArg = args.find((argument) => !argument.startsWith('--'));
if (!rootArg) throw new Error('Usage: pnpm score:demos "path/to/demos" [--output=path.json]');
const root = path.resolve(rootArg);
await access(root);
const generatedAt = new Date().toISOString();
const invocationRoot = path.resolve(process.env.INIT_CWD ?? process.cwd());
const outputArg = args.find((argument) => argument.startsWith('--output='))?.slice('--output='.length);
const output = path.resolve(outputArg ?? path.join(invocationRoot, 'data', 'reports', `scoring-comparison-${generatedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`));
const researchPath = path.join(invocationRoot, 'data', 'research', 'unusual-episodes.json');
const demos = await findDemos(root);
const results: AnonymousScoreResult[] = [];
const failures: Array<{ ordinal: number; reason: string }> = [];
for (const [index, demo] of demos.entries()) {
  try {
    const result = await scoreIsolated(demo);
    results.push(result);
    const successor = result.configs.find((config) => config.version.includes('alpha75-beta25'));
    process.stdout.write(`PASS ${result.demoId} map=${result.map ?? 'unknown'} score=${result.score?.join(':') ?? 'n/a'} rounds=${result.rounds} who=${successor?.whoRuined ?? 'n/a'}\n`);
  } catch (error) {
    failures.push({ ordinal: index + 1, reason: error instanceof Error ? error.message.slice(0, 240) : 'Unknown scoring error' });
    process.stdout.write(`FAIL demo_${String(index + 1).padStart(2, '0')}\n`);
  }
}
const privacy = { personalDataIncluded: false, filePathsIncluded: false } as const;
const sensitivity = results.map((result) => {
  const baseline = result.configs.find((config) => config.version.includes('alpha75-beta25'));
  const changes = result.configs.filter((config) => config.model === 'SUCCESSOR' && config.version !== baseline?.version && config.whoRuined !== baseline?.whoRuined).map((config) => ({
    version: config.version, from: baseline?.whoRuined ?? null, to: config.whoRuined,
    selectedPlayerFacts: config.ranking.find((player) => player.player === config.whoRuined) ?? null
  }));
  return { demoId: result.demoId, baseline: baseline?.whoRuined ?? null, changes };
});
const report = { schemaVersion: 'scoring-comparison-1', generatedAt, privacy, summary: { discovered: demos.length, scored: results.length, failed: failures.length, researchEpisodes: results.reduce((sum, item) => sum + item.research.length, 0), unusualCases: results.reduce((sum, item) => sum + item.observations.length, 0), matchesWithSensitivityChange: sensitivity.filter((item) => item.changes.length > 0).length }, demos: results, sensitivity, failures };
const journal = { schemaVersion: 'scoring-research-journal-1', generatedAt, privacy, cases: results.flatMap((result) => result.observations.map((episode) => ({ demoId: result.demoId, map: result.map, ...episode }))) };
assertAnonymousScoringExport(report);
assertAnonymousScoringExport(journal);
await mkdir(path.dirname(output), { recursive: true });
await mkdir(path.dirname(researchPath), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(researchPath, `${JSON.stringify(journal, null, 2)}\n`, 'utf8');
process.stdout.write(`Summary: discovered=${demos.length} scored=${results.length} failed=${failures.length} researchHypotheses=${report.summary.researchEpisodes} unusualCases=${journal.cases.length}\nJSON report: ${output}\nResearch journal: ${researchPath}\n`);
process.exitCode = failures.length > 0 ? 1 : 0;
