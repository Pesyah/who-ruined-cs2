import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { summarize, validateDemoIsolated } from '../src/index.js';

describe('batch demo validation safety', () => {
  it('reports corrupt and truncated demos independently without leaking paths', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wrcs2-validation-'));
    try {
      const corrupt = path.join(directory, 'private-name.dem'); const truncated = path.join(directory, 'another-private-name.dem');
      await writeFile(corrupt, Buffer.from('not a demo'));
      await writeFile(truncated, Buffer.from('PBDEMS2\0'));
      const results = await Promise.all([validateDemoIsolated(corrupt, null), validateDemoIsolated(truncated, null)]);
      expect(results.map((result) => result.status)).toEqual(['FAIL', 'FAIL']);
      const report = summarize(results, 0, '2026-10-16T00:00:00.000Z');
      expect(report.summary).toMatchObject({ discovered: 2, fail: 2, withInfo: 0 });
      const exported = JSON.stringify(report);
      expect(exported).not.toContain(directory);
      expect(exported).not.toContain('private-name');
      expect(report.privacy).toEqual({ personalDataIncluded: false, filePathsIncluded: false });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
