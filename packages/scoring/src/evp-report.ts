import {
  evpReportSchema,
  evpReportSchemaVersion,
  type CanonicalMatchResult,
  type EvpReport,
  type EvpReportBinding,
} from '@who-ruined/contracts';
import { prepareEvpMatchInput } from './evp-input.js';
import { calculateEvpAwards } from './evp.js';

export function buildEvpReport(
  canonical: CanonicalMatchResult,
  binding: EvpReportBinding,
): EvpReport {
  const rating = canonical.activeRating;
  const calculation = calculateEvpAwards(prepareEvpMatchInput({
    artifact: canonical.artifact,
    participation: rating.players.map((player) => ({
      playerId: player.playerId,
      eligible: player.availability.status === 'CALCULATED_RESEARCH_ONLY',
      verifiedRounds: player.coverage.verifiedRounds,
      unknownRounds: player.coverage.unknownRounds,
      reasonCodes: player.coverage.causeCodes,
    })),
    mvpPlayerId: rating.awards.mvp.playerId,
    scenario: rating.scenario,
  }));

  return evpReportSchema.parse({
    schemaVersion: evpReportSchemaVersion,
    matchId: calculation.matchId,
    policyId: calculation.policyId,
    experimental: calculation.experimental,
    calibrated: calculation.calibrated,
    binding,
    applicability: {
      applicable: calculation.applicable,
      reasonCodes: calculation.reasonCodes,
    },
    mvpPlayerId: rating.awards.mvp.playerId,
    mvpExcludedFromAwards: true,
    awards: calculation.awards,
    players: calculation.players,
  });
}
