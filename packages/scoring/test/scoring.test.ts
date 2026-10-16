import { describe, expect, it } from 'vitest';
import { computeMatchAnalytics } from '@who-ruined/features';
import { syntheticValidMatch } from '@who-ruined/testkit';
import type { MatchArtifact, MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  rankV1Totals,
  scoreMatch,
  scoringConfigHash,
  SUCCESSOR_75_25_CONFIG,
  V1_CONFIG
} from '../src/index.js';

function event(match: MatchData, partial: Partial<MatchEvent> & Pick<MatchEvent, 'id' | 'kind' | 'roundId' | 'tick'>): MatchEvent {
  const actor = partial.actorId ?? null;
  const target = partial.targetId ?? null;
  const team = (playerId: string | null): string | null => match.players.find((player) => player.id === playerId)?.teamId ?? null;
  return {
    id: partial.id,
    kind: partial.kind,
    roundId: partial.roundId,
    tick: partial.tick,
    actorId: actor,
    targetId: target,
    assisterId: partial.assisterId ?? null,
    attrs: partial.attrs ?? {},
    context: partial.context ?? {
      phase: 'LIVE', actorTeamId: team(actor), targetTeamId: team(target), actorSide: null, targetSide: null,
      aliveByTeamId: null, secondsFromFreezeEnd: 1, bombState: 'NOT_PLANTED', actorEquipmentValue: null, actorMoney: null
    },
    source: partial.source ?? { eventName: partial.kind.toLowerCase(), rowIndex: Number(partial.id.replace(/\D/g, '')) || 0 }
  };
}

function balancedArtifact(extra: MatchEvent[] = []): MatchArtifact {
  const match = syntheticValidMatch();
  const a = match.teams[0]!.playerIds;
  const b = match.teams[1]!.playerIds;
  const deaths: MatchEvent[] = [];
  for (let index = 0; index < 10; index += 1) {
    const actor = index < 5 ? a[index]! : b[index - 5]!;
    const target = index < 5 ? b[index]! : a[index - 5]!;
    deaths.push(event(match, { id: `death_${index + 1}`, kind: 'PLAYER_DEATH', roundId: `round_${index + 1}`, tick: (index + 1) * 1000 + 200, actorId: actor, targetId: target, attrs: { friendlyFire: false, suicide: false, weapon: 'ak47' }, source: { eventName: 'player_death', rowIndex: index } }));
  }
  match.events = [...deaths, ...extra].sort((left, right) => left.tick - right.tick || left.source.rowIndex - right.source.rowIndex);
  return { schemaVersion: 'm2-artifact-1', match, analytics: computeMatchAnalytics(match, '2026-10-17T00:00:00.000Z') };
}

describe('SPEC v1 ranking primitive', () => {
  it('matches the exact §11.2 numerical golden example', () => {
    const result = rankV1Totals([20, 16, 12, 8, 4].map((net, index) => ({ playerId: `p${index + 1}`, net, negative: 0, validRounds: 10 })));
    expect(result.rows.map((row) => row.performanceRate)).toEqual([2, 1.6, 1.2, 0.8, 0.4]);
    expect(result.rows.map((row) => row.shortfall)).toEqual([0, 0, 0, 0.4, 0.8]);
    expect(result.rows.map((row) => row.ruinRaw)).toEqual([0, 0, 0, 0.3, 0.6]);
    expect(result.rows.map((row) => row.relativeIndex)).toEqual([0, 0, 0, 50, 100]);
    expect(result.clearRuinerPlayerId).toBe('p5');
  });

  it('abstains when all raw scores are equal', () => {
    const result = rankV1Totals(Array.from({ length: 5 }, (_, index) => ({ playerId: `p${index + 1}`, net: 10, negative: 0, validRounds: 10 })));
    expect(result.rows.every((row) => row.relativeIndex === 0)).toBe(true);
    expect(result.clearRuinerPlayerId).toBeNull();
  });
});

describe('scoreMatch', () => {
  it('is deterministic, keeps v1 abstention, and assigns successor ties by stable player id', () => {
    const artifact = balancedArtifact();
    const first = scoreMatch(artifact, SUCCESSOR_75_25_CONFIG);
    expect(scoreMatch(artifact, SUCCESSOR_75_25_CONFIG)).toEqual(first);
    expect(first.whoRuined?.primaryScoreTied).toBe(true);
    expect(first.whoRuined?.playerId).toBe([...artifact.match.teams[1]!.playerIds].sort()[0]);
    expect(scoreMatch(artifact, V1_CONFIG).whoRuined).toBeNull();
    expect(first.players.every((player) => player.negative === 0)).toBe(true);
  });

  it('bundles lethal friendly damage with a team kill only in successor and keeps research score-neutral', () => {
    const base = syntheticValidMatch();
    const actor = base.teams[1]!.playerIds[0]!;
    const teammate = base.teams[1]!.playerIds[1]!;
    const enemy = base.teams[0]!.playerIds[0]!;
    const extra = [
      event(base, { id: 'hurt_100', kind: 'PLAYER_HURT', roundId: 'round_1', tick: 1200, actorId: actor, targetId: teammate, attrs: { rawHealthDamage: 100, healthAfter: 0, weapon: 'ak47', friendlyFire: true }, source: { eventName: 'player_hurt', rowIndex: 100 } }),
      event(base, { id: 'death_101', kind: 'PLAYER_DEATH', roundId: 'round_1', tick: 1200, actorId: actor, targetId: teammate, attrs: { friendlyFire: true, suicide: false, weapon: 'ak47' }, source: { eventName: 'player_death', rowIndex: 101 } }),
      event(base, { id: 'hurt_102', kind: 'PLAYER_HURT', roundId: 'round_1', tick: 1216, actorId: actor, targetId: enemy, attrs: { rawHealthDamage: 20, healthAfter: 80, weapon: 'ak47', friendlyFire: false }, source: { eventName: 'player_hurt', rowIndex: 102 } })
    ];
    const artifact = balancedArtifact(extra);
    const successor = scoreMatch(artifact, SUCCESSOR_75_25_CONFIG);
    const v1 = scoreMatch(artifact, V1_CONFIG);
    expect(successor.players.find((player) => player.playerId === actor)?.negative).toBe(2.5);
    expect(v1.players.find((player) => player.playerId === actor)?.negative).toBe(3.5);
    const research = successor.episodes.find((episode) => episode.type === 'FRIENDLY_FIRE_COMBAT_CONTEXT');
    expect(research?.research).toMatchObject({ classification: 'STRONG', intervalSeconds: 0.25 });
    expect(research?.significance).toBeNull();
  });

  it('hashes immutable configs deterministically', () => {
    expect(scoringConfigHash(V1_CONFIG)).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(V1_CONFIG.weights)).toBe(true);
  });

  it('emits all nine normative v1 findings with round/tick/event/config traceability', () => {
    const base = syntheticValidMatch();
    const a = base.teams[0]!.playerIds;
    const b = base.teams[1]!.playerIds;
    const extra = [
      event(base, { id: 'trade_200', kind: 'PLAYER_DEATH', roundId: 'round_1', tick: 1250, actorId: b[1]!, targetId: a[0]!, attrs: { friendlyFire: false, suicide: false, weapon: 'ak47' }, source: { eventName: 'player_death', rowIndex: 200 } }),
      event(base, { id: 'hurt_201', kind: 'PLAYER_HURT', roundId: 'round_2', tick: 2200, actorId: b[0]!, targetId: a[1]!, attrs: { rawHealthDamage: 40, healthAfter: 60, weapon: 'ak47' } }),
      event(base, { id: 'hurt_202', kind: 'PLAYER_HURT', roundId: 'round_2', tick: 2210, actorId: b[0]!, targetId: b[1]!, attrs: { rawHealthDamage: 20, healthAfter: 80, weapon: 'ak47' } }),
      event(base, { id: 'tk_203', kind: 'PLAYER_DEATH', roundId: 'round_3', tick: 3200, actorId: b[0]!, targetId: b[1]!, attrs: { friendlyFire: true, suicide: false, weapon: 'ak47' } }),
      event(base, { id: 'blind_204', kind: 'PLAYER_BLIND', roundId: 'round_4', tick: 4200, actorId: b[2]!, targetId: b[3]!, attrs: { blindDuration: 2, weapon: 'flashbang' } }),
      event(base, { id: 'plant_205', kind: 'BOMB_PLANTED', roundId: 'round_8', tick: 8200, actorId: b[3]!, context: { phase: 'LIVE', actorTeamId: base.teams[1]!.id, targetTeamId: null, actorSide: 'T', targetSide: null, aliveByTeamId: null, secondsFromFreezeEnd: 12, bombState: 'PLANTED', actorEquipmentValue: null, actorMoney: null } }),
      event(base, { id: 'defuse_206', kind: 'BOMB_DEFUSED', roundId: 'round_9', tick: 9200, actorId: b[4]! })
    ];
    const report = scoreMatch(balancedArtifact(extra), V1_CONFIG);
    expect(new Set(report.players.flatMap((player) => player.findings.map((item) => item.code)))).toEqual(new Set(['ENEMY_KILL','OPENING_KILL','TRADE_KILL','ENEMY_DAMAGE','BOMB_DEFUSE','BOMB_PLANT_WIN','TEAM_KILL','TEAM_DAMAGE','TEAM_FLASH']));
    expect(report.players.flatMap((player) => player.findings).every((item) => item.roundId && Number.isFinite(item.tick) && item.evidenceEventIds.length > 0 && item.scorerVersion === report.scorerVersion && item.configHash === report.configHash)).toBe(true);
    expect(report.rounds).toHaveLength(13);
  });

  it('penalizes only live suicides and preserves interval boundary classifications without changing scores', () => {
    const base = syntheticValidMatch();
    const actor = base.teams[1]!.playerIds[0]!;
    const teammate = base.teams[1]!.playerIds[1]!;
    const enemy = base.teams[0]!.playerIds[0]!;
    const phaseEvent = (id: string, tick: number, phase: 'PRE_FREEZE'|'LIVE'|'POST_ROUND'): MatchEvent => event(base, { id, kind: 'PLAYER_DEATH', roundId: 'round_5', tick, actorId: actor, targetId: actor, attrs: { suicide: true, friendlyFire: false, weapon: 'world' }, context: { phase, actorTeamId: base.teams[1]!.id, targetTeamId: base.teams[1]!.id, actorSide: 'T', targetSide: 'T', aliveByTeamId: null, secondsFromFreezeEnd: null, bombState: 'NOT_PLANTED', actorEquipmentValue: null, actorMoney: null } });
    const ff = (id: string, tick: number, rowIndex: number): MatchEvent => event(base, { id, kind: 'PLAYER_HURT', roundId: 'round_6', tick, actorId: actor, targetId: teammate, attrs: { rawHealthDamage: 1, healthAfter: 99, weapon: 'ak47' }, source: { eventName: 'player_hurt', rowIndex } });
    const enemyHurt = (id: string, tick: number, rowIndex: number): MatchEvent => event(base, { id, kind: 'PLAYER_HURT', roundId: 'round_6', tick, actorId: actor, targetId: enemy, attrs: { rawHealthDamage: 1, healthAfter: 99, weapon: 'ak47' }, source: { eventName: 'player_hurt', rowIndex } });
    const artifact = balancedArtifact([
      phaseEvent('suicide_pre', 5100, 'PRE_FREEZE'), phaseEvent('suicide_live', 5200, 'LIVE'), phaseEvent('suicide_post', 5900, 'POST_ROUND'),
      ff('ff_same', 6200, 300), enemyHurt('enemy_same', 6200, 301),
      ff('ff_half', 6300, 302), enemyHurt('enemy_half', 6332, 303),
      ff('ff_one', 6400, 304), enemyHurt('enemy_one', 6464, 305),
      ff('ff_over', 6500, 306), enemyHurt('enemy_over', 6565, 307)
    ]);
    const report = scoreMatch(artifact, SUCCESSOR_75_25_CONFIG);
    expect(report.players.find((player) => player.playerId === actor)?.findings.filter((item) => item.code === 'LIVE_SUICIDE')).toHaveLength(1);
    const classes = report.episodes.filter((episode) => episode.type === 'FRIENDLY_FIRE_COMBAT_CONTEXT').map((episode) => episode.research?.classification);
    expect(classes).toEqual(expect.arrayContaining(['STRONG','MODERATE','NOT_TRIGGERED']));
    expect(report.episodes.filter((episode) => episode.kind === 'RESEARCH').every((episode) => episode.significance === null && episode.supportingFindingCodes.length === 0)).toBe(true);
  });

  it('withholds both leaders for partial input and can select an MVP from the losing team', () => {
    const partialArtifact = balancedArtifact();
    partialArtifact.match.quality = 'PARTIAL';
    expect(scoreMatch(partialArtifact, SUCCESSOR_75_25_CONFIG)).toMatchObject({ status: 'PARTIAL', mvp: null, whoRuined: null });

    const base = syntheticValidMatch();
    const losingStar = base.teams[1]!.playerIds[0]!;
    const targets = base.teams[0]!.playerIds;
    const starKills = targets.map((target, index) => event(base, { id: `star_${index}`, kind: 'PLAYER_DEATH', roundId: 'round_1', tick: 1300 + index, actorId: losingStar, targetId: target, attrs: { friendlyFire: false, suicide: false, weapon: 'ak47' }, source: { eventName: 'player_death', rowIndex: 400 + index } }));
    const report = scoreMatch(balancedArtifact(starKills), SUCCESSOR_75_25_CONFIG);
    expect(report.mvp?.playerId).toBe(losingStar);
    expect(report.whoRuined?.playerId).not.toBe(losingStar);
    expect(report.players.find((player) => player.playerId === report.whoRuined?.playerId)?.teamId).toBe(report.losingTeamId);
  });

  it('does not let names or side labels change numeric scores', () => {
    const artifact = balancedArtifact();
    const baseline = scoreMatch(artifact, SUCCESSOR_75_25_CONFIG).players.map(({ playerId, positive, negative, ruinRaw }) => ({ playerId, positive, negative, ruinRaw }));
    artifact.match.players.forEach((player, index) => { player.displayName = `renamed_${index}`; });
    artifact.match.rounds.forEach((round) => { for (const teamId of Object.keys(round.sideByTeamId)) round.sideByTeamId[teamId] = round.sideByTeamId[teamId] === 'T' ? 'CT' : 'T'; });
    expect(scoreMatch(artifact, SUCCESSOR_75_25_CONFIG).players.map(({ playerId, positive, negative, ruinRaw }) => ({ playerId, positive, negative, ruinRaw }))).toEqual(baseline);
  });

  it('preserves component monotonicity without a repeat-friendly-fire multiplier', () => {
    const base = syntheticValidMatch();
    const actor = base.teams[1]!.playerIds[0]!;
    const teammate = base.teams[1]!.playerIds[1]!;
    const enemy = base.teams[0]!.playerIds[0]!;
    const harm = (amounts: number[]) => scoreMatch(balancedArtifact(amounts.map((amount, index) => event(base, { id: `harm_${index}`, kind: 'PLAYER_HURT', roundId: `round_${index + 1}`, tick: (index + 1) * 1000 + 300, actorId: actor, targetId: teammate, attrs: { rawHealthDamage: amount, healthAfter: 100 - amount, weapon: 'ak47' }, source: { eventName: 'player_hurt', rowIndex: 500 + index } }))), SUCCESSOR_75_25_CONFIG).players.find((player) => player.playerId === actor)!;
    expect(harm([20]).negative).toBe(0.2);
    expect(harm([20, 20]).negative).toBe(0.4);
    expect(harm([40]).negative).toBeGreaterThanOrEqual(harm([20]).negative);

    const withoutKill = balancedArtifact();
    const withKill = balancedArtifact([event(base, { id: 'bonus_kill', kind: 'PLAYER_DEATH', roundId: 'round_12', tick: 12_300, actorId: actor, targetId: enemy, attrs: { friendlyFire: false, suicide: false, weapon: 'ak47' }, source: { eventName: 'player_death', rowIndex: 600 } })]);
    const positive = (artifact: MatchArtifact) => scoreMatch(artifact, SUCCESSOR_75_25_CONFIG).players.find((player) => player.playerId === actor)!.positive;
    expect(positive(withKill)).toBeGreaterThanOrEqual(positive(withoutKill));
  });
});
