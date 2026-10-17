import { describe, expect, it } from 'vitest';
import { assertAnonymousScoringExport } from '../src/scoring-privacy.js';

describe('scoring export privacy', () => {
  it('accepts anonymous aliases and aggregate facts', () => expect(() => assertAnonymousScoringExport({ demoId: 'abcdef0123456789', player: 'player_01', map: 'de_train' })).not.toThrow());
  it.each([
    { steamId: '76561198000000001' },
    { displayName: 'private nickname' },
    { note: 'F:\\CS2 Demos\\private.dem' }
  ])('rejects personal/path-bearing output %#', (value) => expect(() => assertAnonymousScoringExport(value)).toThrow('privacy invariant'));
});
