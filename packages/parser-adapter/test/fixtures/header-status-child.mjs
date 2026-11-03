import { Buffer } from 'node:buffer';
import process from 'node:process';
import { setInterval } from 'node:timers';

const value = Buffer.from(process.argv[2] ?? '', 'base64url').toString('utf8');
if (value.includes('hang')) {
  setInterval(() => undefined, 1000);
} else {
  process.stdout.write(value.includes('invalid') ? 'INVALID' : 'VALID');
}
