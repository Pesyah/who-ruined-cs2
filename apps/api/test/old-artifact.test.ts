import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const readFile = vi.fn();
vi.mock('@who-ruined/database', () => ({ prisma: { match: { findUnique }, report: { findUnique: vi.fn() }, job: { create: vi.fn() } } }));
vi.mock('node:fs/promises', async (original) => ({ ...(await original<typeof import('node:fs/promises')>()), readFile }));

const { MatchesService } = await import('../src/matches.service.js');

describe('old artifact rescore semantics', () => {
  beforeEach(() => {
    findUnique.mockResolvedValue({ id: 'legacy_match', normalizedFilePath: 'cache/legacy.json.gz' });
    readFile.mockResolvedValue(gzipSync(Buffer.from(JSON.stringify({ schemaVersion: '1', obsolete: true }))));
  });

  it('returns 409 instead of inventing M2 analytics or leaking a Zod error', async () => {
    await expect(new MatchesService().rescore('legacy_match', { scoringVersion: 'scoring-successor@0.1.0-alpha75-beta25' })).rejects.toMatchObject({ code: 'INCOMPLETE_MATCH', status: 409 });
  });
});
