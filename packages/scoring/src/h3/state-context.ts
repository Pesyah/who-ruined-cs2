import type { MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  projectParticipationRatings,
  selectParticipationAwards,
  softenNegativeParticipationMass,
  type ParticipationEpisodeContribution,
  type ParticipationRatingPreparedProfile,
  type ParticipationRatingProjection,
} from '../index.js';

import type {
  ResearchRoundTimeline,
  RoundTimelineContract,
  RoundTimelineEntry,
  VerifiedGameState,
} from './round-timeline.js';

export const H2_E5_ROUND_IMPACT_CONTRACT_VERSION = 'h2-e5-round-impact@1-research' as const;

export type ImpactCategory =
  | 'ADVANTAGE_CREATION'
  | 'ADVANTAGE_RECOVERY'
  | 'EQUALITY_RESTORATION'
  | 'ADVANTAGE_CONSOLIDATION'
  | 'CLUTCH_PROGRESSION'
  | 'OBJECTIVE_STATE_CHANGE'
  | 'SURVIVAL_CONTEXT';

export type ImpactActionType =
  | 'ENEMY_KILL'
  | 'BOMB_PLANTED'
  | 'BOMB_DEFUSED'
  | 'HOSTAGE_RESCUED';

export type H2E5ResearchProfile = ParticipationRatingPreparedProfile & {
  countedRoundIds: readonly string[];
};

export type ImpactCandidate = {
  candidateId: string;
  matchId: string;
  roundId: string;
  roundOrdinal: number;
  playerId: string;
  sourceEventId: string;
  tick: number;
  actionType: ImpactActionType;
  teamId: string;
  preState: VerifiedGameState;
  postState: VerifiedGameState;
  roundOutcome: 'WIN' | 'LOSS' | 'UNKNOWN';
  objectivePhase: VerifiedGameState['phase'];
  confirmedEvidenceReferences: string[];
  confidence: 'CONFIRMED';
  primaryCategory: Exclude<ImpactCategory, 'CLUTCH_PROGRESSION' | 'SURVIVAL_CONTEXT'>;
  categories: ImpactCategory[];
  availability: 'AVAILABLE';
  availabilityReasons: [];
};

export type ImpactRejection = {
  matchId: string;
  roundId: string | null;
  sourceEventIds: string[];
  tick: number | null;
  reasons: string[];
};

export type H2AttributionEvidence = {
  anchorId: string;
  family: ParticipationEpisodeContribution['family'];
  chosenAxis: string;
  base: number;
  tags: string[];
};

export type ImpactAttributionLedgerRow = {
  candidateId: string;
  sourceEventId: string;
  resolvedH2AnchorIds: string[];
  originalH2Attribution: H2AttributionEvidence[];
  originalContextTags: string[];
  originalObjectiveFactor: number | null;
  proposedStateAttribution: number;
  semanticOverlap: 'FULL' | 'PARTIAL' | 'NONE';
  overlapAmount: number;
  incrementalAttribution: number;
  inclusion: 'INCLUDED' | 'EXCLUDED_FULLY_ACCOUNTED' | 'EXCLUDED_NO_POSITIVE_H2_ANCHOR';
  reason: string;
};

export type ImpactModelId = 'E5_R1_STATE_CONTEXT' | 'E5_R2_MARGINAL_H2' | 'E5_R3_SEPARATE_FAMILY';

export type ImpactRoundContribution = {
  roundId: string;
  candidateIds: string[];
  uncapped: number;
  contribution: number;
  capped: boolean;
};

export type ImpactPlayerProjection = {
  playerId: string;
  teamId: string;
  status: ParticipationRatingProjection['status'];
  baselineRating: number | null;
  experimentalRating: number | null;
  impactContribution: number | null;
  separateFamilyRawInput: number | null;
  separateFamilyCenteredInput: number | null;
  rounds: ImpactRoundContribution[];
  reconstructionError: number | null;
};

export type ImpactModelResult = {
  modelId: ImpactModelId;
  projections: ImpactPlayerProjection[];
  hypotheticalAwards: ReturnType<typeof selectParticipationAwards>;
};

export type RoundImpactResearchContract = {
  schemaVersion: typeof H2_E5_ROUND_IMPACT_CONTRACT_VERSION;
  matchId: string;
  evidenceSourceVersion: RoundTimelineContract['schemaVersion'];
  candidates: ImpactCandidate[];
  rejections: ImpactRejection[];
  attributionLedger: ImpactAttributionLedgerRow[];
  baseline: ParticipationRatingProjection[];
  baselineAwards: ReturnType<typeof selectParticipationAwards>;
  models: ImpactModelResult[];
  diagnostics: {
    rejectedByReason: Record<string, number>;
    candidatesByCategory: Record<string, number>;
    overlappingCandidateCount: number;
    lostRoundCandidateCount: number;
  };
};

const EVENT_CAP = 0.02;
const ROUND_CAP = 0.05;
const MATCH_CAP = 0.18;
const DIMINISHING_FACTORS = [1, 0.7, 0.5, 0.35] as const;
const R3_BASELINE = 0.002;
const R3_RAW_CAP = 0.018;

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function unique(values: readonly string[]): string[] {
  return sorted(new Set(values));
}

function scoreInput(profile: H2E5ResearchProfile): ParticipationRatingPreparedProfile {
  return {
    profileKey: profile.profileKey,
    playerId: profile.playerId,
    teamId: profile.teamId,
    status: profile.status,
    reason: profile.reason,
    prepared: profile.prepared,
  };
}

function teamScores(match: MatchData): Array<{ teamId: string; score: number | null }> {
  const last = [...match.rounds]
    .filter((round) => round.isValid)
    .sort((left, right) => right.ordinal - left.ordinal)[0];
  return match.teams.map((team) => ({
    teamId: team.id,
    score: last?.scoreAfter[team.id] ?? null,
  }));
}

function rejection(
  matchId: string,
  roundId: string | null,
  entry: RoundTimelineEntry | null,
  reasons: readonly string[],
): ImpactRejection {
  return {
    matchId,
    roundId,
    sourceEventIds: entry ? [...entry.eventIds] : [],
    tick: entry?.tick ?? null,
    reasons: unique(reasons),
  };
}

function objectiveAction(entry: RoundTimelineEntry): ImpactActionType | null {
  if (entry.actionTypes.length !== 1) return null;
  switch (entry.actionTypes[0]) {
    case 'BOMB_PLANTED': return 'BOMB_PLANTED';
    case 'BOMB_DEFUSED': return 'BOMB_DEFUSED';
    case 'HOSTAGE_RESCUED': return 'HOSTAGE_RESCUED';
    default: return null;
  }
}

function primaryCategory(
  entry: RoundTimelineEntry,
  action: ImpactActionType,
): ImpactCandidate['primaryCategory'] | null {
  if (action !== 'ENEMY_KILL') return 'OBJECTIVE_STATE_CHANGE';
  const transition = entry.advantage;
  if (!transition) return null;
  if (transition.createdEquality) return 'EQUALITY_RESTORATION';
  if (transition.createdAdvantage) return 'ADVANTAGE_CREATION';
  if (transition.reducedDisadvantage) return 'ADVANTAGE_RECOVERY';
  if (transition.beforeDifference > 0 && transition.afterDifference > transition.beforeDifference) {
    return 'ADVANTAGE_CONSOLIDATION';
  }
  return null;
}

function clutchFor(
  round: ResearchRoundTimeline,
  playerId: string,
  entry: RoundTimelineEntry,
): boolean {
  return round.clutchOpportunities.some((opportunity) => (
    opportunity.playerId === playerId
    && opportunity.startedAtTick <= entry.tick
    && opportunity.subsequentActionEventIds.some((id) => entry.eventIds.includes(id))
  ));
}

function survivalContextFor(
  round: ResearchRoundTimeline,
  playerId: string,
): boolean {
  const survival = round.survival.find((row) => row.playerId === playerId);
  if (survival?.state !== 'ALIVE_CONFIRMED') return false;
  const clutchWon = round.clutchOpportunities.some((row) => (
    row.playerId === playerId && row.outcome === 'CLUTCH_WON' && row.survived === true
  ));
  return clutchWon || survival.postplantParticipant;
}

function candidateFromEntry(
  match: MatchData,
  round: ResearchRoundTimeline,
  entry: RoundTimelineEntry,
  playerTeam: ReadonlyMap<string, string>,
): { candidate: ImpactCandidate | null; rejection: ImpactRejection | null } {
  const reasons: string[] = [];
  if (round.coverageStatus !== 'COMPLETE') reasons.push(`ROUND_${round.coverageStatus}`);
  if (entry.ordering !== 'ROW_INDEX_ORDERED' && entry.ordering !== 'SINGLE_EVENT') {
    reasons.push('EVENT_ORDER_NOT_ATTRIBUTABLE');
  }
  if (entry.stateChangeConfidence !== 'CONFIRMED') reasons.push('STATE_CHANGE_NOT_CONFIRMED');
  if (entry.attributionConfidence !== 'CONFIRMED') reasons.push('ACTION_ATTRIBUTION_NOT_CONFIRMED');
  if (entry.before.confidence !== 'CONFIRMED') reasons.push('PRE_STATE_NOT_CONFIRMED');
  if (entry.after.confidence !== 'CONFIRMED') reasons.push('POST_STATE_NOT_CONFIRMED');
  if (entry.eventIds.length !== 1 || entry.evidenceAnchorIds.length !== 1) reasons.push('EVIDENCE_ANCHOR_NOT_UNIQUE');
  if (entry.actorIds.length !== 1) reasons.push('ACTOR_NOT_UNIQUE');
  if (entry.actionTypes.length !== 1) reasons.push('ACTION_TYPE_NOT_UNIQUE');
  const playerId = entry.actorIds[0];
  const teamId = playerId ? playerTeam.get(playerId) : undefined;
  if (!playerId || !teamId) reasons.push('ACTOR_OR_TEAM_UNKNOWN');

  const action = entry.actionTypes[0] === 'PLAYER_DEATH' && entry.advantage
    ? 'ENEMY_KILL' as const
    : objectiveAction(entry);
  if (!action) reasons.push('NO_SUPPORTED_IMPACT_ACTION');
  const primary = action ? primaryCategory(entry, action) : null;
  if (!primary) reasons.push('NO_CONFIRMED_IMPACT_CATEGORY');
  if (reasons.length > 0 || !playerId || !teamId || !action || !primary) {
    return { candidate: null, rejection: rejection(match.matchId, round.roundId, entry, reasons) };
  }

  const categories: ImpactCategory[] = [primary];
  if (action === 'ENEMY_KILL' && clutchFor(round, playerId, entry)) categories.push('CLUTCH_PROGRESSION');
  if (survivalContextFor(round, playerId)) categories.push('SURVIVAL_CONTEXT');
  const sourceEventId = entry.eventIds[0]!;
  return {
    candidate: {
      candidateId: `${round.roundId}:${sourceEventId}:${playerId}`,
      matchId: match.matchId,
      roundId: round.roundId,
      roundOrdinal: round.ordinal,
      playerId,
      sourceEventId,
      tick: entry.tick,
      actionType: action,
      teamId,
      preState: entry.before,
      postState: entry.after,
      roundOutcome: !round.terminalState.winnerTeamId
        ? 'UNKNOWN'
        : round.terminalState.winnerTeamId === teamId ? 'WIN' : 'LOSS',
      objectivePhase: entry.after.phase,
      confirmedEvidenceReferences: [...entry.evidenceAnchorIds],
      confidence: 'CONFIRMED',
      primaryCategory: primary,
      categories: unique(categories) as ImpactCategory[],
      availability: 'AVAILABLE',
      availabilityReasons: [],
    },
    rejection: null,
  };
}

function extractCandidates(
  match: MatchData,
  timeline: RoundTimelineContract,
): { candidates: ImpactCandidate[]; rejections: ImpactRejection[] } {
  const playerTeam = new Map(match.players.map((player) => [player.id, player.teamId]));
  const candidates: ImpactCandidate[] = [];
  const rejections: ImpactRejection[] = [];
  for (const round of timeline.rounds) {
    for (const entry of round.timeline.slice(1)) {
      const isPotential = entry.actionTypes.includes('PLAYER_DEATH')
        || entry.actionTypes.some((action) => objectiveAction({ ...entry, actionTypes: [action] }) !== null);
      if (!isPotential) continue;
      const result = candidateFromEntry(match, round, entry, playerTeam);
      if (result.candidate) candidates.push(result.candidate);
      if (result.rejection) rejections.push(result.rejection);
    }
  }
  for (const eventId of timeline.diagnostics.rejectedDuplicateEventIds) {
    rejections.push({
      matchId: match.matchId,
      roundId: null,
      sourceEventIds: [eventId],
      tick: null,
      reasons: ['DUPLICATE_EVENT_ID'],
    });
  }
  return {
    candidates: candidates.sort((left, right) => left.roundOrdinal - right.roundOrdinal
      || left.tick - right.tick || left.sourceEventId.localeCompare(right.sourceEventId)),
    rejections: rejections.sort((left, right) => (left.roundId ?? '').localeCompare(right.roundId ?? '')
      || (left.tick ?? -1) - (right.tick ?? -1)
      || (left.sourceEventIds[0] ?? '').localeCompare(right.sourceEventIds[0] ?? '')),
  };
}

function episodes(profile: H2E5ResearchProfile): ParticipationEpisodeContribution[] {
  return profile.prepared.p4CPlus.episodeContributions
    ?? profile.prepared.p4BPlus.episodeContributions
    ?? [];
}

function eventOrder(left: MatchEvent, right: MatchEvent): number {
  return left.tick - right.tick
    || left.source.rowIndex - right.source.rowIndex
    || left.id.localeCompare(right.id);
}

function resolvedH2Anchors(
  match: MatchData,
  candidate: ImpactCandidate,
  profile: H2E5ResearchProfile,
): string[] {
  const knownAnchors = new Set(episodes(profile).map((episode) => episode.anchorId));
  if (knownAnchors.has(candidate.sourceEventId)) return [candidate.sourceEventId];
  if (candidate.actionType !== 'ENEMY_KILL') return [];
  const death = match.events.find((event) => event.id === candidate.sourceEventId);
  if (!death) return [];
  const matches = match.events.filter((event) => (
    event.kind === 'PLAYER_HURT'
    && knownAnchors.has(event.id)
    && event.roundId === death.roundId
    && event.actorId === death.actorId
    && event.targetId === death.targetId
    && event.attrs.healthAfter === 0
    && eventOrder(event, death) < 0
    && death.tick - event.tick <= 1
  ));
  return matches.length === 1 ? [matches[0]!.id] : [];
}

function stateImpact(candidate: ImpactCandidate, includeSequenceContext: boolean): number {
  const transition = candidate.primaryCategory === 'OBJECTIVE_STATE_CHANGE' ? null : {
    before: candidate.preState.exactAliveCountByTeamId[candidate.teamId]!,
    enemyBefore: Object.entries(candidate.preState.exactAliveCountByTeamId)
      .find(([teamId]) => teamId !== candidate.teamId)?.[1] ?? null,
    after: candidate.postState.exactAliveCountByTeamId[candidate.teamId]!,
    enemyAfter: Object.entries(candidate.postState.exactAliveCountByTeamId)
      .find(([teamId]) => teamId !== candidate.teamId)?.[1] ?? null,
  };
  let value: number;
  switch (candidate.primaryCategory) {
    case 'ADVANTAGE_CREATION': value = 0.012; break;
    case 'ADVANTAGE_RECOVERY': {
      const beforeDifference = transition?.before !== null && transition?.enemyBefore !== null
        ? transition!.before - transition!.enemyBefore! : 0;
      const afterDifference = transition?.after !== null && transition?.enemyAfter !== null
        ? transition!.after - transition!.enemyAfter! : beforeDifference;
      value = 0.008 + Math.min(0.006, Math.max(0, afterDifference - beforeDifference) * 0.004);
      break;
    }
    case 'EQUALITY_RESTORATION': value = 0.016; break;
    case 'ADVANTAGE_CONSOLIDATION': value = 0.005; break;
    case 'OBJECTIVE_STATE_CHANGE':
      value = candidate.actionType === 'BOMB_DEFUSED' ? 0.015
        : candidate.actionType === 'HOSTAGE_RESCUED' ? 0.014 : 0.01;
      break;
  }
  const supplemental = !includeSequenceContext ? 0 : candidate.categories.includes('CLUTCH_PROGRESSION') ? 0.003
    : candidate.categories.includes('SURVIVAL_CONTEXT') ? 0.002 : 0;
  return Math.min(EVENT_CAP, value + supplemental);
}

function objectiveFactorKey(action: ImpactActionType): string | null {
  switch (action) {
    case 'BOMB_PLANTED': return 'objective:plants';
    case 'BOMB_DEFUSED': return 'objective:defuses';
    case 'HOSTAGE_RESCUED': return 'objective:hostageRescues';
    default: return null;
  }
}

function ledgerFor(
  match: MatchData,
  candidates: readonly ImpactCandidate[],
  profiles: readonly H2E5ResearchProfile[],
  baseline: readonly ParticipationRatingProjection[],
  includeSequenceContext: boolean,
): ImpactAttributionLedgerRow[] {
  const profileByPlayer = new Map(profiles.map((profile) => [profile.playerId, profile]));
  const projectionByPlayer = new Map(baseline.map((row) => [row.playerId, row]));
  return candidates.map((candidate): ImpactAttributionLedgerRow => {
    const profile = profileByPlayer.get(candidate.playerId);
    const projection = projectionByPlayer.get(candidate.playerId);
    const anchorIds = profile ? resolvedH2Anchors(match, candidate, profile) : [];
    const attribution = profile ? episodes(profile)
      .filter((episode) => anchorIds.includes(episode.anchorId) && episode.base > 0)
      .map((episode) => ({ ...episode, tags: [...episode.tags].sort() })) : [];
    const tags = unique(attribution.flatMap((row) => row.tags));
    const factorKey = objectiveFactorKey(candidate.actionType);
    const objectiveFactor = projection?.status === 'CALCULATED_RESEARCH_ONLY' && factorKey
      ? projection.kernel.factorContributions.OBJECTIVES[factorKey] ?? 0
      : null;
    const proposed = stateImpact(candidate, includeSequenceContext);
    const fullContextOverlap = candidate.primaryCategory === 'ADVANTAGE_CREATION'
      && tags.includes('ALIVE_LEAD_TAKEN');
    const fullObjectiveOverlap = candidate.primaryCategory === 'OBJECTIVE_STATE_CHANGE'
      && objectiveFactor !== null && objectiveFactor > 0;
    const partialContextOverlap = (candidate.primaryCategory === 'ADVANTAGE_RECOVERY'
      || candidate.primaryCategory === 'EQUALITY_RESTORATION'
      || (includeSequenceContext && candidate.categories.includes('CLUTCH_PROGRESSION')))
      && tags.includes('DISADVANTAGE');
    const positiveAction = attribution.some((row) => row.base > 0);
    const semanticOverlap = fullContextOverlap || fullObjectiveOverlap ? 'FULL' as const
      : positiveAction || partialContextOverlap ? 'PARTIAL' as const
        : 'NONE' as const;
    const overlapAmount = semanticOverlap === 'FULL' ? proposed
      : semanticOverlap === 'PARTIAL' ? proposed * (partialContextOverlap ? 0.7 : 0.5)
        : 0;
    const incremental = Math.max(0, proposed - overlapAmount);
    const inclusion = semanticOverlap === 'FULL' ? 'EXCLUDED_FULLY_ACCOUNTED' as const
      : !positiveAction && candidate.primaryCategory !== 'OBJECTIVE_STATE_CHANGE'
        ? 'EXCLUDED_NO_POSITIVE_H2_ANCHOR' as const
        : 'INCLUDED' as const;
    return {
      candidateId: candidate.candidateId,
      sourceEventId: candidate.sourceEventId,
      resolvedH2AnchorIds: anchorIds,
      originalH2Attribution: attribution,
      originalContextTags: tags,
      originalObjectiveFactor: objectiveFactor,
      proposedStateAttribution: proposed,
      semanticOverlap,
      overlapAmount,
      incrementalAttribution: inclusion === 'INCLUDED' ? incremental : 0,
      inclusion,
      reason: semanticOverlap === 'FULL'
        ? 'EXISTING_H2_CONTEXT_OR_OBJECTIVE_SEMANTICALLY_COVERS_THE_STATE_CHANGE'
        : inclusion === 'EXCLUDED_NO_POSITIVE_H2_ANCHOR'
          ? 'R2_REQUIRES_AN_EXISTING_POSITIVE_H2_ACTION_TO_ADJUST'
          : semanticOverlap === 'PARTIAL'
            ? 'PHYSICAL_ACTION_OR_CONTEXT_OVERLAPS_BUT_STATE_MAGNITUDE_REMAINS_INCREMENTAL'
            : 'NO_EXISTING_H2_ATTRIBUTION_MATCHED_THE_CONFIRMED_STATE_FACT',
    };
  });
}

type CappedPlayer = { total: number; rounds: ImpactRoundContribution[] };

function cappedContributions(
  candidates: readonly ImpactCandidate[],
  rawByCandidate: ReadonlyMap<string, number>,
): Map<string, CappedPlayer> {
  const byPlayer = new Map<string, ImpactCandidate[]>();
  for (const candidate of candidates) {
    const rows = byPlayer.get(candidate.playerId) ?? [];
    rows.push(candidate);
    byPlayer.set(candidate.playerId, rows);
  }
  const result = new Map<string, CappedPlayer>();
  for (const [playerId, rows] of byPlayer) {
    const byRound = new Map<string, ImpactCandidate[]>();
    for (const row of rows) {
      const roundRows = byRound.get(row.roundId) ?? [];
      roundRows.push(row);
      byRound.set(row.roundId, roundRows);
    }
    const roundContributions: ImpactRoundContribution[] = [];
    for (const [roundId, roundRows] of byRound) {
      const ordered = roundRows.filter((row) => (rawByCandidate.get(row.candidateId) ?? 0) > 0)
        .sort((left, right) => left.tick - right.tick
        || left.sourceEventId.localeCompare(right.sourceEventId));
      const uncapped = ordered.reduce((sum, row, index) => (
        sum + Math.min(EVENT_CAP, rawByCandidate.get(row.candidateId) ?? 0)
          * DIMINISHING_FACTORS[Math.min(index, DIMINISHING_FACTORS.length - 1)]!
      ), 0);
      roundContributions.push({
        roundId,
        candidateIds: ordered.map((row) => row.candidateId),
        uncapped,
        contribution: Math.min(uncapped, ROUND_CAP),
        capped: uncapped > ROUND_CAP,
      });
    }
    roundContributions.sort((left, right) => left.roundId.localeCompare(right.roundId));
    const uncappedMatch = roundContributions.reduce((sum, round) => sum + round.contribution, 0);
    const matchScale = uncappedMatch > MATCH_CAP ? MATCH_CAP / uncappedMatch : 1;
    const scaledRounds = roundContributions.map((round) => ({
      ...round,
      contribution: round.contribution * matchScale,
      capped: round.capped || matchScale < 1,
    }));
    result.set(playerId, {
      total: scaledRounds.reduce((sum, round) => sum + round.contribution, 0),
      rounds: scaledRounds,
    });
  }
  return result;
}

function adjustedRows(
  baseline: readonly ParticipationRatingProjection[],
  projections: readonly ImpactPlayerProjection[],
): ParticipationRatingProjection[] {
  const byPlayer = new Map(projections.map((row) => [row.playerId, row]));
  return baseline.map((row) => {
    if (row.status !== 'CALCULATED_RESEARCH_ONLY') return row;
    const adjusted = byPlayer.get(row.playerId)?.experimentalRating;
    return adjusted === null || adjusted === undefined ? row : { ...row, rating: adjusted };
  });
}

function modelResult(
  modelId: ImpactModelId,
  match: MatchData,
  profiles: readonly H2E5ResearchProfile[],
  baseline: readonly ParticipationRatingProjection[],
  capped: ReadonlyMap<string, CappedPlayer>,
): ImpactModelResult {
  const projections = profiles.map((profile, index): ImpactPlayerProjection => {
    const base = baseline[index]!;
    const contribution = capped.get(profile.playerId) ?? { total: 0, rounds: [] };
    if (base.status !== 'CALCULATED_RESEARCH_ONLY') {
      return {
        playerId: profile.playerId,
        teamId: profile.teamId,
        status: base.status,
        baselineRating: null,
        experimentalRating: null,
        impactContribution: null,
        separateFamilyRawInput: null,
        separateFamilyCenteredInput: null,
        rounds: contribution.rounds,
        reconstructionError: null,
      };
    }
    let delta = contribution.total;
    let raw: number | null = null;
    let centered: number | null = null;
    if (modelId === 'E5_R3_SEPARATE_FAMILY') {
      raw = Math.min(R3_RAW_CAP, contribution.total / 10);
      centered = Math.max(-R3_BASELINE, Math.min(R3_RAW_CAP - R3_BASELINE, raw - R3_BASELINE));
      delta = centered >= 0 ? 10 * centered : -softenNegativeParticipationMass(5 * -centered);
    }
    const experimentalRating = base.rating + delta;
    const reconstructed = base.rating + delta;
    return {
      playerId: profile.playerId,
      teamId: profile.teamId,
      status: base.status,
      baselineRating: base.rating,
      experimentalRating,
      impactContribution: delta,
      separateFamilyRawInput: raw,
      separateFamilyCenteredInput: centered,
      rounds: contribution.rounds,
      reconstructionError: Math.abs(experimentalRating - reconstructed),
    };
  });
  return {
    modelId,
    projections,
    hypotheticalAwards: selectParticipationAwards(adjustedRows(baseline, projections), teamScores(match)),
  };
}

function counts(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

export function prepareRoundImpactEvidence(
  match: MatchData,
  timeline: RoundTimelineContract,
  profiles: readonly H2E5ResearchProfile[],
  baseline: readonly ParticipationRatingProjection[],
  { includeSequenceContext = true }: { includeSequenceContext?: boolean } = {},
): { candidates: ImpactCandidate[]; rejections: ImpactRejection[]; ledger: ImpactAttributionLedgerRow[] } {
  if (timeline.matchId !== match.matchId) throw new Error('H2_E5_TIMELINE_MATCH_BINDING_MISMATCH');
  const extracted = extractCandidates(match, timeline);
  return { ...extracted, ledger: ledgerFor(match, extracted.candidates, profiles, baseline, includeSequenceContext) };
}

export function evaluateH2E5Experiment(
  match: MatchData,
  timeline: RoundTimelineContract,
  profiles: readonly H2E5ResearchProfile[],
): RoundImpactResearchContract {
  const baseline = projectParticipationRatings(profiles.map(scoreInput));
  const extracted = prepareRoundImpactEvidence(match, timeline, profiles, baseline);
  const { ledger } = extracted;
  const countedByPlayer = new Map(profiles.map((profile) => [profile.playerId, new Set(profile.countedRoundIds)]));
  const scoreable = extracted.candidates.filter((candidate) => (
    countedByPlayer.get(candidate.playerId)?.has(candidate.roundId) === true
  ));
  const r1Raw = new Map(ledger.map((row) => [row.candidateId, row.proposedStateAttribution]));
  const r2Raw = new Map(ledger.map((row) => [row.candidateId, row.incrementalAttribution]));
  const r1 = cappedContributions(scoreable, r1Raw);
  const r2 = cappedContributions(scoreable, r2Raw);
  const modelResults = [
    modelResult('E5_R1_STATE_CONTEXT', match, profiles, baseline, r1),
    modelResult('E5_R2_MARGINAL_H2', match, profiles, baseline, r2),
    modelResult('E5_R3_SEPARATE_FAMILY', match, profiles, baseline, r1),
  ];
  return {
    schemaVersion: H2_E5_ROUND_IMPACT_CONTRACT_VERSION,
    matchId: match.matchId,
    evidenceSourceVersion: timeline.schemaVersion,
    candidates: extracted.candidates,
    rejections: extracted.rejections,
    attributionLedger: ledger,
    baseline,
    baselineAwards: selectParticipationAwards(baseline, teamScores(match)),
    models: modelResults,
    diagnostics: {
      rejectedByReason: counts(extracted.rejections.flatMap((row) => row.reasons)),
      candidatesByCategory: counts(extracted.candidates.flatMap((row) => row.categories)),
      overlappingCandidateCount: ledger.filter((row) => row.semanticOverlap !== 'NONE').length,
      lostRoundCandidateCount: extracted.candidates.filter((row) => row.roundOutcome === 'LOSS').length,
    },
  };
}
