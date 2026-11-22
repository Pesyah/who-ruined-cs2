import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');
const projects = ['tests'];
for (const group of ['apps', 'packages']) {
  for (const workspace of readdirSync(join(root, group)).sort()) {
    const directory = join(group, workspace, 'test');
    if (existsSync(join(root, directory))) projects.push(directory);
  }
}

const compiler = require.resolve('typescript/lib/tsc.js');
let failed = false;
for (const directory of projects) {
  const config = join(directory, 'tsconfig.json');
  if (!existsSync(join(root, config))) {
    console.error(`${config}: add a discoverable strict TypeScript project for these tests`);
    failed = true;
    continue;
  }
  const result = spawnSync(process.execPath, [compiler, '-p', config, '--pretty', 'false'], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) { console.error(`${config}: test typecheck failed`); failed = true; }
}
if (failed) process.exitCode = 1;
else console.log(`Typechecked ${projects.length} configured test projects.`);
