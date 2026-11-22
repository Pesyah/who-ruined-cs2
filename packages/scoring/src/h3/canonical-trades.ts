import type { MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  PARTICIPATION_FAMILY_POLICY,
  projectParticipationRatings,
  selectParticipationAwards,
  type ParticipationEpisodeContribution,
  type ParticipationRatingPreparedProfile,
  type ParticipationRatingProjection,
} from '../index.js';

export const H2_E2_TRADE_CONTRACT_VERSION = 'h2-e2-canonical-trade@1-research' as const;
export const H2_E2_EXPERIMENT_VERSION = 'h2-e2-death-neutralization@1-research' as const;

export type SameTickPolicy = 'STRICT_LATER_TICK' | 'ROW_INDEX_ORDERED';

export type CanonicalTradeLink = {
  originalDeathEventId: string;
  revengeDeathEventId: string;
  roundId: string;
  victimPlayerId: string;
  originalKillerPlayerId: string;
  traderPlayerId: string;
  delayTicks: number;
  delaySeconds: number;
  confirmationState: 'CONFIRMED_STRICT_TICK' | 'CONFIRMED_ROW_INDEX_ORDER';
  evidence: {
    eventIds: [string, string];
    sourceRowIndexes: [number, number];
    victimTeamId: string;
    originalKillerTeamId: string;
  };
};

export type CanonicalTradeResult = {
  schemaVersion: typeof H2_E2_TRADE_CONTRACT_VERSION;
  sameTickPolicy: SameTickPolicy;
  availability: {
    status: 'AVAILABLE' | 'UNAVAILABLE';
    reason: 'TICK_RATE_UNAVAILABLE' | null;
  };
  links: CanonicalTradeLink[];
  diagnostics: {
    inputDeathEvents: number;
    eligibleDeathEvents: number;
    rejectedDuplicateEventIds: string[];
    rejectedEventIds: string[];
    candidatePairs: number;
    matchingAlgorithm: 'MIN_COST_MAX_FLOW';
    polynomialBound: 'O(F*V*E) per round';
  };
};

type ConfirmedDeath = {
  event: MatchEvent;
  actorId: string;
  targetId: string;
  actorTeamId: string;
  targetTeamId: string;
};

type Candidate = {
  original: ConfirmedDeath;
  revenge: ConfirmedDeath;
  delayTicks: number;
};

type FlowEdge = {
  to: number;
  reverse: number;
  capacity: number;
  cost: number;
  candidate: Candidate | null;
};

function eventOrder(event: MatchEvent): [number, number, string] {
  return [event.tick, event.source.rowIndex, event.id];
}

function compareEvents(left: MatchEvent, right: MatchEvent): number {
  const a = eventOrder(left);
  const b = eventOrder(right);
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
}

function isAfter(
  original: MatchEvent,
  revenge: MatchEvent,
  policy: SameTickPolicy,
): boolean {
  if (revenge.tick > original.tick) return true;
  return policy === 'ROW_INDEX_ORDERED'
    && revenge.tick === original.tick
    && revenge.source.rowIndex > original.source.rowIndex;
}

function confirmedDeaths(match: MatchData): {
  deaths: ConfirmedDeath[];
  duplicateIds: string[];
  rejectedIds: string[];
  inputDeathEvents: number;
} {
  const allIdCounts = new Map<string, number>();
  for (const event of match.events) {
    allIdCounts.set(event.id, (allIdCounts.get(event.id) ?? 0) + 1);
  }
  const duplicateIds = [...allIdCounts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  const duplicateIdSet = new Set(duplicateIds);
  const validRoundIds = new Set(match.rounds.filter((round) => round.isValid).map((round) => round.id));
  const teamByPlayer = new Map(match.players.map((player) => [player.id, player.teamId]));
  const input = match.events.filter((event) => event.kind === 'PLAYER_DEATH');
  const rejectedIds: string[] = [];
  const deaths: ConfirmedDeath[] = [];

  for (const event of input) {
    const actorId = event.actorId;
    const targetId = event.targetId;
    const actorTeamId = actorId ? teamByPlayer.get(actorId) : undefined;
    const targetTeamId = targetId ? teamByPlayer.get(targetId) : undefined;
    const contextConsistent = !event.context || (
      (event.context.actorTeamId === null || event.context.actorTeamId === actorTeamId)
      && (event.context.targetTeamId === null || event.context.targetTeamId === targetTeamId)
    );
    const accepted = !duplicateIdSet.has(event.id)
      && validRoundIds.has(event.roundId)
      && event.context?.phase === 'LIVE'
      && Boolean(actorId && targetId && actorTeamId && targetTeamId)
      && actorId !== targetId
      && actorTeamId !== targetTeamId
      && event.attrs.friendlyFire !== true
      && event.attrs.suicide !== true
      && contextConsistent;
    if (!accepted || !actorId || !targetId || !actorTeamId || !targetTeamId) {
      rejectedIds.push(event.id);
      continue;
    }
    deaths.push({ event, actorId, targetId, actorTeamId, targetTeamId });
  }

  return {
    deaths: deaths.sort((left, right) => compareEvents(left.event, right.event)),
    duplicateIds,
    rejectedIds: [...new Set(rejectedIds)].sort(),
    inputDeathEvents: input.length,
  };
}

function addEdge(
  graph: FlowEdge[][],
  from: number,
  to: number,
  capacity: number,
  cost: number,
  candidate: Candidate | null = null,
): FlowEdge {
  const forward: FlowEdge = {
    to,
    reverse: graph[to]!.length,
    capacity,
    cost,
    candidate,
  };
  const reverse: FlowEdge = {
    to: from,
    reverse: graph[from]!.length,
    capacity: 0,
    cost: -cost,
    candidate: null,
  };
  graph[from]!.push(forward);
  graph[to]!.push(reverse);
  return forward;
}

/**
 * Maximum cardinality first, minimum total tick delay second. Stable node and
 * edge insertion by event ID provides the final deterministic tie-break.
 * Successive shortest augmenting paths are polynomial, unlike subset search.
 */
function minimumCostMaximumMatching(
  deaths: readonly ConfirmedDeath[],
  candidates: readonly Candidate[],
): Candidate[] {
  if (candidates.length === 0) return [];
  const originals = [...new Map(candidates.map((candidate) => [
    candidate.original.event.id,
    candidate.original,
  ])).values()].sort((left, right) => left.event.id.localeCompare(right.event.id));
  const revenges = [...new Map(candidates.map((candidate) => [
    candidate.revenge.event.id,
    candidate.revenge,
  ])).values()].sort((left, right) => left.event.id.localeCompare(right.event.id));
  const source = 0;
  const originalOffset = 1;
  const revengeOffset = originalOffset + originals.length;
  const sink = revengeOffset + revenges.length;
  const graph = Array.from({ length: sink + 1 }, (): FlowEdge[] => []);
  const originalIndex = new Map(originals.map((death, index) => [death.event.id, originalOffset + index]));
  const revengeIndex = new Map(revenges.map((death, index) => [death.event.id, revengeOffset + index]));
  const candidateEdges: FlowEdge[] = [];

  for (const original of originals) addEdge(graph, source, originalIndex.get(original.event.id)!, 1, 0);
  for (const revenge of revenges) addEdge(graph, revengeIndex.get(revenge.event.id)!, sink, 1, 0);
  for (const candidate of [...candidates].sort((left, right) => (
    left.original.event.id.localeCompare(right.original.event.id)
    || left.revenge.event.id.localeCompare(right.revenge.event.id)
  ))) {
    candidateEdges.push(addEdge(
      graph,
      originalIndex.get(candidate.original.event.id)!,
      revengeIndex.get(candidate.revenge.event.id)!,
      1,
      candidate.delayTicks,
      candidate,
    ));
  }

  while (true) {
    const distance = Array<number>(graph.length).fill(Number.POSITIVE_INFINITY);
    const previousNode = Array<number>(graph.length).fill(-1);
    const previousEdge = Array<number>(graph.length).fill(-1);
    distance[source] = 0;

    for (let pass = 0; pass < graph.length - 1; pass += 1) {
      let changed = false;
      for (let from = 0; from < graph.length; from += 1) {
        if (!Number.isFinite(distance[from])) continue;
        for (let edgeIndex = 0; edgeIndex < graph[from]!.length; edgeIndex += 1) {
          const edge = graph[from]![edgeIndex]!;
          if (edge.capacity === 0) continue;
          const nextDistance = distance[from]! + edge.cost;
          if (nextDistance >= distance[edge.to]!) continue;
          distance[edge.to] = nextDistance;
          previousNode[edge.to] = from;
          previousEdge[edge.to] = edgeIndex;
          changed = true;
        }
      }
      if (!changed) break;
    }
    if (!Number.isFinite(distance[sink])) break;

    for (let node = sink; node !== source;) {
      const from = previousNode[node]!;
      const edgeIndex = previousEdge[node]!;
      if (from < 0 || edgeIndex < 0) throw new Error('H2_E2_MATCHING_PATH_INCOMPLETE');
      const edge = graph[from]![edgeIndex]!;
      edge.capacity -= 1;
      graph[node]![edge.reverse]!.capacity += 1;
      node = from;
    }
  }

  const selected = candidateEdges
    .filter((edge) => edge.capacity === 0 && edge.candidate !== null)
    .map((edge) => edge.candidate!);
  const originalIds = new Set(selected.map((candidate) => candidate.original.event.id));
  const revengeIds = new Set(selected.map((candidate) => candidate.revenge.event.id));
  if (originalIds.size !== selected.length || revengeIds.size !== selected.length) {
    throw new Error('H2_E2_ONE_TO_ONE_INTEGRITY_MISMATCH');
  }
  if (deaths.length < originalIds.size || deaths.length < revengeIds.size) {
    throw new Error('H2_E2_MATCHING_REFERENCES_UNKNOWN_DEATH');
  }
  return selected.sort((left, right) => (
    compareEvents(left.original.event, right.original.event)
    || left.revenge.event.id.localeCompare(right.revenge.event.id)
  ));
}

export function buildCanonicalTradeLinks(
  match: MatchData,
  options: { sameTickPolicy?: SameTickPolicy } = {},
): CanonicalTradeResult {
  const sameTickPolicy = options.sameTickPolicy ?? 'STRICT_LATER_TICK';
  const tickRate = match.tickRate;
  const confirmed = confirmedDeaths(match);
  const baseDiagnostics = {
    inputDeathEvents: confirmed.inputDeathEvents,
    eligibleDeathEvents: confirmed.deaths.length,
    rejectedDuplicateEventIds: confirmed.duplicateIds,
    rejectedEventIds: confirmed.rejectedIds,
    candidatePairs: 0,
    matchingAlgorithm: 'MIN_COST_MAX_FLOW' as const,
    polynomialBound: 'O(F*V*E) per round' as const,
  };
  if (typeof tickRate !== 'number' || !Number.isFinite(tickRate) || tickRate <= 0) {
    return {
      schemaVersion: H2_E2_TRADE_CONTRACT_VERSION,
      sameTickPolicy,
      availability: { status: 'UNAVAILABLE', reason: 'TICK_RATE_UNAVAILABLE' },
      links: [],
      diagnostics: baseDiagnostics,
    };
  }

  const selected: Candidate[] = [];
  let candidatePairs = 0;
  const roundIds = [...new Set(confirmed.deaths.map((death) => death.event.roundId))].sort();
  for (const roundId of roundIds) {
    const deaths = confirmed.deaths.filter((death) => death.event.roundId === roundId);
    const candidates: Candidate[] = [];
    for (const original of deaths) {
      for (const revenge of deaths) {
        if (original.event.id === revenge.event.id
          || revenge.targetId !== original.actorId
          || revenge.actorTeamId !== original.targetTeamId
          || !isAfter(original.event, revenge.event, sameTickPolicy)) continue;
        const delayTicks = revenge.event.tick - original.event.tick;
        if (delayTicks / tickRate > 5) continue;
        candidates.push({ original, revenge, delayTicks });
      }
    }
    candidatePairs += candidates.length;
    selected.push(...minimumCostMaximumMatching(deaths, candidates));
  }

  return {
    schemaVersion: H2_E2_TRADE_CONTRACT_VERSION,
    sameTickPolicy,
    availability: { status: 'AVAILABLE', reason: null },
    links: selected.map((candidate): CanonicalTradeLink => ({
      originalDeathEventId: candidate.original.event.id,
      revengeDeathEventId: candidate.revenge.event.id,
      roundId: candidate.original.event.roundId,
      victimPlayerId: candidate.original.targetId,
      originalKillerPlayerId: candidate.original.actorId,
      traderPlayerId: candidate.revenge.actorId,
      delayTicks: candidate.delayTicks,
      delaySeconds: candidate.delayTicks / tickRate,
      confirmationState: candidate.delayTicks === 0
        ? 'CONFIRMED_ROW_INDEX_ORDER'
        : 'CONFIRMED_STRICT_TICK',
      evidence: {
        eventIds: [candidate.original.event.id, candidate.revenge.event.id],
        sourceRowIndexes: [
          candidate.original.event.source.rowIndex,
          candidate.revenge.event.source.rowIndex,
        ],
        victimTeamId: candidate.original.targetTeamId,
        originalKillerTeamId: candidate.original.actorTeamId,
      },
    })),
    diagnostics: { ...baseDiagnostics, candidatePairs },
  };
}

export type H2E2ResearchProfile = ParticipationRatingPreparedProfile & {
  countedRoundIds: readonly string[];
};

export type H2E2Variant = {
  projections: ParticipationRatingProjection[];
  hypotheticalAwards: ReturnType<typeof selectParticipationAwards>;
};

export type H2E2Experiment = {
  schemaVersion: typeof H2_E2_EXPERIMENT_VERSION;
  trades: CanonicalTradeResult;
  baseline: H2E2Variant;
  canonicalOnly: H2E2Variant | null;
  tradedDeathNeutralized: H2E2Variant | null;
  neutralizedAnchorsByPlayer: Record<string, string[]>;
  contextAnchorByRevengeEventId: Record<string, string>;
  unavailableContextEventIds: string[];
};

function scoreInput(profile: H2E2ResearchProfile): ParticipationRatingPreparedProfile {
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
  const lastRound = [...match.rounds]
    .filter((round) => round.isValid)
    .sort((left, right) => right.ordinal - left.ordinal)[0];
  return match.teams.map((team) => ({
    teamId: team.id,
    score: lastRound?.scoreAfter[team.id] ?? null,
  }));
}

function variant(
  match: MatchData,
  profiles: readonly H2E2ResearchProfile[],
): H2E2Variant {
  const projections = projectParticipationRatings(profiles.map(scoreInput));
  return {
    projections,
    hypotheticalAwards: selectParticipationAwards(projections, teamScores(match)),
  };
}

function cloneProfiles(profiles: readonly H2E2ResearchProfile[]): H2E2ResearchProfile[] {
  return structuredClone([...profiles]);
}

function withoutTradeTags(episode: ParticipationEpisodeContribution): ParticipationEpisodeContribution {
  return {
    ...episode,
    tags: episode.tags.filter((tag) => tag !== 'TRADE' && tag !== 'FAST_TRADE'),
  };
}

function retagProfile(profile: H2E2ResearchProfile): void {
  for (const row of [profile.prepared.p4BPlus, profile.prepared.p4CPlus]) {
    if (row.episodeContributions) {
      row.episodeContributions = row.episodeContributions.map(withoutTradeTags);
    }
  }
}

function findContextAnchor(
  match: MatchData,
  profile: H2E2ResearchProfile,
  link: CanonicalTradeLink,
): string | null {
  const episodes = profile.prepared.p4BPlus.episodeContributions ?? [];
  const positiveAnchors = new Set(episodes
    .filter((episode) => episode.base > 0 && (episode.family === 'COMBAT' || episode.family === 'SUPPORT'))
    .map((episode) => episode.anchorId));
  if (positiveAnchors.has(link.revengeDeathEventId)) return link.revengeDeathEventId;
  const death = match.events.find((event) => event.id === link.revengeDeathEventId);
  if (!death) return null;
  const candidates = match.events.filter((event) => (
    event.kind === 'PLAYER_HURT'
    && positiveAnchors.has(event.id)
    && event.roundId === death.roundId
    && event.actorId === death.actorId
    && event.targetId === death.targetId
    && event.attrs.healthAfter === 0
    && (event.tick < death.tick
      || (event.tick === death.tick && event.source.rowIndex < death.source.rowIndex))
    && death.tick - event.tick <= 1
  ));
  return candidates.length === 1 ? candidates[0]!.id : null;
}

function addTradeTag(
  profile: H2E2ResearchProfile,
  anchorId: string,
  fast: boolean,
): void {
  for (const row of [profile.prepared.p4BPlus, profile.prepared.p4CPlus]) {
    const episode = row.episodeContributions?.find((candidate) => candidate.anchorId === anchorId);
    if (!episode) continue;
    episode.tags = [...new Set([...episode.tags, 'TRADE', ...(fast ? ['FAST_TRADE'] : [])])].sort();
  }
}

export function neutralizeDeathAnchor(
  profile: H2E2ResearchProfile, anchorId: string, mode: 'REMOVE_ANCHOR' | 'DEBIT_ONLY' = 'REMOVE_ANCHOR',
): { base: number; applied: number; clipped: boolean } | null {
  const { p4BPlus, p4CPlus } = profile.prepared;
  const objectiveOnlyUnknown = profile.prepared.scenario === 'UNKNOWN'
    && p4CPlus.status === 'UNKNOWN_APPLICABILITY' && p4CPlus.reason === 'SCENARIO_UNKNOWN';
  const rows = objectiveOnlyUnknown ? [p4BPlus] : [p4BPlus, p4CPlus];
  const edits = [];
  for (const row of rows) {
    const episodes = row.episodeContributions;
    const current = row.familyContributions?.DEATH_RELATED;
    const anchors = episodes?.filter((episode) => episode.anchorId === anchorId);
    const anchor = anchors?.length === 1 ? anchors[0] : undefined;
    if (row.status !== 'CALCULATED_RESEARCH_ONLY' || !episodes || current === undefined || !Number.isFinite(current)
      || anchor?.chosenAxis !== 'ownDeaths' || anchor.family !== 'DEATH_RELATED'
      || !Number.isFinite(anchor.base) || anchor.base >= 0) return null;
    edits.push({ row, episodes, current, anchor });
  }
  const base = edits[0]!.anchor.base;
  const current = edits[0]!.current;
  if (edits.some((edit) => edit.anchor.base !== base || edit.current !== current)) return null;
  const requested = -base * PARTICIPATION_FAMILY_POLICY.scoreScale;
  // Keep already-positive centering intact. The E7 neutralization may clear a
  // debit, but cannot create a new positive physical family contribution.
  const applied = mode === 'DEBIT_ONLY' ? Math.min(requested, Math.max(0, -current)) : requested;
  if (applied === 0) return { base, applied, clipped: true };
  for (const { row, episodes, current, anchor } of edits) {
    row.episodeContributions = episodes.filter((episode) => episode !== anchor);
    row.familyContributions = {
      ...row.familyContributions,
      DEATH_RELATED: current + applied,
    };
  }
  return { base, applied, clipped: applied < requested };
}

export function evaluateH2E2Experiment(
  match: MatchData,
  profiles: readonly H2E2ResearchProfile[],
  options: { sameTickPolicy?: SameTickPolicy } = {},
): H2E2Experiment {
  const trades = buildCanonicalTradeLinks(match, options);
  const baseline = variant(match, profiles);
  if (trades.availability.status !== 'AVAILABLE') {
    return {
      schemaVersion: H2_E2_EXPERIMENT_VERSION,
      trades,
      baseline,
      canonicalOnly: null,
      tradedDeathNeutralized: null,
      neutralizedAnchorsByPlayer: {},
      contextAnchorByRevengeEventId: {},
      unavailableContextEventIds: [],
    };
  }

  const canonicalProfiles = cloneProfiles(profiles);
  for (const profile of canonicalProfiles) retagProfile(profile);
  const profileByPlayer = new Map(canonicalProfiles.map((profile) => [profile.playerId, profile]));
  const contextAnchorByRevengeEventId: Record<string, string> = {};
  const unavailableContextEventIds: string[] = [];

  for (const link of trades.links) {
    const trader = profileByPlayer.get(link.traderPlayerId);
    if (!trader || trader.status !== 'ELIGIBLE' || !trader.countedRoundIds.includes(link.roundId)) continue;
    const anchorId = findContextAnchor(match, trader, link);
    if (!anchorId) {
      unavailableContextEventIds.push(link.revengeDeathEventId);
      continue;
    }
    contextAnchorByRevengeEventId[link.revengeDeathEventId] = anchorId;
    addTradeTag(trader, anchorId, link.delaySeconds <= 1);
  }

  const neutralizedProfiles = cloneProfiles(canonicalProfiles);
  const neutralizedProfileByPlayer = new Map(neutralizedProfiles.map((profile) => [profile.playerId, profile]));
  const neutralizedAnchorsByPlayer: Record<string, string[]> = {};
  for (const link of trades.links) {
    const victim = neutralizedProfileByPlayer.get(link.victimPlayerId);
    if (!victim || victim.status !== 'ELIGIBLE' || !victim.countedRoundIds.includes(link.roundId)) continue;
    if (neutralizeDeathAnchor(victim, link.originalDeathEventId) === null) continue;
    (neutralizedAnchorsByPlayer[victim.playerId] ??= []).push(link.originalDeathEventId);
  }
  for (const anchors of Object.values(neutralizedAnchorsByPlayer)) anchors.sort();

  return {
    schemaVersion: H2_E2_EXPERIMENT_VERSION,
    trades,
    baseline,
    canonicalOnly: variant(match, canonicalProfiles),
    tradedDeathNeutralized: variant(match, neutralizedProfiles),
    neutralizedAnchorsByPlayer,
    contextAnchorByRevengeEventId,
    unavailableContextEventIds: unavailableContextEventIds.sort(),
  };
}
