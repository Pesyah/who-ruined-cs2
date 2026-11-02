import { describe, expect, it } from 'vitest';

import { eventReplayTick, initialReplayTick } from './playback.js';

describe('replay pre-roll compatibility', () => {
  it('starts five seconds before a focused tick and clamps to round bounds', () => {
    expect(initialReplayTick(1_000, 9_000, 64, 2_000)).toBe(1_680);
    expect(initialReplayTick(1_000, 9_000, 64, 1_100)).toBe(1_000);
    expect(initialReplayTick(1_000, 9_000, 64, 10_000)).toBe(9_000);
    expect(initialReplayTick(1_000, 9_000, 64, null)).toBe(1_000);
  });

  it('uses the same five-second pre-roll for event navigation', () => {
    expect(eventReplayTick(1_000, 64, 2_000)).toBe(1_680);
    expect(eventReplayTick(1_000, 64, 1_100)).toBe(1_000);
  });
});
