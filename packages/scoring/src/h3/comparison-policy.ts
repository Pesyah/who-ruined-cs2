import { isDeepStrictEqual } from 'node:util';

import type { MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  PARTICIPATION_FAMILY_POLICY,
  projectParticipationRatings,
  projectParticipationResearchRatings,
  resolveParticipationContext,
  selectParticipationAwards,
  type ParticipationEpisodeContribution,
  type ParticipationRatingProjection,
  type ResearchContextOverrides,
} from '../index.js';

import { buildCanonicalTradeLinks, neutralizeDeathAnchor, type H2E2ResearchProfile } from './canonical-trades.js';
import { extractUtilityEvidence, projectUtilityContribution } from './utility-evidence.js';
import { reconstructRoundTimelines, type RoundStartEvidence } from './round-timeline.js';
import { prepareRoundImpactEvidence } from './state-context.js';
import { extractEconomyCombatEvidence, reconstructEquipmentSnapshots, type EquipmentSnapshotObservation } from './economy-evidence.js';
import { CANDIDATES, JOINT_POLICY_VERSION, NOMINAL, type CandidateId, type JointConfig, type Mechanism } from './comparison-config.js';

const context = PARTICIPATION_FAMILY_POLICY.context;
type ContextTag = keyof typeof context.modifiers;
type Replacements = Partial<Record<ContextTag, number>>;

export type JointEvidence = {
  match: MatchData;
  profiles: H2E2ResearchProfile[];
  baseline: ParticipationRatingProjection[];
  trade: ReturnType<typeof buildCanonicalTradeLinks>;
  utility: ReturnType<typeof extractUtilityEvidence>;
  timeline: ReturnType<typeof reconstructRoundTimelines>;
  impact: ReturnType<typeof prepareRoundImpactEvidence>;
  equipment: ReturnType<typeof reconstructEquipmentSnapshots>;
  economy: ReturnType<typeof extractEconomyCombatEvidence>;
};

export type JointLedgerRow = {
  mechanism: Mechanism;
  playerId: string;
  roundId: string;
  family: 'DEATH_RELATED' | 'SUPPORT' | 'CONTEXT';
  anchorId: string | null;
  evidenceIds: string[];
  originalBase: number | null;
  originalContext: { tag: ContextTag; multiplier: number } | null;
  proposedContext: { tag: ContextTag; multiplier: number } | null;
  selectedContext: { tag: ContextTag; multiplier: number } | null;
  inputDelta: number | null;
  cap: { event?: number; round?: number; match?: number; applied: boolean } | null;
  reason: string;
};

export type JointResult = {
  schemaVersion: typeof JOINT_POLICY_VERSION;
  candidate: CandidateId;
  rows: ParticipationRatingProjection[];
  awards: ReturnType<typeof selectParticipationAwards>;
  ledger: JointLedgerRow[];
};

function uniqueEvents(events: readonly MatchEvent[]): MatchEvent[] {
  const byId = new Map<string, MatchEvent>();
  for (const event of events) {
    const prior = byId.get(event.id);
    if (prior && !isDeepStrictEqual(prior, event)) throw new Error(`E7_CONFLICTING_EVENT_ID:${event.id}`);
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => a.tick - b.tick || a.source.rowIndex - b.source.rowIndex || a.id.localeCompare(b.id));
}

export function prepareJointEvidence(
  input: MatchData,
  profiles: readonly H2E2ResearchProfile[],
  starts: readonly RoundStartEvidence[],
  snapshots: readonly EquipmentSnapshotObservation[],
): JointEvidence {
  const match = { ...input, events: uniqueEvents(input.events) };
  const playerTeams = new Map(match.players.map((player) => [player.id, player.teamId]));
  const validRounds = new Set(match.rounds.filter((round) => round.isValid).map((round) => round.id));
  if (profiles.length !== playerTeams.size || new Set(profiles.map((profile) => profile.playerId)).size !== profiles.length
    || profiles.some((profile) => playerTeams.get(profile.playerId) !== profile.teamId
      || new Set(profile.countedRoundIds).size !== profile.countedRoundIds.length
      || profile.countedRoundIds.some((roundId) => !validRounds.has(roundId)))
    || snapshots.some((row) => row.matchId !== match.matchId || playerTeams.get(row.playerId) !== row.teamId)) {
    throw new Error('E7_EVIDENCE_BINDING_MISMATCH');
  }
  const ordered = [...profiles].sort((a, b) => a.profileKey.localeCompare(b.profileKey));
  const baseline = projectParticipationRatings(ordered);
  const byPlayer = new Map(ordered.map((p) => [p.playerId, new Set(p.countedRoundIds)]));
  const trade = buildCanonicalTradeLinks({ ...match, events: match.events.filter((event) => event.kind !== 'PLAYER_DEATH'
    || (event.actorId && byPlayer.get(event.actorId)?.has(event.roundId)
      && event.targetId && byPlayer.get(event.targetId)?.has(event.roundId))) });
  const timeline = reconstructRoundTimelines(match, starts);
  const equipment = reconstructEquipmentSnapshots(snapshots);
  return {
    match, profiles: ordered, baseline, trade, utility: extractUtilityEvidence(match), timeline, equipment,
    impact: prepareRoundImpactEvidence(match, timeline, ordered, baseline),
    economy: extractEconomyCombatEvidence(match, equipment.snapshots, ordered),
  };
}

function frozenMultiplier(tag: ContextTag): number {
  return Math.min(context.maxMultiplier, 1 + context.deltaScale * (context.modifiers[tag] - 1));
}

function physicalInput(profile: H2E2ResearchProfile, family: 'SUPPORT', amount: number): void {
  for (const row of [profile.prepared.p4BPlus, profile.prepared.p4CPlus]) {
    if (row.status !== 'CALCULATED_RESEARCH_ONLY' || row.familyContributions?.[family] === undefined) continue;
    row.familyContributions[family] += amount;
  }
}

function editContext(
  data: JointEvidence,
  profile: H2E2ResearchProfile,
  enabled: ReadonlySet<Mechanism>,
  config: JointConfig,
  ledger: JointLedgerRow[],
): ResearchContextOverrides {
  const result = new Map<string, Replacements>();
  const counted = new Set(profile.countedRoundIds);
  const episodes = new Map<string, ParticipationEpisodeContribution>();
  const ambiguous = new Set<string>();
  for (const row of profile.prepared.p4BPlus.episodeContributions ?? []) {
    if (episodes.has(row.anchorId)) ambiguous.add(row.anchorId);
    episodes.set(row.anchorId, row);
  }
  const anchor = (id: string | undefined): ParticipationEpisodeContribution | undefined => {
    if (id === undefined || ambiguous.has(id)) return undefined;
    const row = episodes.get(id);
    return row?.family === 'COMBAT' && row.base > 0 ? row : undefined;
  };
  const contextRows: JointLedgerRow[] = [];
  if (enabled.has('E6')) {
    const handled = new Set<string>();
    for (const fact of data.economy.candidates) {
      if (fact.playerId !== profile.playerId || !counted.has(fact.roundId) || fact.h2AnchorIds.length !== 1) continue;
      const episode = anchor(fact.h2AnchorIds[0]);
      if (!episode || handled.has(episode.anchorId)) continue;
      handled.add(episode.anchorId);
      const low = fact.opponentTeamMedian >= 2_500 && fact.actorTeamMedian < fact.opponentTeamMedian && fact.relativeLoadout <= 0.5;
      if (!low && !episode.tags.includes('LOW_EQUIP_COMBAT')) continue;
      const shortfall = Math.min(0.75, Math.max(0, 1 - fact.relativeLoadout));
      const raw = low ? 1 + context.deltaScale * config.economy.strength * Math.min(0.05, 0.08 * shortfall) : 1;
      const multiplier = Math.min(context.maxMultiplier, raw);
      result.set(episode.anchorId, { LOW_EQUIP_COMBAT: multiplier });
      contextRows.push({
        mechanism: 'E6', family: 'CONTEXT', playerId: profile.playerId, roundId: fact.roundId,
        anchorId: episode.anchorId, evidenceIds: [fact.sourceEventId, ...fact.evidenceIds], originalBase: episode.base,
        originalContext: resolveParticipationContext(episode), proposedContext: { tag: 'LOW_EQUIP_COMBAT', multiplier },
        selectedContext: null, inputDelta: null, cap: { event: context.maxMultiplier, applied: raw > multiplier },
        reason: low ? 'REFINED_LOW_EQUIPMENT' : 'COMPLETE_COMPARISON_FAILS_REFINED_RULE',
      });
    }
  }
  if (enabled.has('E5')) {
    const byId = new Map(data.impact.candidates.map((candidate) => [candidate.candidateId, candidate]));
    const ordered = data.impact.ledger.flatMap((row) => {
      const candidate = byId.get(row.candidateId)!;
      return candidate.playerId === profile.playerId && counted.has(candidate.roundId) ? [{ row, candidate }] : [];
    }).sort((a, b) => a.candidate.tick - b.candidate.tick || a.row.sourceEventId.localeCompare(b.row.sourceEventId));
    const progress = new Map<string, { value: number; index: number }>();
    let matchUsed = 0;
    const handled = new Set<string>();
    for (const { row, candidate } of ordered) {
      const episode = row.resolvedH2AnchorIds.length === 1 ? anchor(row.resolvedH2AnchorIds[0]) : undefined;
      const current = progress.get(candidate.roundId) ?? { value: 0, index: 0 };
      const tag = candidate.primaryCategory === 'ADVANTAGE_CREATION' || candidate.primaryCategory === 'ADVANTAGE_CONSOLIDATION'
        ? 'ALIVE_LEAD_TAKEN' : 'DISADVANTAGE';
      const replacement = episode ? result.get(episode.anchorId) ?? {} : {};
      const existing = episode ? resolveParticipationContext(episode, replacement)?.multiplier ?? 1 : 1;
      const oldState = episode?.tags.includes(tag) ? frozenMultiplier(tag) : 1;
      const { diminishing, strength, eventCap, roundCap, matchCap } = config.impact;
      const uncapped = row.incrementalAttribution * strength * diminishing[Math.min(current.index, diminishing.length - 1)]!;
      const room = Math.max(0, Math.min(eventCap, roundCap - current.value, matchCap - matchUsed));
      const nominal = Math.min(uncapped, room);
      const exposure = profile.countedRoundIds.length;
      const multiplier = episode ? Math.min(context.maxMultiplier, oldState + nominal / exposure / episode.base) : 1;
      const eligible = candidate.actionType === 'ENEMY_KILL' && episode && !handled.has(episode.anchorId) && nominal > 0;
      const gain = eligible ? Math.max(0, multiplier - existing) * episode.base * exposure : 0;
      if (episode && gain > 0) {
        result.set(episode.anchorId, { ...replacement, [tag]: multiplier });
        handled.add(episode.anchorId);
        progress.set(candidate.roundId, { value: current.value + gain, index: current.index + 1 });
        matchUsed += gain;
      }
      contextRows.push({
        mechanism: 'E5', family: 'CONTEXT', playerId: profile.playerId, roundId: candidate.roundId,
        anchorId: episode?.anchorId ?? null, evidenceIds: candidate.confirmedEvidenceReferences, originalBase: episode?.base ?? null,
        originalContext: episode ? resolveParticipationContext(episode) : null,
        proposedContext: eligible ? { tag, multiplier } : null, selectedContext: null, inputDelta: null,
        cap: { event: eventCap, round: roundCap, match: matchCap, applied: uncapped > room || (eligible ? multiplier === context.maxMultiplier : false) },
        reason: candidate.actionType !== 'ENEMY_KILL' ? 'OBJECTIVE_PRESERVED' : !episode ? 'NO_UNIQUE_COMBAT_ANCHOR'
          : row.incrementalAttribution === 0 ? row.reason : gain > 0 ? 'STATE_CONTEXT_REPLACEMENT' : 'NO_REMAINING_CONTEXT_GAIN',
      });
    }
  }
  for (const row of contextRows) {
    const episode = row.anchorId === null ? undefined : episodes.get(row.anchorId);
    const contextEdits = episode ? result.get(episode.anchorId) : undefined;
    row.selectedContext = episode ? resolveParticipationContext(episode, contextEdits) : null;
    // Marginal signal from the actual winning context. Saturation/centering and
    // final nonlinear attribution are available at family level in the projection.
    if (episode && row.proposedContext) {
      const tag = row.proposedContext.tag;
      const applied = contextEdits?.[tag];
      if (applied !== undefined) {
        const competing = { ...contextEdits };
        delete competing[tag];
        const without = resolveParticipationContext(episode, competing)?.multiplier ?? 1;
        row.inputDelta = episode.base * ((row.selectedContext?.multiplier ?? 1) - without);
      }
    }
    ledger.push(row);
  }
  return result;
}

export function projectJointPolicy(
  data: JointEvidence, candidate: CandidateId, config: JointConfig = NOMINAL,
  { tradedDeathMode = 'DEBIT_ONLY' }: { tradedDeathMode?: 'REMOVE_ANCHOR' | 'DEBIT_ONLY' } = {},
): JointResult {
  const enabled = new Set<Mechanism>(CANDIDATES[candidate]);
  const ledger: JointLedgerRow[] = [];
  const projected = enabled.size === 0 ? data.baseline : projectEditedProfiles(data, enabled, config, ledger, tradedDeathMode);
  const lastRound = data.match.rounds.filter((round) => round.isValid).sort((a, b) => b.ordinal - a.ordinal)[0];
  const teams = data.match.teams.map((team) => ({ teamId: team.id, score: lastRound?.scoreAfter[team.id] ?? null }));
  for (const [index, row] of projected.entries()) {
    if ((row.rating === null) !== (data.baseline[index]!.rating === null)) throw new Error('E7_ELIGIBILITY_DRIFT');
    if (row.rating !== null) {
      const values = Object.values(row.finalAttribution);
      const reconstructed = 1 + values.reduce((sum, value) => sum + value, 0);
      if (![row.rating, ...values, ...Object.values(row.aggregates), ...Object.values(row.rawFamilyInputs)].every(Number.isFinite)
        || Math.abs(row.rating - reconstructed) > 1e-12) throw new Error('E7_RECONSTRUCTION_FAILED');
    }
  }
  return { schemaVersion: JOINT_POLICY_VERSION, candidate, rows: projected, awards: selectParticipationAwards(projected, teams), ledger };
}

function projectEditedProfiles(
  data: JointEvidence, enabled: ReadonlySet<Mechanism>, config: JointConfig, ledger: JointLedgerRow[],
  tradedDeathMode: 'REMOVE_ANCHOR' | 'DEBIT_ONLY',
): ParticipationRatingProjection[] {
  const overrides = new Map<string, ResearchContextOverrides>();
  const available = new Set(data.baseline.filter((row) => row.rating !== null).map((row) => row.playerId));
  const profiles = data.profiles.map((source) => {
    if (!available.has(source.playerId)) return source;
    const profile = structuredClone(source);
    if (enabled.has('E2')) {
      for (const link of data.trade.links) {
        if (link.victimPlayerId !== profile.playerId || !profile.countedRoundIds.includes(link.roundId)) continue;
        const change = neutralizeDeathAnchor(profile, link.originalDeathEventId, tradedDeathMode);
        ledger.push({
          mechanism: 'E2', family: 'DEATH_RELATED', playerId: profile.playerId, roundId: link.roundId,
          anchorId: link.originalDeathEventId, evidenceIds: link.evidence.eventIds,
          originalBase: change?.base ?? null,
          originalContext: null, proposedContext: null, selectedContext: null, inputDelta: change?.applied ?? null,
          cap: change?.clipped ? { applied: true } : null,
          reason: change === null ? 'EXACT_DEATH_ANCHOR_UNAVAILABLE'
            : change.applied === 0 ? 'NO_REMAINING_DEATH_DEBIT' : 'DEATH_ANCHOR_NEUTRALIZED',
        });
      }
    }
    if (enabled.has('E3')) {
      // Unknown objective applicability leaves the physical profile scoreable.
      const usage = projectUtilityContribution(data.utility, { ...profile, status: 'ELIGIBLE' }, config.utility, 'USAGE_ONLY');
      for (const round of usage.rounds.filter((row) => row.usage > 0)) {
        const amount = round.usage * PARTICIPATION_FAMILY_POLICY.scoreScale / profile.countedRoundIds.length;
        physicalInput(profile, 'SUPPORT', amount);
        ledger.push({
          mechanism: 'E3', family: 'SUPPORT', playerId: profile.playerId, roundId: round.roundId,
          anchorId: null, evidenceIds: data.utility.uses.filter((row) => row.playerId === profile.playerId
            && row.roundId === round.roundId).map((row) => row.eventId),
          originalBase: null, originalContext: null, proposedContext: null, selectedContext: null, inputDelta: amount,
          cap: { round: config.utility.usageRoundCap, applied: round.usageCapped }, reason: 'VERIFIED_USAGE_ONLY',
        });
      }
    }
    overrides.set(profile.profileKey, editContext(data, profile, enabled, config, ledger));
    return profile;
  });
  return projectParticipationResearchRatings(profiles, overrides);
}
