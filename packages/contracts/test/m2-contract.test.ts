import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { matchAnalyticsSchema } from '../src/index.js';

describe('M2 public contract', () => {
  it('accepts the committed anonymized frontend fixture', async () => {
    const fixture = JSON.parse(await readFile(new URL('../../../tests/fixtures/m2-match-analytics.json', import.meta.url), 'utf8')) as unknown;
    expect(matchAnalyticsSchema.parse(fixture).schemaVersion).toBe('m2-1');
    expect(JSON.stringify(fixture)).not.toMatch(/7656119\d{10}/);
  });
  it('rejects omitted availability instead of silently treating unknown as zero', () => {
    expect(matchAnalyticsSchema.safeParse({ schemaVersion: 'm2-1' }).success).toBe(false);
  });
});
