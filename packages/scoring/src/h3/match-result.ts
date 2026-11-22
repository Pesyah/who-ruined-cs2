import {
  h3MatchResultSchema, h3RatingReportSchema,
  type H3EquipmentObservation, type H3ExplanationFamily, type H3MatchResult,
  type H3RatingReport, type H3RoundStartEvidence, type MatchData,
} from '@who-ruined/contracts';
import {
  assertParticipationSidecar, buildRatingReportFields, resolveMapScenario, sidecarFromStoredSeed,
  stableSha256, type CanonicalBuildOptions,
} from '../active-match-result.js';
import { buildImportantMoments } from '../important-moments.js';
import { explainBaseFamilies } from '../participation-explanation.js';
import { PARTICIPATION_FAMILY_POLICY } from '../participation-family-kernel.js';
import { toParticipationRatingPreparedProfiles } from '../participation-profile-input.js';
import { prepareJointEvidence } from './comparison-policy.js';
import { H3_PARTICIPATION_RATING_POLICY, projectH3, type H3Player, type H3Result } from './policy.js';
import type { RoundImpactAward } from './round-impact.js';

type H3Evidence = { roundStarts: H3RoundStartEvidence[]; equipment: H3EquipmentObservation[] };
type Source = H3ExplanationFamily['sources'][number];
const impactReasons = {
  CLUTCH_CONVERSION: 'ROUND_IMPACT_CLUTCH',
  DEFICIT_RECOVERY_SEQUENCE: 'ROUND_IMPACT_RECOVERY',
  POSTPLANT_CONVERSION: 'ROUND_IMPACT_POSTPLANT',
} as const satisfies Record<RoundImpactAward['kind'], Source['reason']>;

function explainFamilies(
  match: MatchData,
  profile: Parameters<typeof explainBaseFamilies>[2],
  player: H3Player,
  ledger: H3Result['actionLedger'],
): H3ExplanationFamily[] {
  if (!player.rawFamilyInputs || !player.finalAttribution || !player.baseKernel || !player.roundImpact || !player.utility) {
    throw new Error('H3_EXPLANATION_EVIDENCE_MISSING');
  }
  const counted = new Set(player.countedRoundIds);
  const events = match.events.filter((event) => counted.has(event.roundId));
  const byId = new Map(events.map((event) => [event.id, event]));
  const source = (reason: Source['reason'], value: number, roundId: string, ids: readonly string[], exact: boolean): Source => {
    const eventIds = [...new Set(ids)].filter((id) => byId.get(id)?.roundId === roundId);
    return { kind: eventIds.length ? 'EVENT' : 'AGGREGATE', reason, rawContribution: value,
      finalContribution: exact ? value * 10 : null, roundIds: [roundId], evidenceEventIds: eventIds };
  };
  const utility = player.utility;
  const impact = player.roundImpact;
  const share = counted.size ? PARTICIPATION_FAMILY_POLICY.scoreScale / counted.size : 0;
  const utilitySources = utility.rounds.filter((round) => round.usage > 0).map((round) => source(
    'VERIFIED_UTILITY_USE', round.usage * share, round.roundId, utility.uses
      .filter((use) => use.roundId === round.roundId).flatMap((use) => [use.useEventId, ...use.effectEvidenceIds]),
    player.rawFamilyInputs!.SUPPORT >= 0,
  ));
  const neutralized = ledger.filter((row) => row.playerId === player.playerId && row.reason === 'DEATH_ANCHOR_NEUTRALIZED');
  const neutralizedIds = new Set(neutralized.map((row) => row.anchorId));
  const { ROUND_IMPACT: rawImpact, ...rawFamilyInputs } = player.rawFamilyInputs;
  const { ROUND_IMPACT: finalImpact, ...finalAttribution } = player.finalAttribution;
  const conventional = explainBaseFamilies({ ...match, events }, {
    playerId: player.playerId, rawFamilyInputs: { ...rawFamilyInputs, SUPPORT: rawFamilyInputs.SUPPORT - utility.supportInput },
    finalAttribution, kernel: player.baseKernel,
  }, profile.filter((episode) => !neutralizedIds.has(episode.anchorId)));
  const families: H3ExplanationFamily[] = conventional.map((family) => {
    if (family.family === 'SUPPORT') {
      const rawInput = rawFamilyInputs.SUPPORT;
      const final = finalAttribution.SUPPORT;
      return { ...family, rawInput, sources: [...family.sources.map((row) => ({
        ...row, finalContribution: rawInput >= 0 ? 10 * row.rawContribution : null,
      })), ...utilitySources], transformations: [{
        code: rawInput < 0 ? 'NEGATIVE_MASS_SOFTENING' : 'POSITIVE_LINEAR_SCALE',
        scope: rawInput < 0 ? 'CROSS_FAMILY' : 'FAMILY', input: rawInput, output: final, adjustment: final - rawInput,
      }] };
    }
    if (family.family === 'DEATH_RELATED') {
      return { ...family, sources: [...family.sources, ...neutralized.map((row) => source(
        'TRADED_DEATH_NEUTRALIZED', 0, row.roundId, row.evidenceIds, false,
      ))] };
    }
    return family;
  });
  const impactSources = impact.awards.map((award) => source(
    impactReasons[award.kind], award.awardedPoints * share, award.roundId,
    [...award.entryEventIds, ...award.transitionEventIds, ...(award.objectiveCompletionEventId ? [award.objectiveCompletionEventId] : [])],
    !impact.appliedMatchCap,
  ));
  const uncapped = impactSources.reduce((sum, row) => sum + row.rawContribution, 0);
  families.push({ family: 'ROUND_IMPACT', rawInput: rawImpact, finalAttribution: finalImpact, sources: impactSources,
    coverage: { availability: impact.availability, observedRoundIds: impact.observedRoundIds, withheldRoundIds: impact.withheldRoundIds },
    transformations: rawImpact === null || finalImpact === null ? [] : [
      ...(impact.appliedMatchCap ? [{ code: 'ROUND_IMPACT_CAP' as const, scope: 'FAMILY' as const, input: uncapped, output: rawImpact, adjustment: rawImpact - uncapped }] : []),
      { code: 'POSITIVE_LINEAR_SCALE', scope: 'FAMILY', input: rawImpact, output: finalImpact, adjustment: finalImpact - rawImpact },
    ],
  });
  return families;
}

function buildExplanation(artifact: CanonicalBuildOptions['artifact'], seed: H3MatchResult['internal']['recomputeSeed'], rating: H3RatingReport, result: H3Result) {
  const profiles = new Map(seed.profiles.map((profile) => [profile.playerId, profile]));
  const projected = new Map(result.players.map((player) => [player.playerId, player]));
  const moments = buildImportantMoments(artifact);
  return {
    schemaVersion: 'm4.6-participation-explanation@2', reportVersion: 'match-result@2', matchId: rating.matchId,
    experimental: true, calibrated: false, causalBlame: false, policy: rating.policy,
    players: rating.players.map((player) => {
      const profile = profiles.get(player.playerId)!;
      const episodes = profile.prepared.p4CPlus.episodeContributions ?? profile.prepared.p4BPlus.episodeContributions ?? [];
      return {
        playerId: player.playerId, teamId: player.teamId, availability: player.availability,
        importantMoments: moments.byPlayer.get(player.playerId) ?? [],
        rating: player.rating === null ? null : {
          value: player.rating.value, arithmetic: player.rating.arithmetic, aggregates: player.rating.aggregates,
          families: explainFamilies(artifact.match, episodes, projected.get(player.playerId)!, result.actionLedger),
        },
      };
    }),
    importantMoments: moments.match,
    provenance: { source: 'match-result@2', originalDemoParsedAtRequest: false },
  };
}

export function buildH3MatchResult(options: CanonicalBuildOptions & H3Evidence): H3MatchResult {
  const { artifact } = options;
  const sidecar = resolveMapScenario(artifact, options.sidecar);
  assertParticipationSidecar(artifact, sidecar);
  const evidence = prepareJointEvidence(artifact.match, toParticipationRatingPreparedProfiles(sidecar.profiles)
    .map((profile, index) => ({ ...profile, countedRoundIds: sidecar.profiles[index]!.countedRoundIds })), options.roundStarts, options.equipment);
  const result = projectH3(evidence);
  const { selector, id, digest } = H3_PARTICIPATION_RATING_POLICY;
  const activeRating = h3RatingReportSchema.parse({
    ...buildRatingReportFields(artifact, sidecar, result.players), awards: result.awards,
    schemaVersion: 'm4.3-participation-rating@2', reportVersion: 'match-result@2',
    scorerVersion: id, policy: { id, digest },
  });
  const recomputeSeed = {
    schemaVersion: 'match-result-recompute-seed@2' as const,
    binding: sidecar.binding, model: sidecar.model, scenario: sidecar.scenario, profiles: sidecar.profiles,
    roundStarts: options.roundStarts, equipment: options.equipment,
  };
  return h3MatchResultSchema.parse({
    schemaVersion: 'match-result@2', createdAt: options.createdAt ?? new Date().toISOString(),
    internal: { selectedPolicyId: id, selectedPolicyDigest: digest, selectedPolicySelector: selector,
      sourceBindingDigest: stableSha256(sidecar.binding), recomputeSeed },
    artifact, productionReports: options.productionReports, activeRating,
    explanation: buildExplanation(artifact, recomputeSeed, activeRating, result),
    storage: { sourceDemoRetained: options.sourceDemoRetained },
  });
}

export function rebuildH3MatchResult(value: H3MatchResult): H3MatchResult {
  const storedEvidence = value.internal.recomputeSeed;
  return buildH3MatchResult({
    artifact: value.artifact, sidecar: sidecarFromStoredSeed(value), productionReports: value.productionReports,
    sourceDemoRetained: value.storage.sourceDemoRetained, roundStarts: storedEvidence.roundStarts, equipment: storedEvidence.equipment,
  });
}
