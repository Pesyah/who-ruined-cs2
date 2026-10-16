import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scoringReportSchema } from '../src/index.js';

describe('M3 frontend contract fixture', () => {
  it('is anonymous and conforms to the versioned scoring DTO', () => {
    const raw = readFileSync(new URL('../../../tests/fixtures/m3-scoring-report.json', import.meta.url), 'utf8');
    expect(raw).not.toMatch(/7656119\d{10}/);
    expect(raw).not.toMatch(/[A-Z]:\\/i);
    const report = scoringReportSchema.parse(JSON.parse(raw) as unknown);
    expect(report.experimental).toBe(true);
    expect(report.episodes[0]?.evidenceEventIds).toEqual(['event_16', 'event_17']);
  });
});
