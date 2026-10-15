import { describe, expect, it } from 'vitest';
import { syntheticValidMatch } from '@who-ruined/testkit';
import { isCreditedAssist, stableTeamId, validateMatch } from '../src/index.js';

describe('stable identities and round validation', () => {
  it('derives team identity from sorted roster, not side', () => {
    expect(stableTeamId(['p3','p1','p2'])).toBe(stableTeamId(['p2','p3','p1']));
  });
  it('accepts a synthetic side switch with score invariants', () => {
    const result = validateMatch(syntheticValidMatch());
    expect(result).toEqual({ quality: 'VALID', issues: [], validRoundCount: 13 });
  });
  it('marks a score mismatch partial', () => {
    const match = syntheticValidMatch();
    const round = match.rounds[3];
    if (!round) throw new Error('fixture missing round');
    round.scoreAfter[round.winnerTeamId ?? ''] = round.scoreBefore[round.winnerTeamId ?? ''] ?? 0;
    const result = validateMatch(match);
    expect(result.quality).toBe('PARTIAL');
    expect(result.issues.some((issue) => issue.code === 'SCORE_MISMATCH')).toBe(true);
  });
  it('rejects overlapping intervals', () => {
    const match = syntheticValidMatch();
    const prior = match.rounds[0]; const next = match.rounds[1];
    if (!prior || !next) throw new Error('fixture missing rounds');
    next.startTick = prior.endTick;
    expect(validateMatch(match).issues.some((issue) => issue.code === 'ROUND_OVERLAP')).toBe(true);
  });
  it('does not credit an assister who belongs to the victim team', () => {
    const teams = new Map([['attacker','a'],['victim','b'],['valid-assister','a'],['friendly-assister','b']]);
    expect(isCreditedAssist('valid-assister', 'victim', teams)).toBe(true);
    expect(isCreditedAssist('friendly-assister', 'victim', teams)).toBe(false);
    expect(isCreditedAssist(null, 'victim', teams)).toBe(false);
  });
});
