import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDataPath } from '../src/storage.js';

describe('artifact path confinement', () => {
  it('keeps artifacts under DATA_DIR', () => expect(resolveDataPath(path.resolve('data'), 'cache/m.json.gz')).toBe(path.resolve('data/cache/m.json.gz')));
  it('rejects traversal and the root itself', () => {
    expect(() => resolveDataPath(path.resolve('data'), '../secret')).toThrow('Unsafe artifact path');
    expect(() => resolveDataPath(path.resolve('data'), '.')).toThrow('Unsafe artifact path');
  });
});
