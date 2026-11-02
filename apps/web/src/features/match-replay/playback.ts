const PRE_ROLL_SECONDS = 5;

export function initialReplayTick(startTick: number, endTick: number, tickRate: number, focusTick: number | null): number {
  const requested = focusTick === null ? startTick : focusTick - tickRate * PRE_ROLL_SECONDS;
  return Math.max(startTick, Math.min(endTick, requested));
}

export function eventReplayTick(startTick: number, tickRate: number, eventTick: number): number {
  return Math.max(startTick, eventTick - tickRate * PRE_ROLL_SECONDS);
}
