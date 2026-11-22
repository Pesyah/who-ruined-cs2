import { h3PolicyDigest, h3PolicyId } from '@who-ruined/contracts';
import {
  H2_PARTICIPATION_RATING_POLICY,
  PARTICIPATION_FAMILY_POLICY,
  PARTICIPATION_FAMILY_POLICY_DIGEST,
  PARTICIPATION_RATING_SCORER_VERSION,
  projectParticipationFamilyInputs,
  selectParticipationAwards,
  type CalculatedParticipationRating,
  type ParticipationFamily,
} from '../index.js';

import { projectUtilityContribution, type UtilityContribution, type UtilityUsageEvidence } from './utility-evidence.js';
import { prepareRoundImpactEvidence } from './state-context.js';
import { JOINT_POLICY_VERSION, NOMINAL, researchDigest } from './comparison-config.js';
import { projectJointPolicy, type JointEvidence, type JointResult } from './comparison-policy.js';
import { evaluateRoundImpact, hasRoundImpactCoverage, ROUND_IMPACT_RULES, type RoundImpactAward } from './round-impact.js';

export const H3_VERSION = h3PolicyId;
const nonHarm = ['COMBAT', 'SUPPORT', 'DEATH_RELATED', 'CONTEXT', 'OBJECTIVES', 'ROUND_IMPACT'] as const;
export const H3_FAMILIES = [...nonHarm, 'DIRECT_HARM'] as const;
type H3Family = typeof H3_FAMILIES[number];
type FamilyValues = Record<ParticipationFamily, number> & { ROUND_IMPACT: number | null };

export const H3_POLICY = Object.freeze({
  version: H3_VERSION, precedingPolicy: JOINT_POLICY_VERSION, sourcePolicy: H2_PARTICIPATION_RATING_POLICY,
  familyKernelDigest: PARTICIPATION_FAMILY_POLICY_DIGEST, projectorVersion: PARTICIPATION_RATING_SCORER_VERSION,
  tradedDeathMode: 'REMOVE_ANCHOR' as const,
  mechanisms: 'E2+E5_ACTION_CONTEXT+E6+E8_UTILITY+E8_ROUND_IMPACT', joint: NOMINAL,
  utility: Object.freeze({ usageOnlyFactor: 1, verifiedEnemyEffectFactor: 1.25, bundleEffectSlots: 1 }),
  roundImpact: ROUND_IMPACT_RULES, families: H3_FAMILIES,
});
export const H3_POLICY_DIGEST = h3PolicyDigest;
if (researchDigest(H3_POLICY) !== H3_POLICY_DIGEST) throw new Error('H3_POLICY_DIGEST_MISMATCH');
export const H3_PARTICIPATION_RATING_POLICY = Object.freeze({
  selector: 'H3',
  id: H3_VERSION,
  digest: H3_POLICY_DIGEST,
});

type UtilityUseAttribution = {
  useEventId: string;
  roundId: string;
  creditBasis: 'USAGE_ONLY' | 'EFFECT_UNAVAILABLE' | 'VERIFIED_ENTITY_EFFECT' | 'VERIFIED_ROUND_TYPE_EFFECT';
  effectEvidenceIds: string[];
  weightFactor: number;
};

type RoundImpactAttribution = {
  availability: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  observedRoundIds: string[];
  withheldRoundIds: string[];
  awards: RoundImpactAward[];
  pointsPerCountedRound: number | null;
  appliedMatchCap: boolean;
};

export type H3Player = {
  profileKey: string;
  playerId: string;
  teamId: string;
  status: JointResult['rows'][number]['status'];
  reason: string | null;
  countedRoundIds: string[];
  rating: number | null;
  rawFamilyInputs: FamilyValues | null;
  finalAttribution: FamilyValues | null;
  aggregates: CalculatedParticipationRating['aggregates'] | null;
  roundImpact: RoundImpactAttribution | null;
  utility: { uses: UtilityUseAttribution[]; rounds: UtilityContribution['rounds']; supportInput: number } | null;
  baseKernel: CalculatedParticipationRating['kernel'] | null;
};

export type H3Result = {
  schemaVersion: typeof H3_VERSION;
  policyDigest: string;
  matchId: string;
  players: H3Player[];
  awards: ReturnType<typeof selectParticipationAwards>;
  actionLedger: JointResult['ledger'];
};

function utilityForPlayer(data: JointEvidence, profile: JointEvidence['profiles'][number]): NonNullable<H3Player['utility']> {
  const counted = new Set(profile.countedRoundIds);
  const rows = data.utility.rounds.filter((row) => row.playerId === profile.playerId && counted.has(row.roundId));
  const usesById = new Map(data.utility.uses.map((use) => [use.eventId, use]));
  const eventsById = new Map(data.match.events.map((event) => [event.id, event]));
  const attribution: UtilityUseAttribution[] = [];
  const factors = new Map<string, number>();
  for (const row of rows) {
    const uses = row.usageEventIds.map((id) => usesById.get(id)).filter((use): use is UtilityUsageEvidence => use !== undefined)
      .sort((a, b) => a.tick - b.tick || a.eventId.localeCompare(b.eventId));
    const confirmed = row.effectivenessAvailability === 'AVAILABLE';
    const hasEnemyEffect = confirmed && ((row.enemyDamage ?? 0) > 0 || (row.enemyBlindSeconds ?? 0) > 0 || row.flashAssists > 0);
    const exact = new Map<string, string[]>();
    if (hasEnemyEffect && row.utilityType === 'FLASH') {
      const linked = new Set(row.linkedUsageEventIds);
      for (const use of uses) {
        if (use.entityId === null || !linked.has(use.eventId)) continue;
        const ids = row.effectEventIds.filter((id) => {
          const event = eventsById.get(id);
          return event?.kind === 'PLAYER_BLIND' && event.tick >= use.tick && event.attrs.entityId === use.entityId
            && typeof event.attrs.blindDuration === 'number' && event.attrs.blindDuration > 0;
        });
        if (ids.length > 0) exact.set(use.eventId, ids);
      }
    }
    for (const [index, use] of uses.entries()) {
      const exactEvidence = exact.get(use.eventId);
      const bundleSlot = hasEnemyEffect && exact.size === 0 && index < H3_POLICY.utility.bundleEffectSlots;
      const weightFactor = exactEvidence || bundleSlot ? H3_POLICY.utility.verifiedEnemyEffectFactor : H3_POLICY.utility.usageOnlyFactor;
      const creditBasis = exactEvidence ? 'VERIFIED_ENTITY_EFFECT' : bundleSlot ? 'VERIFIED_ROUND_TYPE_EFFECT'
        : confirmed ? 'USAGE_ONLY' : 'EFFECT_UNAVAILABLE';
      factors.set(use.eventId, weightFactor);
      attribution.push({ useEventId: use.eventId, roundId: use.roundId, creditBasis, weightFactor,
        effectEvidenceIds: exactEvidence ?? (bundleSlot ? row.effectEventIds : []) });
    }
  }
  const usage = projectUtilityContribution(data.utility, { ...profile, status: 'ELIGIBLE' }, NOMINAL.utility, 'USAGE_ONLY', factors);
  const supportInput = counted.size ? PARTICIPATION_FAMILY_POLICY.scoreScale * usage.usage / counted.size : 0;
  return { uses: attribution, rounds: usage.rounds, supportInput };
}

export function projectH3(data: JointEvidence): H3Result {
  const actionImpact = prepareRoundImpactEvidence(data.match, data.timeline, data.profiles, data.baseline, { includeSequenceContext: false });
  const base = projectJointPolicy({ ...data, impact: actionImpact }, 'C9', NOMINAL, { tradedDeathMode: H3_POLICY.tradedDeathMode });
  const timelines = new Map(data.timeline.rounds.map((round) => [round.roundId, round]));
  const profiles = new Map(data.profiles.map((profile) => [profile.playerId, profile]));
  const players = base.rows.map((row): H3Player => {
    const profile = profiles.get(row.playerId)!;
    const countedRoundIds = [...profile.countedRoundIds].sort();
    const identity = { profileKey: row.profileKey, playerId: row.playerId, teamId: row.teamId, status: row.status, reason: row.reason, countedRoundIds };
    if (row.rating === null) return { ...identity, rating: null, rawFamilyInputs: null, finalAttribution: null, aggregates: null,
      roundImpact: null, utility: null, baseKernel: null };
    const observedRoundIds: string[] = [];
    const withheldRoundIds: string[] = [];
    const awards: RoundImpactAward[] = [];
    for (const roundId of countedRoundIds) {
      const timeline = timelines.get(roundId);
      if (!timeline || !hasRoundImpactCoverage(timeline)) { withheldRoundIds.push(roundId); continue; }
      observedRoundIds.push(roundId);
      const award = evaluateRoundImpact(timeline, row.playerId, row.teamId);
      if (award) awards.push(award);
    }
    const average = observedRoundIds.length ? awards.reduce((sum, award) => sum + award.awardedPoints, 0) / countedRoundIds.length : null;
    const pointsPerCountedRound = average === null ? null : Math.min(ROUND_IMPACT_RULES.matchAverageCap, average);
    const roundImpact: RoundImpactAttribution = {
      observedRoundIds, withheldRoundIds, awards, pointsPerCountedRound,
      availability: !observedRoundIds.length ? 'UNAVAILABLE' : withheldRoundIds.length ? 'PARTIAL' : 'AVAILABLE',
      appliedMatchCap: average !== null && pointsPerCountedRound !== null && average > pointsPerCountedRound,
    };
    const utility = utilityForPlayer(data, profile);
    const families: Record<H3Family, number> = { ...row.rawFamilyInputs, SUPPORT: row.rawFamilyInputs.SUPPORT + utility.supportInput,
      ROUND_IMPACT: PARTICIPATION_FAMILY_POLICY.scoreScale * (pointsPerCountedRound ?? 0) };
    const { rating, aggregates, finalAttribution } = projectParticipationFamilyInputs(families, nonHarm);
    return { ...identity, rating, aggregates, rawFamilyInputs: { ...families, ROUND_IMPACT: pointsPerCountedRound === null ? null : families.ROUND_IMPACT },
      finalAttribution: { ...finalAttribution, ROUND_IMPACT: pointsPerCountedRound === null ? null : finalAttribution.ROUND_IMPACT },
      roundImpact, utility, baseKernel: row.kernel };
  });
  const last = data.match.rounds.filter((round) => round.isValid).sort((a, b) => b.ordinal - a.ordinal)[0];
  const teams = data.match.teams.map((team) => ({ teamId: team.id, score: last?.scoreAfter[team.id] ?? null }));
  return { schemaVersion: H3_VERSION, policyDigest: H3_POLICY_DIGEST, matchId: data.match.matchId, players,
    awards: selectParticipationAwards(players, teams), actionLedger: base.ledger };
}
