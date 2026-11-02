import { describe, expect, it } from 'vitest';
import {
  H2_PARTICIPATION_RATING_POLICY,
  HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY,
  PARTICIPATION_SIDECAR_POLICY_IDENTITIES,
  projectP72ParticipationRatings,
  selectP72Awards,
  type C2S2PreparedProfile,
  type P72ParticipationPreparedProfile
} from '../src/index.js';

function prepared(profileKey: string, harm = -0.04): C2S2PreparedProfile {
  return {
    profileKey,
    scenario: 'BOMB',
    p4BPlus: {
      status: 'CALCULATED_RESEARCH_ONLY',
      reason: null,
      familyContributions: { COMBAT: 0.04, SUPPORT: 0.01, DEATH_RELATED: -0.03, DIRECT_HARM: harm, CONTEXT: 0, OBJECTIVES: 0 },
      episodeContributions: [{ anchorId: 'round_1:harm', chosenAxis: 'allyHp', family: 'DIRECT_HARM', base: harm, tags: [] }]
    },
    p4CPlus: {
      status: 'CALCULATED_RESEARCH_ONLY',
      reason: null,
      familyContributions: { COMBAT: 0.04, SUPPORT: 0.01, DEATH_RELATED: -0.03, DIRECT_HARM: harm, CONTEXT: 0, OBJECTIVES: 0 },
      objectiveSignals: { 'objective:plants': 0, 'objective:defuses': 0 },
      episodeContributions: [{ anchorId: 'round_1:harm', chosenAxis: 'allyHp', family: 'DIRECT_HARM', base: harm, tags: [] }]
    }
  };
}

function profile(index: number, status: P72ParticipationPreparedProfile['status'] = 'ELIGIBLE'): P72ParticipationPreparedProfile {
  const profileKey = `P${String(index + 1).padStart(2, '0')}`;
  return {
    profileKey,
    playerId: `player-${index + 1}`,
    teamId: index < 5 ? 'team-a' : 'team-b',
    status,
    reason: status === 'ELIGIBLE' ? null : 'THREE_OR_MORE_VERIFIED_FULL_ROUND_ABSENCES',
    prepared: prepared(profileKey, -0.01 * index)
  };
}

describe('P7.2 frozen participation rating projection', () => {
  it('keeps H2 immutable and retains H1 identity only in sidecar compatibility metadata', () => {
    expect(H2_PARTICIPATION_RATING_POLICY).toEqual({ selector: 'H2', id: 'P72B_D_P10_N5_K025_A015_H2', digest: '7ac1d2d3afcffa9d4682e2979f06f4dad8d42f270ec0e858bac93019724baf48', harmMultiplier: 2 });
    expect(HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY).toEqual({ id: 'P72B_D_P10_N5_K025_A015_H1', digest: '3d299d81f8e8cd336ec6288431fa83240f6a0209bfeed3b80f89930ab88f5c75', harmMultiplier: 1 });
    expect(PARTICIPATION_SIDECAR_POLICY_IDENTITIES).toEqual([
      { id: H2_PARTICIPATION_RATING_POLICY.id, digest: H2_PARTICIPATION_RATING_POLICY.digest, harmMultiplier: 2 },
      HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY
    ]);
    expect(Object.isFrozen(H2_PARTICIPATION_RATING_POLICY)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY)).toBe(true);
  });

  it('reconciles aggregate saturation and six-family attribution exactly', () => {
    const [row] = projectP72ParticipationRatings([profile(3)]);
    expect(row?.status).toBe('CALCULATED_RESEARCH_ONLY');
    if (!row || row.status !== 'CALCULATED_RESEARCH_ONLY') throw new Error('unexpected status');
    const reconstructed = 1 + Object.values(row.finalAttribution).reduce((sum, value) => sum + value, 0);
    expect(Math.abs(row.rating - reconstructed)).toBeLessThanOrEqual(1e-12);
    expect(row.aggregates.negativeTerm).toBeLessThanOrEqual(0);
    expect(row.finalAttribution.DIRECT_HARM).toBe(2 * row.rawFamilyInputs.DIRECT_HARM);
  });

  it('matches the pre-removal deterministic H2 baseline exactly', () => {
    const row = projectP72ParticipationRatings([profile(3)])[0]!;
    if (row.status !== 'CALCULATED_RESEARCH_ONLY') throw new Error('unexpected status');
    expect(row.rating).toBe(1.2765243531781516);
    expect(row.aggregates).toEqual({
      positiveMass: 0.05,
      negativeMass: 0.032695129364369656,
      positiveTerm: 0.5,
      negativeTerm: -0.16347564682184829,
      harmTerm: -0.06
    });
    expect(row.finalAttribution).toEqual({
      COMBAT: 0.4,
      SUPPORT: 0.1,
      DEATH_RELATED: -0.15,
      CONTEXT: -0.013475646821848278,
      OBJECTIVES: 0,
      DIRECT_HARM: -0.06
    });
  });

  it('preserves per-player absence as null instead of a fabricated baseline rating', () => {
    const [row] = projectP72ParticipationRatings([profile(0, 'PARTICIPATION_ABSENT_GT_2_ROUNDS')]);
    expect(row).toMatchObject({ status: 'PARTICIPATION_ABSENT_GT_2_ROUNDS', rating: null, finalAttribution: null });
  });

  it('keeps legacy UNKNOWN results calculable by omitting only the objective family', () => {
    const legacy = profile(3);
    legacy.status = 'UNKNOWN_APPLICABILITY';
    legacy.reason = 'SCENARIO_UNKNOWN';
    legacy.prepared.scenario = 'UNKNOWN';
    legacy.prepared.p4CPlus = { status: 'UNKNOWN_APPLICABILITY', reason: 'SCENARIO_UNKNOWN' };
    const [row] = projectP72ParticipationRatings([legacy]);
    expect(row?.status).toBe('CALCULATED_RESEARCH_ONLY');
    if (!row || row.status !== 'CALCULATED_RESEARCH_ONLY') throw new Error('unexpected status');
    expect(row.rawFamilyInputs.OBJECTIVES).toBe(0);
    expect(row.finalAttribution.OBJECTIVES).toBe(0);
    expect(row.rawFamilyInputs.COMBAT).toBe(0.04);
    expect(row.rawFamilyInputs.DIRECT_HARM).toBe(-0.03);
    expect(Math.abs(row.rating - (1 + Object.values(row.finalAttribution).reduce((sum, value) => sum + value, 0)))).toBeLessThanOrEqual(1e-12);
  });

  it('selects awards from nine calculated players and limits Who Ruined to the losing pool', () => {
    const input = Array.from({ length: 10 }, (_, index) => profile(index, index === 7 ? 'PARTICIPATION_ABSENT_GT_2_ROUNDS' : 'ELIGIBLE'));
    const rows = projectP72ParticipationRatings(input);
    const awards = selectP72Awards(rows, [{ teamId: 'team-a', score: 13 }, { teamId: 'team-b', score: 8 }]);
    expect(awards.eligiblePoolSize).toBe(9);
    expect(awards.incompletePool).toBe(true);
    expect(awards.whoRuined.awardPoolSize).toBe(4);
    expect(awards.whoRuined.scope).toBe('LOSING_TEAM_ELIGIBLE');
  });

  it('uses all calculated players as the Who Ruined pool only for a genuine score draw', () => {
    const rows = projectP72ParticipationRatings(Array.from({ length: 10 }, (_, index) => profile(index)));
    const awards = selectP72Awards(rows, [{ teamId: 'team-a', score: 12 }, { teamId: 'team-b', score: 12 }]);
    expect(awards.outcome).toBe('DRAW');
    expect(awards.losingTeamId).toBeNull();
    expect(awards.whoRuined.scope).toBe('DRAW_ALL_ELIGIBLE');
    expect(awards.whoRuined.awardPoolSize).toBe(10);
  });
});
