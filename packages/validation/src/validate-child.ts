import { validateDemo } from './index.js';

const demoPath = process.argv[2];
if (!demoPath) process.exit(2);
const infoPath = process.argv[3] || null;
const result = await validateDemo(demoPath, infoPath);
process.stdout.write(JSON.stringify(result));
