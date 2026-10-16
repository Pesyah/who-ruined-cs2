import { describe, expect, it } from 'vitest';
import { steamProfileUrl } from './player.js';

describe('Steam profile link', () => {
  it('constructs a profile URL without numeric conversion', () => {
    expect(steamProfileUrl('76561198000000123')).toBe('https://steamcommunity.com/profiles/76561198000000123');
  });

  it('does not link missing or malformed identifiers', () => {
    expect(steamProfileUrl(null)).toBeNull();
    expect(steamProfileUrl('123')).toBeNull();
  });
});
