import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchesService } from '../src/matches.service.js';

describe('upload validation', () => {
  it('rejects a malformed .dem before creating database state', async () => {
    const filePath = path.join(process.cwd(), `${randomUUID()}.dem`);
    await writeFile(filePath, Buffer.from('not a demo'));
    const file = { path: filePath, originalname: 'broken.dem', size: 10 } as Express.Multer.File;
    await expect(new MatchesService().ingest(file)).rejects.toMatchObject({ code: 'INVALID_DEMO', status: 422 });
    await rm(filePath, { force: true });
  });
  it('rejects a wrong extension without invoking the parser', async () => {
    const filePath = path.join(process.cwd(), `${randomUUID()}.bin`);
    await writeFile(filePath, Buffer.from('x'));
    const file = { path: filePath, originalname: 'unsafe.exe', size: 1 } as Express.Multer.File;
    await expect(new MatchesService().ingest(file)).rejects.toMatchObject({ code: 'INVALID_DEMO', status: 415 });
    await rm(filePath, { force: true });
  });
});
