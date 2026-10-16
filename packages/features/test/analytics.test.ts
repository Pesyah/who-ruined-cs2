import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '@who-ruined/contracts';
import { syntheticValidMatch } from '@who-ruined/testkit';
import { computeMatchAnalytics } from '../src/index.js';

function event(index: number, kind: string, tick: number, actorId: string | null, targetId: string | null, attrs: MatchEvent['attrs'] = {}): MatchEvent {
  const match = syntheticValidMatch();
  const actor = match.players.find((player) => player.id === actorId);
  const target = match.players.find((player) => player.id === targetId);
  return {
    id: `1:test:${index}`, kind, roundId: 'round_1', tick, actorId, targetId, assisterId: null, attrs,
    context: { phase: 'LIVE', actorTeamId: actor?.teamId ?? null, targetTeamId: target?.teamId ?? null, actorSide: actor ? match.rounds[0]?.sideByTeamId[actor.teamId] ?? null : null, targetSide: target ? match.rounds[0]?.sideByTeamId[target.teamId] ?? null : null, aliveByTeamId: { team_synthetic_a: 5, team_synthetic_b: 5 }, secondsFromFreezeEnd: (tick - 1100) / 64, bombState: 'NOT_PLANTED', actorEquipmentValue: null, actorMoney: null },
    source: { eventName: kind.toLowerCase(), rowIndex: index }
  };
}

describe('M2 factual analytics', () => {
  it('caps overkill damage and matches one trade death to one later revenge kill', () => {
    const match = syntheticValidMatch();
    const [a1, a2] = match.teams[0]!.playerIds;
    const [b1, b2] = match.teams[1]!.playerIds;
    match.events = [
      event(0, 'PLAYER_HURT', 1200, a1!, b1!, { rawHealthDamage: 90, healthAfter: 10, weapon: 'ak47', friendlyFire: false }),
      event(1, 'PLAYER_HURT', 1210, a1!, b1!, { rawHealthDamage: 40, healthAfter: 0, weapon: 'ak47', friendlyFire: false }),
      event(2, 'PLAYER_DEATH', 1210, a1!, b1!, { friendlyFire: false, suicide: false }),
      event(3, 'PLAYER_DEATH', 1400, b2!, a1!, { friendlyFire: false, suicide: false }),
      event(4, 'PLAYER_DEATH', 1410, a2!, b2!, { friendlyFire: false, suicide: false })
    ];
    const analytics = computeMatchAnalytics(match, '2026-10-16T00:00:00.000Z');
    const attacker = analytics.players.find((player) => player.playerId === a1)!;
    const firstVictim = analytics.players.find((player) => player.playerId === b1)!;
    const revenge = analytics.players.find((player) => player.playerId === b2)!;
    expect(attacker.enemyDamage).toBe(100);
    expect(firstVictim.deathsTraded).toBe(1);
    expect(revenge.tradeKills).toBe(1);
    expect(analytics.players.reduce((sum, player) => sum + (player.deathsTraded ?? 0), 0)).toBe(2);
  });

  it('does not use a future kill outside the five-second trade window', () => {
    const match = syntheticValidMatch();
    const a1 = match.teams[0]!.playerIds[0]!; const b1 = match.teams[1]!.playerIds[0]!; const b2 = match.teams[1]!.playerIds[1]!;
    match.events = [event(0, 'PLAYER_DEATH', 1200, a1, b1, { friendlyFire: false, suicide: false }), event(1, 'PLAYER_DEATH', 1200 + 64 * 5 + 1, b2, a1, { friendlyFire: false, suicide: false })];
    const analytics = computeMatchAnalytics(match, '2026-10-16T00:00:00.000Z');
    expect(analytics.players.find((player) => player.playerId === b1)?.deathsTraded).toBe(0);
  });

  it('includes a revenge kill exactly on the five-second boundary', () => {
    const match = syntheticValidMatch();
    const a1 = match.teams[0]!.playerIds[0]!; const b1 = match.teams[1]!.playerIds[0]!; const b2 = match.teams[1]!.playerIds[1]!;
    match.events = [event(0, 'PLAYER_DEATH', 1200, a1, b1, { friendlyFire: false, suicide: false }), event(1, 'PLAYER_DEATH', 1200 + 64 * 5, b2, a1, { friendlyFire: false, suicide: false })];
    const analytics = computeMatchAnalytics(match, '2026-10-16T00:00:00.000Z');
    expect(analytics.players.find((player) => player.playerId === b1)?.deathsTraded).toBe(1);
    expect(analytics.players.find((player) => player.playerId === b2)?.tradeKills).toBe(1);
  });

  it('keeps unsupported parser fields unavailable instead of inventing zeroes', () => {
    const match = syntheticValidMatch();
    const analytics = computeMatchAnalytics(match, '2026-10-16T00:00:00.000Z');
    expect(analytics.availability).toEqual({ damage: 'UNAVAILABLE', flashes: 'UNAVAILABLE', economy: 'UNAVAILABLE', aliveContext: 'UNAVAILABLE' });
    expect(analytics.players[0]?.adr).toBeNull();
    expect(analytics.players[0]?.grenades.smokeEffectiveness).toBeNull();
    expect(analytics.players[0]?.economy.money).toBeNull();
  });

  it('classifies team damage and suicide as errors but ordinary deaths as neutral facts', () => {
    const match = syntheticValidMatch();
    const [a1, a2] = match.teams[0]!.playerIds;
    match.events = [event(0, 'PLAYER_HURT', 1200, a1!, a2!, { rawHealthDamage: 20, healthAfter: 80, weapon: 'hegrenade', friendlyFire: true }), event(1, 'PLAYER_DEATH', 1300, a2!, a2!, { friendlyFire: false, suicide: true })];
    const analytics = computeMatchAnalytics(match, '2026-10-16T00:00:00.000Z');
    expect(analytics.players.find((player) => player.playerId === a1)?.facts.map((fact) => fact.kind)).toContain('TEAM_DAMAGE');
    expect(analytics.players.find((player) => player.playerId === a2)?.facts).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'DEATH', category: 'NEUTRAL' }), expect.objectContaining({ kind: 'SUICIDE', category: 'ERROR' })]));
  });
});
