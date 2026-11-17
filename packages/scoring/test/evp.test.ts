import { describe, expect, it } from 'vitest';
import {
  EVP_POLICY_ID,
  calculateEvpAwards,
  type EvpCalculationResult,
  type EvpMatchInput,
  type EvpPlayerInput,
  type EvpPlayerMetrics,
  type EvpSpecializationId,
} from '../src/evp.js';

function emptyMetrics(): EvpPlayerMetrics {
  return {
    flashAssists: 0,
    nonFlashAssists: 0,
    enemyBlindSeconds: 0,
    teamBlindSeconds: 0,
    tradeKills: 0,
    clutchPoints: 0,
    clutchWins: 0,
    multiKills: { two: 0, three: 0, four: 0, five: 0 },
    openingKills: 0,
    openingDeaths: 0,
    utilityEnemyDamage: 0,
    utilityTeamDamage: 0,
    bombPlants: 0,
    bombDefuses: 0,
    teamDamage: 0,
    teamKills: 0,
  };
}

function player(index: number): EvpPlayerInput {
  return {
    playerId: `player-${String(index + 1).padStart(2, '0')}`,
    teamId: index < 5 ? 'team-a' : 'team-b',
    participation: { eligible: true, verifiedRounds: 20, unknownRounds: 0, reasonCodes: [] },
    metrics: emptyMetrics(),
    evidence: {},
  };
}

function match(): EvpMatchInput {
  return {
    matchId: 'synthetic-evp-match',
    scenario: 'BOMB',
    mvpPlayerId: 'player-01',
    availability: { damage: 'AVAILABLE', flashes: 'AVAILABLE', aliveContext: 'AVAILABLE' },
    players: Array.from({ length: 10 }, (_, index) => player(index)),
  };
}

function playerAt(input: EvpMatchInput, index: number): EvpPlayerInput {
  return input.players[index]!;
}

function awardIds(input: EvpMatchInput): string[] {
  return calculateEvpAwards(input).awards.map((award) => award.playerId);
}

function specialization(result: EvpCalculationResult, playerId: string, specializationId: EvpSpecializationId) {
  return result.players.find((row) => row.playerId === playerId)!.specializations
    .find((row) => row.specializationId === specializationId)!;
}

function makeClutchExceptional(input: EvpMatchInput, index: number, points = 10): void {
  playerAt(input, index).metrics.clutchPoints = points;
  playerAt(input, index).metrics.clutchWins = 1;
}

function makeUtilityExceptional(input: EvpMatchInput, index: number, damage = 400): void {
  playerAt(input, index).metrics.utilityEnemyDamage = damage;
}

function makeTradeExceptional(input: EvpMatchInput, index: number, trades = 7): void {
  playerAt(input, index).metrics.tradeKills = trades;
}

function expectAllNumbersFinite(value: unknown): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(expectAllNumbersFinite);
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(expectAllNumbersFinite);
  }
}

describe('EVP-1 permanent synthetic scenarios', () => {
  it('01 gives no award when nobody is exceptional', () => {
    expect(awardIds(match())).toEqual([]);
  });

  it('02 gives one award to one exceptional player', () => {
    const input = match();
    makeClutchExceptional(input, 1);

    expect(awardIds(input)).toEqual(['player-02']);
  });

  it('03 gives two awards to two exceptional players', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 2);

    expect(awardIds(input)).toHaveLength(2);
    expect(awardIds(input)).toEqual(expect.arrayContaining(['player-02', 'player-03']));
  });

  it('04 caps three qualified candidates at two awards', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 2);
    makeTradeExceptional(input, 3);

    expect(awardIds(input)).toHaveLength(2);
  });

  it('05 excludes the MVP after including it in comparisons', () => {
    const input = match();
    makeClutchExceptional(input, 0, 15);
    makeTradeExceptional(input, 1);

    const result = calculateEvpAwards(input);

    expect(result.awards.map((award) => award.playerId)).toEqual(['player-02']);
    expect(result.players.find((row) => row.playerId === 'player-01')).toMatchObject({
      status: 'MVP_EXCLUDED',
      reasonCodes: ['MVP_EXCLUDED'],
    });
    expect(specialization(result, 'player-02', 'TRADE_SPECIALIST').relative?.comparisonPoolSize).toBe(10);
  });

  it('06 allows a low-H2 player with exceptional flash support to win', () => {
    const input = match();
    Object.assign(playerAt(input, 8).metrics, { flashAssists: 4, enemyBlindSeconds: 80 });
    const inputWithIgnoredH2 = {
      ...input,
      players: input.players.map((row, index) => ({ ...row, h2Rank: index + 1, h2Value: 1 - index / 100 })),
    };

    expect(awardIds(inputWithIgnoredH2)).toEqual(['player-09']);
  });

  it('07 allows an exceptional non-flash assist specialist to win', () => {
    const input = match();
    playerAt(input, 7).metrics.nonFlashAssists = 12;

    expect(awardIds(input)).toEqual(['player-08']);
  });

  it('08 does not reward H2 runner-up position without an exceptional specialization', () => {
    const input = match();
    const inputWithIgnoredH2 = {
      ...input,
      players: input.players.map((row, index) => ({ ...row, h2Rank: index + 1, h2Value: 1 - index / 100 })),
    };

    expect(awardIds(inputWithIgnoredH2)).not.toContain('player-02');
    expect(awardIds(inputWithIgnoredH2)).toEqual([]);
  });

  it('09 does not turn missing flash evidence into zero or an award', () => {
    const input = match();
    input.availability.flashes = 'UNAVAILABLE';
    Object.assign(playerAt(input, 2).metrics, { flashAssists: 5, enemyBlindSeconds: 100 });

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(specialization(result, 'player-03', 'FLASH_SUPPORT')).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCodes: ['FLASH_DATA_UNAVAILABLE'],
      achievementStrength: null,
    });
  });

  it('10 rejects one exceptional episode under insufficient exposure', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    playerAt(input, 1).participation.verifiedRounds = 3;

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(result.players.find((row) => row.playerId === 'player-02')).toMatchObject({
      status: 'NOT_APPLICABLE',
      reasonCodes: ['INSUFFICIENT_EXPOSURE'],
    });
  });

  it('11 repeats with a deep-identical result', () => {
    const input = match();
    makeClutchExceptional(input, 1);

    expect(calculateEvpAwards(input)).toEqual(calculateEvpAwards(input));
  });

  it('12 preserves the award set when player input order is reversed', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 2);
    const reversed = { ...input, players: [...input.players].reverse() };

    expect(awardIds(reversed).sort()).toEqual(awardIds(input).sort());
  });
});

describe('EVP specialization hard gates', () => {
  const cases: Array<{
    id: EvpSpecializationId;
    below: (metrics: EvpPlayerMetrics) => void;
    at: (metrics: EvpPlayerMetrics) => void;
    above: (metrics: EvpPlayerMetrics) => void;
  }> = [
    {
      id: 'FLASH_SUPPORT',
      below: (metrics) => Object.assign(metrics, { flashAssists: 2, enemyBlindSeconds: 39.9 }),
      at: (metrics) => Object.assign(metrics, { flashAssists: 2, enemyBlindSeconds: 40 }),
      above: (metrics) => Object.assign(metrics, { flashAssists: 4, enemyBlindSeconds: 80 }),
    },
    {
      id: 'NON_FLASH_ASSIST_SUPPORT',
      below: (metrics) => { metrics.nonFlashAssists = 7; },
      at: (metrics) => { metrics.nonFlashAssists = 8; },
      above: (metrics) => { metrics.nonFlashAssists = 12; },
    },
    {
      id: 'TRADE_SPECIALIST',
      below: (metrics) => { metrics.tradeKills = 3; },
      at: (metrics) => { metrics.tradeKills = 4; },
      above: (metrics) => { metrics.tradeKills = 7; },
    },
    {
      id: 'CLUTCH_SPECIALIST',
      below: (metrics) => Object.assign(metrics, { clutchPoints: 5, clutchWins: 1 }),
      at: (metrics) => Object.assign(metrics, { clutchPoints: 6, clutchWins: 1 }),
      above: (metrics) => Object.assign(metrics, { clutchPoints: 10, clutchWins: 1 }),
    },
    {
      id: 'MULTIKILL_SPECIALIST',
      below: (metrics) => { metrics.multiKills.three = 2; },
      at: (metrics) => { metrics.multiKills.three = 3; },
      above: (metrics) => { metrics.multiKills.five = 1; },
    },
    {
      id: 'ENTRY_SPECIALIST',
      below: (metrics) => Object.assign(metrics, { openingKills: 3, openingDeaths: 1 }),
      at: (metrics) => Object.assign(metrics, { openingKills: 4, openingDeaths: 2 }),
      above: (metrics) => Object.assign(metrics, { openingKills: 6, openingDeaths: 1 }),
    },
    {
      id: 'UTILITY_DAMAGE_SPECIALIST',
      below: (metrics) => { metrics.utilityEnemyDamage = 249; },
      at: (metrics) => { metrics.utilityEnemyDamage = 250; },
      above: (metrics) => { metrics.utilityEnemyDamage = 400; },
    },
    {
      id: 'OBJECTIVE_SPECIALIST',
      below: (metrics) => Object.assign(metrics, { bombPlants: 2, bombDefuses: 1 }),
      at: (metrics) => Object.assign(metrics, { bombPlants: 3, bombDefuses: 1 }),
      above: (metrics) => Object.assign(metrics, { bombPlants: 6, bombDefuses: 1 }),
    },
  ];

  it.each(cases)('$id distinguishes just below, at, and above its hard gate', ({ id, below, at, above }) => {
    const belowInput = match(); below(playerAt(belowInput, 1).metrics);
    const atInput = match(); at(playerAt(atInput, 1).metrics);
    const aboveInput = match(); above(playerAt(aboveInput, 1).metrics);

    expect(specialization(calculateEvpAwards(belowInput), 'player-02', id).absoluteGatePassed).toBe(false);
    expect(specialization(calculateEvpAwards(atInput), 'player-02', id).absoluteGatePassed).toBe(true);
    expect(specialization(calculateEvpAwards(aboveInput), 'player-02', id).absoluteGatePassed).toBe(true);
  });
});

describe('EVP determinism, applicability, and evidence policy', () => {
  it('handles N=0 without non-finite values', () => {
    const input = { ...match(), mvpPlayerId: null, players: [] };
    const result = calculateEvpAwards(input);

    expect(result).toMatchObject({ applicable: false, reasonCodes: ['NO_PLAYERS'], awards: [], players: [] });
    expectAllNumbersFinite(result);
  });

  it('does not create a maximum relative signal from an N=1 comparison pool', () => {
    const fullMatch = match();
    const input = { ...fullMatch, players: [playerAt(fullMatch, 0)] };
    makeClutchExceptional(input, 0, 15);

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(result.players[0]).toMatchObject({ status: 'NOT_QUALIFIED' });
    expect(specialization(result, 'player-01', 'CLUTCH_SPECIALIST')).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCodes: ['INSUFFICIENT_COMPARISON_POOL'],
      relative: null,
      achievementStrength: null,
      qualified: false,
    });
    expectAllNumbersFinite(result);
  });

  it('compares an N=2 pool without non-finite values and preserves equality', () => {
    const fullMatch = match();
    const input = { ...fullMatch, players: fullMatch.players.slice(0, 2) };
    input.players.forEach((row) => { row.metrics.tradeKills = 7; });

    const result = calculateEvpAwards(input);
    const trade = specialization(result, 'player-02', 'TRADE_SPECIALIST');

    expect(result.awards.map((award) => award.playerId)).toEqual(['player-02']);
    expect(trade.relative).toMatchObject({ comparisonPoolSize: 2, averageRank: 1.5, rankSignal: 0.5, medianGap: 0 });
    expectAllNumbersFinite(result);
  });

  it('does not compare one available value against players with missing values', () => {
    const input = match();
    input.players.forEach((row) => { row.metrics.tradeKills = null; });
    playerAt(input, 1).metrics.tradeKills = 7;

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(specialization(result, 'player-02', 'TRADE_SPECIALIST')).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCodes: ['INSUFFICIENT_COMPARISON_POOL'],
      relative: null,
    });
    expectAllNumbersFinite(result);
  });

  it('uses a stable player ID tie-break when all non-MVP values are equal', () => {
    const input = match();
    input.players.forEach((row) => { row.metrics.tradeKills = 7; });

    expect(awardIds(input)).toEqual(['player-02', 'player-03']);
  });

  it('keeps all-zero comparison fields finite and unqualified', () => {
    const result = calculateEvpAwards(match());

    expect(result.awards).toEqual([]);
    expectAllNumbersFinite(result);
  });

  it('does not give an independent bonus to overlapping kill-derived specializations', () => {
    const input = match();
    const metrics = playerAt(input, 1).metrics;
    Object.assign(metrics, {
      tradeKills: 7,
      clutchPoints: 10,
      clutchWins: 1,
      openingKills: 6,
      openingDeaths: 1,
    });
    metrics.multiKills.five = 1;

    const result = calculateEvpAwards(input);
    const candidate = result.players.find((row) => row.playerId === 'player-02')!;

    expect(candidate.specializations.filter((row) => row.qualified).length).toBeGreaterThan(1);
    expect(candidate.secondarySpecializationId).toBeNull();
    expect(candidate.secondaryBonus).toBe(0);
    expect(result.awards).toHaveLength(1);
  });

  it('adds the capped bonus for disjoint verified events even in the same round', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 1);
    playerAt(input, 1).evidence.CLUTCH_SPECIALIST = {
      eventIds: ['clutch-event'],
      roundIds: ['shared-round'],
      quality: 'VERIFIED_EVENTS',
    };
    playerAt(input, 1).evidence.UTILITY_DAMAGE_SPECIALIST = {
      eventIds: ['utility-event'],
      roundIds: ['shared-round'],
      quality: 'VERIFIED_EVENTS',
    };

    const result = calculateEvpAwards(input);
    const candidate = result.players.find((row) => row.playerId === 'player-02')!;
    const primary = candidate.specializations.find((row) => row.specializationId === candidate.primarySpecializationId)!;
    const secondary = candidate.specializations.find((row) => row.specializationId === candidate.secondarySpecializationId)!;

    expect(candidate.secondaryBonus).toBeCloseTo(0.08 * secondary.achievementStrength!, 12);
    expect(candidate.candidateStrength).toBeCloseTo(primary.achievementStrength! + candidate.secondaryBonus, 12);
    expect(result.awards).toHaveLength(1);
  });

  it('does not add a secondary bonus when verified event evidence overlaps', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 1);
    playerAt(input, 1).evidence.CLUTCH_SPECIALIST = {
      eventIds: ['shared-event'],
      roundIds: ['round-clutch'],
      quality: 'VERIFIED_EVENTS',
    };
    playerAt(input, 1).evidence.UTILITY_DAMAGE_SPECIALIST = {
      eventIds: ['shared-event'],
      roundIds: ['round-utility'],
      quality: 'VERIFIED_EVENTS',
    };

    const candidate = calculateEvpAwards(input).players.find((row) => row.playerId === 'player-02')!;

    expect(candidate.secondarySpecializationId).toBeNull();
    expect(candidate.secondaryBonus).toBe(0);
  });

  it('does not infer independent evidence from aggregate-only achievements', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    makeUtilityExceptional(input, 1);

    const candidate = calculateEvpAwards(input).players.find((row) => row.playerId === 'player-02')!;

    expect(candidate.specializations.filter((row) => row.qualified)).toHaveLength(2);
    expect(candidate.secondarySpecializationId).toBeNull();
    expect(candidate.secondaryBonus).toBe(0);
  });

  it('disqualifies severe confirmed team harm without using H2 context', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    Object.assign(playerAt(input, 1).metrics, { teamKills: 3, teamDamage: 10 });

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(result.players.find((row) => row.playerId === 'player-02')).toMatchObject({
      status: 'TEAM_HARM_DISQUALIFIED',
      reasonCodes: ['SEVERE_CONFIRMED_TEAM_HARM'],
      teamHarm: { disqualified: true },
    });
  });

  it('disqualifies three confirmed team kills when team damage is unavailable', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    Object.assign(playerAt(input, 1).metrics, { teamKills: 3, teamDamage: null });

    const result = calculateEvpAwards(input);
    const candidate = result.players.find((row) => row.playerId === 'player-02')!;

    expect(result.awards).toEqual([]);
    expect(candidate).toMatchObject({
      status: 'TEAM_HARM_DISQUALIFIED',
      reasonCodes: ['SEVERE_CONFIRMED_TEAM_HARM'],
      teamHarm: {
        available: false,
        teamKillsAvailable: true,
        teamDamageAvailable: false,
        teamDamagePerVerifiedRoundAvailable: false,
        teamKills: 3,
        teamDamage: null,
        teamDamagePerVerifiedRound: null,
        disqualified: true,
      },
    });
  });

  it('requires both team-kill and damage evidence for the combined team-harm gate', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    Object.assign(playerAt(input, 1).metrics, { teamKills: 2, teamDamage: null });

    const result = calculateEvpAwards(input);
    const candidate = result.players.find((row) => row.playerId === 'player-02')!;

    expect(result.awards.map((award) => award.playerId)).toEqual(['player-02']);
    expect(candidate.teamHarm).toMatchObject({
      available: false,
      teamKillsAvailable: true,
      teamDamageAvailable: false,
      teamDamagePerVerifiedRoundAvailable: false,
      disqualified: false,
    });
  });

  it('preserves available team damage when the team-kill metric is unavailable', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    Object.assign(playerAt(input, 1).metrics, { teamKills: null, teamDamage: 200 });

    const result = calculateEvpAwards(input);
    const candidate = result.players.find((row) => row.playerId === 'player-02')!;

    expect(result.awards.map((award) => award.playerId)).toEqual(['player-02']);
    expect(candidate.teamHarm).toMatchObject({
      available: false,
      teamKillsAvailable: false,
      teamDamageAvailable: true,
      teamDamagePerVerifiedRoundAvailable: true,
      teamDamage: 200,
      teamDamagePerVerifiedRound: 10,
      disqualified: false,
    });
  });

  it('keeps modest unrelated team harm visible without erasing the award', () => {
    const input = match();
    makeClutchExceptional(input, 1, 15);
    Object.assign(playerAt(input, 1).metrics, { teamKills: 1, teamDamage: 80 });

    const result = calculateEvpAwards(input);

    expect(awardIds(input)).toEqual(['player-02']);
    expect(result.players.find((row) => row.playerId === 'player-02')?.teamHarm).toMatchObject({ available: true, disqualified: false });
  });

  it.each(['HOSTAGE', 'UNKNOWN'] as const)('makes objective specialization unavailable for %s', (scenario) => {
    const input = match();
    input.scenario = scenario;
    Object.assign(playerAt(input, 1).metrics, { bombPlants: 6, bombDefuses: 1 });

    const result = calculateEvpAwards(input);

    expect(result.awards).toEqual([]);
    expect(specialization(result, 'player-02', 'OBJECTIVE_SPECIALIST')).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCodes: ['BOMB_SCENARIO_REQUIRED'],
    });
  });

  it('keeps the objective specialization available in bomb scenarios', () => {
    const input = match();
    Object.assign(playerAt(input, 1).metrics, { bombPlants: 6, bombDefuses: 1 });

    expect(awardIds(input)).toEqual(['player-02']);
  });

  it('ignores display names and H2 rank/value fields', () => {
    const input = match();
    makeClutchExceptional(input, 1);
    const decorated = {
      ...input,
      players: input.players.map((row, index) => ({
        ...row,
        displayName: `renamed-${10 - index}`,
        h2Rank: 10 - index,
        h2Value: index * 1000,
      })),
    };

    expect(calculateEvpAwards(decorated)).toEqual(calculateEvpAwards(input));
  });

  it('returns the versioned policy and machine-readable evidence', () => {
    const input = match();
    makeTradeExceptional(input, 1, 9);
    playerAt(input, 1).evidence.TRADE_SPECIALIST = {
      eventIds: ['event-9', 'event-2', 'event-2'],
      roundIds: ['round-9', 'round-2'],
      quality: 'VERIFIED_EVENTS',
    };

    const result = calculateEvpAwards(input);
    const trade = specialization(result, 'player-02', 'TRADE_SPECIALIST');

    expect(result.policyId).toBe(EVP_POLICY_ID);
    expect(trade).toMatchObject({
      sourceMetrics: { tradeKills: 9, tradeKillsPerRound: 0.45 },
      verifiedRounds: 20,
      absoluteGatePassed: true,
      qualified: true,
      evidence: {
        eventIds: ['event-2', 'event-9'],
        roundIds: ['round-2', 'round-9'],
        quality: 'VERIFIED_EVENTS',
      },
    });
    expect(trade.thresholds.length).toBeGreaterThan(0);
    expect(trade.relative).not.toBeNull();
    expect(trade.achievementStrength).not.toBeNull();
  });

  it('sanitizes a non-finite internal metric to unavailable rather than emitting NaN/Infinity', () => {
    const input = match();
    playerAt(input, 1).metrics.tradeKills = Number.POSITIVE_INFINITY;

    const result = calculateEvpAwards(input);

    expect(specialization(result, 'player-02', 'TRADE_SPECIALIST')).toMatchObject({
      availability: 'UNAVAILABLE',
      comparisonScalar: null,
      achievementStrength: null,
    });
    expectAllNumbersFinite(result);
  });

  it('rejects duplicate player IDs instead of making input order decide ownership', () => {
    const input = match();
    playerAt(input, 1).playerId = playerAt(input, 0).playerId;

    expect(() => calculateEvpAwards(input)).toThrow('duplicate player IDs');
  });
});
