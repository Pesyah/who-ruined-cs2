import { describe, expect, it } from 'vitest';
import {
  evpPolicyId,
  evpReportSchema,
  evpReportSchemaVersion,
  evpSpecializationIds,
  type EvpReport,
} from '../src/evp.js';

function player(playerId: string, teamId: string): EvpReport['players'][number] {
  return {
    playerId,
    teamId,
    status: 'NOT_QUALIFIED',
    reasonCodes: ['NO_QUALIFYING_SPECIALIZATION'],
    candidateStrength: null,
    primarySpecializationId: null,
    secondarySpecializationId: null,
    secondaryBonus: 0,
    teamHarm: {
      available: true,
      teamKillsAvailable: true,
      teamDamageAvailable: true,
      teamDamagePerVerifiedRoundAvailable: true,
      teamKills: 0,
      teamDamage: 0,
      teamDamagePerVerifiedRound: 0,
      disqualified: false,
    },
    specializations: evpSpecializationIds.map((specializationId) => ({
      specializationId,
      evidenceGroup: specializationId === 'FLASH_SUPPORT'
        ? 'FLASH_SUPPORT'
        : specializationId === 'NON_FLASH_ASSIST_SUPPORT'
          ? 'NON_FLASH_ASSIST'
          : specializationId === 'UTILITY_DAMAGE_SPECIALIST'
            ? 'UTILITY_DAMAGE'
            : specializationId === 'OBJECTIVE_SPECIALIST'
              ? 'OBJECTIVE_EVENTS'
              : 'KILL_EVENTS',
      availability: 'AVAILABLE',
      reasonCodes: ['BELOW_ABSOLUTE_GATE'],
      sourceMetrics: {},
      thresholds: [],
      verifiedRounds: 20,
      comparisonScalar: 0,
      absoluteGatePassed: false,
      absoluteStrength: 0,
      evidencePenalty: 0,
      relative: {
        comparisonPoolSize: 2,
        averageRank: 1.5,
        median: 0,
        rankSignal: 0.5,
        medianGap: 0,
        dominance: 0.3,
      },
      achievementStrength: 0.09,
      qualified: false,
      evidence: { eventIds: [], roundIds: [], quality: 'AGGREGATE_ONLY' },
    })),
  };
}

function report(): EvpReport {
  return {
    schemaVersion: evpReportSchemaVersion,
    matchId: 'synthetic-match',
    policyId: evpPolicyId,
    experimental: true,
    calibrated: false,
    binding: {
      matchResultSchemaVersion: 'match-result@1',
      fileSha256: 'a'.repeat(64),
      sourceBindingDigest: 'b'.repeat(64),
      inputDigest: 'c'.repeat(64),
    },
    applicability: { applicable: true, reasonCodes: [] },
    mvpPlayerId: 'player-1',
    mvpExcludedFromAwards: true,
    awards: [],
    players: [player('player-1', 'team-a'), player('player-2', 'team-b')],
  };
}

describe('evp-report@1 contract', () => {
  it('accepts a bounded versioned report with zero awards', () => {
    expect(evpReportSchema.parse(report())).toEqual(report());
  });

  it('rejects duplicate participants and more than two awards', () => {
    const duplicate = report();
    duplicate.players[1]!.playerId = duplicate.players[0]!.playerId;
    expect(evpReportSchema.safeParse(duplicate).success).toBe(false);

    const tooMany = report() as unknown as { awards: unknown[] };
    tooMany.awards = Array.from({ length: 3 }, (_, index) => ({
      position: index + 1,
      playerId: `player-${index + 2}`,
      specializationId: 'TRADE_SPECIALIST',
      achievementStrength: 0.8,
      candidateStrength: 0.8,
    }));
    expect(evpReportSchema.safeParse(tooMany).success).toBe(false);
  });

  it('rejects an MVP award, inconsistent candidates, and non-finite values', () => {
    const mvpAward = report();
    mvpAward.awards = [{
      position: 1,
      playerId: 'player-1',
      specializationId: 'TRADE_SPECIALIST',
      achievementStrength: 0.8,
      candidateStrength: 0.8,
    }];
    expect(evpReportSchema.safeParse(mvpAward).success).toBe(false);

    const inconsistent = report();
    inconsistent.awards = [{
      position: 1,
      playerId: 'player-2',
      specializationId: 'TRADE_SPECIALIST',
      achievementStrength: 0.8,
      candidateStrength: 0.8,
    }];
    expect(evpReportSchema.safeParse(inconsistent).success).toBe(false);

    const nonFinite = report();
    nonFinite.players[1]!.teamHarm.teamDamage = Number.POSITIVE_INFINITY;
    expect(evpReportSchema.safeParse(nonFinite).success).toBe(false);
  });
});
