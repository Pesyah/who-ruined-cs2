import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { normalizeSnapshot, type NormalizationInput } from '../src/index.js';

const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('parser-neutral normalization input', () => {
  it('preserves unavailable roster and round data without inventing values', () => {
    const input: NormalizationInput = {
      matchId: 'm',
      fileSha256: 'b'.repeat(64),
      map: 'de_test',
      players: [],
      events: [],
      ticks: [],
      provenance: { parser: '@laihoe/demoparser2', parserVersion: '0.42.0' },
      normalizedAt: '2026-10-15T00:00:00.000Z',
    };

    const match = normalizeSnapshot(input);

    expect(digest(match)).toBe('e73523157a910d11754cfb1d7b0157ce49b19573f06be690058def6cdfed4e7a');
    expect(match.quality).toBe('PARTIAL');
    expect(match.qualityIssues.map((issue) => issue.code)).toContain('ROSTER_UNVERIFIED');
    expect(match.qualityIssues.map((issue) => issue.code)).toContain('ROUNDS_MISSING');
  });
});
