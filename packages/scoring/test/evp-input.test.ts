import { describe, expect, it } from 'vitest';
import type { MatchArtifact, MatchEvent } from '@who-ruined/contracts';
import { computeMatchAnalytics } from '@who-ruined/features';
import { syntheticValidMatch } from '@who-ruined/testkit';
import { prepareEvpMatchInput, type EvpParticipationSource } from '../src/evp-input.js';

function event(
  index: number,
  kind: string,
  tick: number,
  actorId: string | null,
  targetId: string | null,
  assisterId: string | null = null,
  attrs: MatchEvent['attrs'] = {},
): MatchEvent {
  const match = syntheticValidMatch();
  const actor = match.players.find((player) => player.id === actorId);
  const target = match.players.find((player) => player.id === targetId);
  return {
    id: `evp:event:${index}`,
    kind,
    roundId: 'round_1',
    tick,
    actorId,
    targetId,
    assisterId,
    attrs,
    context: {
      phase: 'LIVE',
      actorTeamId: actor?.teamId ?? null,
      targetTeamId: target?.teamId ?? null,
      actorSide: actor ? match.rounds[0]?.sideByTeamId[actor.teamId] ?? null : null,
      targetSide: target ? match.rounds[0]?.sideByTeamId[target.teamId] ?? null : null,
      aliveByTeamId: { team_synthetic_a: 5, team_synthetic_b: 5 },
      secondsFromFreezeEnd: (tick - 1100) / 64,
      bombState: 'NOT_PLANTED',
      actorEquipmentValue: null,
      actorMoney: null,
    },
    source: { eventName: kind.toLowerCase(), rowIndex: index },
  };
}

function sourceArtifact(): MatchArtifact {
  const match = syntheticValidMatch();
  const [a1, a2, a3] = match.teams[0]!.playerIds;
  const [b1, b2, b3] = match.teams[1]!.playerIds;
  match.events = [
    event(0, 'PLAYER_BLIND', 1150, a2!, b1!, null, { blindDuration: 3 }),
    event(1, 'PLAYER_DEATH', 1200, a1!, b1!, a2!, { assistedFlash: true, friendlyFire: false, suicide: false }),
    event(2, 'PLAYER_DEATH', 1250, a1!, b2!, a2!, { assistedFlash: false, friendlyFire: false, suicide: false }),
    event(3, 'PLAYER_DEATH', 1300, b3!, a3!, null, { friendlyFire: false, suicide: false }),
    event(4, 'PLAYER_DEATH', 1350, a1!, b3!, null, { friendlyFire: false, suicide: false }),
    event(5, 'PLAYER_HURT', 1400, a2!, b1!, null, { rawHealthDamage: 30, healthAfter: 70, weapon: 'hegrenade' }),
    event(6, 'BOMB_PLANTED', 1450, a2!, null),
    event(7, 'PLAYER_BLIND', 1500, a2!, a3!, null, { blindDuration: 2 }),
    event(8, 'PLAYER_HURT', 1550, a2!, a3!, null, { rawHealthDamage: 20, healthAfter: 80, weapon: 'hegrenade' }),
  ];
  return {
    schemaVersion: 'm2-artifact-1',
    match,
    analytics: computeMatchAnalytics(match, '2026-11-07T00:00:00.000Z'),
  };
}

function participation(artifact: MatchArtifact): EvpParticipationSource[] {
  return artifact.match.players.map((player) => ({
    playerId: player.id,
    eligible: true,
    verifiedRounds: 13,
    unknownRounds: 0,
    reasonCodes: [],
  }));
}

describe('EVP input projection', () => {
  it('separates flash assists, preserves factual evidence, and derives no H2 values', () => {
    const artifact = sourceArtifact();
    const [a1, a2] = artifact.match.teams[0]!.playerIds;

    const prepared = prepareEvpMatchInput({
      artifact,
      participation: participation(artifact),
      mvpPlayerId: a1!,
      scenario: 'BOMB',
    });
    const first = prepared.players.find((player) => player.playerId === a1)!;
    const support = prepared.players.find((player) => player.playerId === a2)!;

    expect(support.metrics).toMatchObject({
      flashAssists: 1,
      nonFlashAssists: 1,
      enemyBlindSeconds: 3,
      utilityEnemyDamage: 30,
      bombPlants: 1,
    });
    expect(support.evidence.FLASH_SUPPORT).toMatchObject({
      eventIds: ['evp:event:0', 'evp:event:1'],
      roundIds: ['round_1'],
      quality: 'VERIFIED_EVENTS',
    });
    expect(support.evidence.NON_FLASH_ASSIST_SUPPORT?.eventIds).toEqual(['evp:event:2']);
    expect(support.evidence.UTILITY_DAMAGE_SPECIALIST?.eventIds).toEqual(['evp:event:5']);
    expect(support.evidence.OBJECTIVE_SPECIALIST?.eventIds).toEqual(['evp:event:6']);
    expect(first.metrics).toMatchObject({ tradeKills: 1, openingKills: 1 });
    expect(first.metrics.multiKills.three).toBe(1);
    expect(first.evidence.TRADE_SPECIALIST?.eventIds).toEqual(['evp:event:4']);
    expect(first.evidence.ENTRY_SPECIALIST?.eventIds).toEqual(['evp:event:1']);
    expect(first.evidence.MULTIKILL_SPECIALIST?.eventIds).toEqual(['evp:event:1', 'evp:event:2', 'evp:event:4']);
    expect(first).not.toHaveProperty('rating');
    expect(first).not.toHaveProperty('h2Rank');
  });

  it('keeps a missing participation profile unavailable instead of inventing exposure', () => {
    const artifact = sourceArtifact();
    const missingPlayerId = artifact.match.players.at(-1)!.id;
    const profiles = participation(artifact).filter((profile) => profile.playerId !== missingPlayerId);

    const prepared = prepareEvpMatchInput({
      artifact,
      participation: profiles,
      mvpPlayerId: artifact.match.players[0]!.id,
      scenario: 'BOMB',
    });

    expect(prepared.players.find((player) => player.playerId === missingPlayerId)?.participation).toEqual({
      eligible: false,
      verifiedRounds: 0,
      unknownRounds: artifact.match.rounds.length,
      reasonCodes: ['PARTICIPATION_EVIDENCE_MISSING'],
    });
  });

  it('preserves nullable analytics instead of converting missing evidence to zero', () => {
    const artifact = sourceArtifact();
    const playerId = artifact.match.players[1]!.id;
    const analytics = artifact.analytics.players.find((player) => player.playerId === playerId)!;
    analytics.assists = null;
    analytics.grenades.heEnemyDamage = null;

    const prepared = prepareEvpMatchInput({
      artifact,
      participation: participation(artifact),
      mvpPlayerId: artifact.match.players[0]!.id,
      scenario: 'BOMB',
    });
    const player = prepared.players.find((row) => row.playerId === playerId)!;

    expect(player.metrics.nonFlashAssists).toBeNull();
    expect(player.metrics.utilityEnemyDamage).toBeNull();
  });
});
