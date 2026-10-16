import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { summarize, validateDemoIsolated } from './index.js';

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
  return found.sort((a, b) => a.localeCompare(b));
}

const args = process.argv.slice(2).filter((argument) => argument !== '--');
const rootArg = args.find((argument) => !argument.startsWith('--'));
if (!rootArg) throw new Error('Usage: pnpm validate:demos "path/to/demos" [--output=path.json]');
const root = path.resolve(rootArg);
const generatedAt = new Date().toISOString();
const defaultName = `demo-validation-${generatedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`;
const outputArg = args.find((argument) => argument.startsWith('--output='))?.slice('--output='.length);
const invocationRoot = path.resolve(process.env.INIT_CWD ?? process.cwd());
const output = path.resolve(outputArg ?? path.join(invocationRoot, 'data', 'reports', defaultName));
const demos = await findDemos(root);
const results = [];
let withInfo = 0;
for (const demo of demos) {
  const info = `${demo}.info`;
  let infoPath: string | null = null;
  try { await access(info); infoPath = info; } catch { infoPath = null; }
  if (infoPath) withInfo += 1;
  const result = await validateDemoIsolated(demo, infoPath);
  results.push(result);
  const score = result.metadata.scoreStableTeamOrder?.join(':') ?? 'n/a';
  process.stdout.write(`${result.status.padEnd(7)} ${result.demoId} map=${result.metadata.map ?? 'unknown'} score=${score} rounds=${result.metadata.rounds}\n`);
}
const report = summarize(results, withInfo, generatedAt);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`Summary: discovered=${report.summary.discovered} PASS=${report.summary.pass} PARTIAL=${report.summary.partial} FAIL=${report.summary.fail} SKIPPED=${report.summary.skipped} info=${report.summary.withInfo}\n`);
process.stdout.write(`JSON report: ${output}\n`);
process.exitCode = report.summary.fail > 0 ? 1 : 0;
