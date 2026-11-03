import { Buffer } from 'node:buffer';
import path from 'node:path';
import process from 'node:process';
import { isSource2Header, loadNativeParser } from './native-adapter.js';

const encodedPath = process.argv[2];
if (!encodedPath || encodedPath.length > 4096) process.exit(64);

let demoPath: string;
try {
  demoPath = Buffer.from(encodedPath, 'base64url').toString('utf8');
} catch {
  process.exit(64);
}
if (!path.isAbsolute(demoPath) || demoPath.length > 1024) process.exit(64);

try {
  const header = loadNativeParser().parseHeader(demoPath);
  process.stdout.write(isSource2Header(header) ? 'VALID' : 'INVALID');
} catch {
  process.stdout.write('UNREADABLE');
}
