import type {
  C2S2PreparedSidecar,
  MatchData,
  MatchRound,
  ParticipationSidecar,
  Side,
} from '@who-ruined/contracts';

export const H2_E4_TIMELINE_CONTRACT_VERSION = 'h2-e4-round-timeline@1-research' as const;

export type TimelineConfidence = 'CONFIRMED' | 'PARTIAL' | 'UNAVAILABLE';
export type TimelineCoverageStatus = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'EXCLUDED';
export type TimelineOrdering = 'ROW_INDEX_ORDERED' | 'SINGLE_EVENT' | 'ATOMIC_SAME_TICK' | 'BOUNDARY';
export type RoundPhase =
  | 'LIVE'
  | 'POSTPLANT'
  | 'DEFUSING'
  | 'HOSTAGE_ACTION'
  | 'DEFUSED'
  | 'EXPLODED'
  | 'ROUND_ENDED'
  | 'UNKNOWN';

export type RoundStartPlayerEvidence = {
  playerId: string;
  classification: ParticipationSidecar['participation'][number]['classification'];
  counted: boolean;
  startObserved: boolean;
  startAlive: boolean | null;
};

export type RoundStartEvidence = {
  roundId: string;
  liveStart: number;
  liveEnd: number;
  boundaryComplete: boolean;
  boundaryReasons: string[];
  scenario: ParticipationSidecar['scenario'];
  players: RoundStartPlayerEvidence[];
  supplementalEvents: TimelineSupplementalEvent[];
};

export type TimelineSupplementalEvent = {
  id: string;
  roundId: string;
  tick: number;
  kind: 'HOSTAGE_RESCUED' | 'HOSTAGE_HURT';
  actorId: string | null;
};

export type VerifiedGameState = {
  alivePlayerIdsByTeamId: Record<string, string[]>;
  unknownPlayerIdsByTeamId: Record<string, string[]>;
  confirmedAliveCountByTeamId: Record<string, number>;
  exactAliveCountByTeamId: Record<string, number | null>;
  numericalDifference: number | null;
  phase: RoundPhase;
  confidence: TimelineConfidence;
};

export type AdvantageTransition = {
  actorTeamId: string;
  relation: 'ENEMY';
  actedAt: 'ADVANTAGE' | 'EQUALITY' | 'DISADVANTAGE';
  beforeDifference: number;
  afterDifference: number;
  createdEquality: boolean;
  createdAdvantage: boolean;
  eliminatedEnemyAdvantage: boolean;
  reducedDisadvantage: boolean;
};

export type RoundTimelineEntry = {
  tick: number;
  order: number | null;
  ordering: TimelineOrdering;
  eventIds: string[];
  actorIds: string[];
  targetIds: string[];
  actionTypes: string[];
  before: VerifiedGameState;
  after: VerifiedGameState;
  evidenceSource: 'PARTICIPATION_SIDECAR' | 'NORMALIZED_EVENT' | 'PREPARED_SUPPLEMENT';
  confidence: TimelineConfidence;
  stateChangeConfidence: TimelineConfidence;
  attributionConfidence: TimelineConfidence;
  evidenceAnchorIds: string[];
  uncertaintyReasons: string[];
  advantage: AdvantageTransition | null;
  sameTick: {
    eventCount: number;
    orderedIntermediateStatesExposed: boolean;
    atomicFinalStateEquivalent: boolean;
  } | null;
};

export type ClutchOpportunity = {
  playerId: string;
  teamId: string;
  roundId: string;
  startedAtTick: number;
  sourceEventIds: string[];
  opponentsAtStart: number;
  subsequentActionEventIds: string[];
  outcome: 'CLUTCH_WON' | 'CLUTCH_LOST' | 'CLUTCH_OUTCOME_UNAVAILABLE';
  survived: boolean | null;
};

export type PlayerSurvivalFact = {
  playerId: string;
  teamId: string;
  state: 'ALIVE_CONFIRMED' | 'DEAD_CONFIRMED' | 'UNKNOWN';
  roundResult: 'WIN' | 'LOSS' | 'UNKNOWN';
  postplantParticipant: boolean;
  clutchContext: boolean;
  equipmentSaved: null;
  equipmentSavedReason: 'INVENTORY_TRANSITION_UNAVAILABLE';
};

export type UsefulLostRoundAction = {
  playerId: string;
  eventId: string;
  tick: number;
  beforeDifference: number;
  afterDifference: number;
  kind: 'REDUCED_DISADVANTAGE' | 'RESTORED_EQUALITY' | 'CREATED_ADVANTAGE';
};

export type ResearchRoundTimeline = {
  matchId: string;
  roundId: string;
  ordinal: number;
  teamIds: string[];
  sideByTeamId: Record<string, Side>;
  roundStartTick: number;
  roundEndTick: number;
  boundaryEvidence: {
    source: 'PARTICIPATION_SIDECAR';
    complete: boolean;
    reasons: string[];
  };
  coverageStatus: TimelineCoverageStatus;
  timeline: RoundTimelineEntry[];
  terminalState: {
    winnerTeamId: string | null;
    outcomeEvidence: 'NORMALIZED_ROUND_WINNER' | 'UNAVAILABLE';
    state: VerifiedGameState | null;
  };
  clutchOpportunities: ClutchOpportunity[];
  survival: PlayerSurvivalFact[];
  usefulLostRoundActions: UsefulLostRoundAction[];
  diagnostics: string[];
};

export type RoundTimelineContract = {
  schemaVersion: typeof H2_E4_TIMELINE_CONTRACT_VERSION;
  matchId: string;
  rounds: ResearchRoundTimeline[];
  diagnostics: {
    rejectedDuplicateEventIds: string[];
    excludedNonLiveEventIds: string[];
    excludedOutsideBoundaryEventIds: string[];
    unknownRoundEventIds: string[];
  };
};

type MutableState = {
  alive: Map<string, Set<string>>;
  unknown: Map<string, Set<string>>;
  dead: Set<string>;
  phase: RoundPhase;
  reasons: Set<string>;
};

type TimelineEvent = {
  id: string;
  roundId: string;
  tick: number;
  rowIndex: number | null;
  kind: string;
  actorId: string | null;
  targetId: string | null;
  actorTeamId: string | null;
  targetTeamId: string | null;
  aliveByTeamId: Record<string, number> | null;
  phase: string;
  source: 'NORMALIZED_EVENT' | 'PREPARED_SUPPLEMENT';
};

type ApplyResult = { confidence: TimelineConfidence; reasons: string[] };

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function cloneState(state: MutableState): MutableState {
  return {
    alive: new Map([...state.alive].map(([teamId, players]) => [teamId, new Set(players)])),
    unknown: new Map([...state.unknown].map(([teamId, players]) => [teamId, new Set(players)])),
    dead: new Set(state.dead),
    phase: state.phase,
    reasons: new Set(state.reasons),
  };
}

function confidenceOf(state: MutableState, teamIds: readonly string[]): TimelineConfidence {
  if (teamIds.length !== 2) return 'UNAVAILABLE';
  const observed = teamIds.reduce(
    (sum, teamId) => sum + (state.alive.get(teamId)?.size ?? 0),
    0,
  );
  const unknown = teamIds.reduce((sum, teamId) => sum + (state.unknown.get(teamId)?.size ?? 0), 0);
  if (unknown === 0 && state.reasons.size === 0) return 'CONFIRMED';
  return observed > 0 ? 'PARTIAL' : 'UNAVAILABLE';
}

function gameState(state: MutableState, teamIds: readonly string[]): VerifiedGameState {
  const alivePlayerIdsByTeamId = Object.fromEntries(teamIds.map((teamId) => [
    teamId,
    sorted(state.alive.get(teamId) ?? []),
  ]));
  const unknownPlayerIdsByTeamId = Object.fromEntries(teamIds.map((teamId) => [
    teamId,
    sorted(state.unknown.get(teamId) ?? []),
  ]));
  const confirmedAliveCountByTeamId = Object.fromEntries(teamIds.map((teamId) => [
    teamId,
    alivePlayerIdsByTeamId[teamId]?.length ?? 0,
  ]));
  const exactAliveCountByTeamId = Object.fromEntries(teamIds.map((teamId) => [
    teamId,
    (unknownPlayerIdsByTeamId[teamId]?.length ?? 0) === 0
      ? confirmedAliveCountByTeamId[teamId] ?? 0
      : null,
  ]));
  const [left, right] = teamIds;
  const numericalDifference = left && right
    && exactAliveCountByTeamId[left] !== null
    && exactAliveCountByTeamId[right] !== null
    ? exactAliveCountByTeamId[left]! - exactAliveCountByTeamId[right]!
    : null;
  return {
    alivePlayerIdsByTeamId,
    unknownPlayerIdsByTeamId,
    confirmedAliveCountByTeamId,
    exactAliveCountByTeamId,
    numericalDifference,
    phase: state.phase,
    confidence: confidenceOf(state, teamIds),
  };
}

function initialState(
  match: MatchData,
  evidence: RoundStartEvidence,
): { state: MutableState; reasons: string[] } {
  const teamByPlayer = new Map(match.players.map((player) => [player.id, player.teamId]));
  const rowsByPlayer = new Map<string, RoundStartPlayerEvidence[]>();
  for (const row of evidence.players) {
    const rows = rowsByPlayer.get(row.playerId) ?? [];
    rows.push(row);
    rowsByPlayer.set(row.playerId, rows);
  }
  const alive = new Map(match.teams.map((team) => [team.id, new Set<string>()]));
  const unknown = new Map(match.teams.map((team) => [team.id, new Set<string>()]));
  const dead = new Set<string>();
  const reasons = new Set(evidence.boundaryReasons);
  if (!evidence.boundaryComplete) reasons.add('BOUNDARY_INCOMPLETE');
  for (const player of match.players) {
    const rows = rowsByPlayer.get(player.id) ?? [];
    const teamId = teamByPlayer.get(player.id);
    if (!teamId || rows.length !== 1) {
      if (teamId) unknown.get(teamId)?.add(player.id);
      reasons.add(rows.length > 1 ? 'DUPLICATE_START_EVIDENCE' : 'START_EVIDENCE_MISSING');
      continue;
    }
    const row = rows[0]!;
    if (!row.startObserved || row.startAlive === null) {
      unknown.get(teamId)?.add(player.id);
      reasons.add('START_ALIVE_UNAVAILABLE');
    } else if (row.startAlive) {
      alive.get(teamId)?.add(player.id);
    } else {
      dead.add(player.id);
    }
    if (row.classification !== 'PRESENT_VERIFIED') reasons.add(`PARTICIPATION_${row.classification}`);
  }
  return { state: { alive, unknown, dead, phase: 'LIVE', reasons }, reasons: sorted(reasons) };
}

function relation(
  actorId: string | null,
  targetId: string | null,
  teamByPlayer: ReadonlyMap<string, string>,
): 'ENEMY' | 'FRIENDLY' | 'SELF' | 'WORLD' | 'UNKNOWN' {
  if (!targetId || !teamByPlayer.has(targetId)) return 'UNKNOWN';
  if (!actorId) return 'WORLD';
  if (!teamByPlayer.has(actorId)) return 'UNKNOWN';
  if (actorId === targetId) return 'SELF';
  return teamByPlayer.get(actorId) === teamByPlayer.get(targetId) ? 'FRIENDLY' : 'ENEMY';
}

function applyObjective(
  state: MutableState,
  kind: string,
  scenario: RoundStartEvidence['scenario'],
): ApplyResult {
  if (kind.startsWith('BOMB_') && scenario === 'HOSTAGE') {
    state.reasons.add('BOMB_EVENT_IN_HOSTAGE_SCENARIO');
    return { confidence: 'UNAVAILABLE', reasons: ['BOMB_EVENT_IN_HOSTAGE_SCENARIO'] };
  }
  if (kind.startsWith('HOSTAGE_') && scenario === 'BOMB') {
    state.reasons.add('HOSTAGE_EVENT_IN_BOMB_SCENARIO');
    return { confidence: 'UNAVAILABLE', reasons: ['HOSTAGE_EVENT_IN_BOMB_SCENARIO'] };
  }
  switch (kind) {
    case 'BOMB_PLANTED': state.phase = 'POSTPLANT'; break;
    case 'BOMB_BEGIN_DEFUSE': state.phase = 'DEFUSING'; break;
    case 'BOMB_ABORT_DEFUSE': state.phase = 'POSTPLANT'; break;
    case 'BOMB_DEFUSED': state.phase = 'DEFUSED'; break;
    case 'BOMB_EXPLODED': state.phase = 'EXPLODED'; break;
    case 'HOSTAGE_RESCUED':
    case 'HOSTAGE_HURT': state.phase = 'HOSTAGE_ACTION'; break;
    default: return { confidence: confidenceOf(state, [...state.alive.keys()]), reasons: [] };
  }
  return { confidence: confidenceOf(state, [...state.alive.keys()]), reasons: [] };
}

function applyDeath(
  state: MutableState,
  event: TimelineEvent,
  teamByPlayer: ReadonlyMap<string, string>,
): ApplyResult {
  const reasons: string[] = [];
  const targetId = event.targetId;
  const targetTeamId = targetId ? teamByPlayer.get(targetId) : undefined;
  if (!targetId || !targetTeamId) {
    state.reasons.add('DEATH_TARGET_OR_TEAM_UNKNOWN');
    return { confidence: 'UNAVAILABLE', reasons: ['DEATH_TARGET_OR_TEAM_UNKNOWN'] };
  }
  if (event.targetTeamId && event.targetTeamId !== targetTeamId) {
    reasons.push('TARGET_TEAM_CONTEXT_MISMATCH');
  }
  if (event.actorId && state.dead.has(event.actorId)) reasons.push('ACTOR_ALREADY_DEAD');
  const knownAlive = state.alive.get(targetTeamId)?.has(targetId) ?? false;
  const wasUnknown = state.unknown.get(targetTeamId)?.has(targetId) ?? false;
  if (!knownAlive && !wasUnknown) {
    reasons.push('UNKNOWN_OR_ALREADY_DEAD_VICTIM');
    state.reasons.add('UNKNOWN_OR_ALREADY_DEAD_VICTIM');
    return { confidence: 'UNAVAILABLE', reasons };
  }
  state.alive.get(targetTeamId)?.delete(targetId);
  state.unknown.get(targetTeamId)?.delete(targetId);
  state.dead.add(targetId);
  for (const reason of reasons) state.reasons.add(reason);
  return {
    confidence: knownAlive && reasons.length === 0 ? 'CONFIRMED' : 'PARTIAL',
    reasons: wasUnknown ? unique([...reasons, 'VICTIM_PRESTATE_UNKNOWN']) : reasons,
  };
}

function applyEvent(
  state: MutableState,
  event: TimelineEvent,
  scenario: RoundStartEvidence['scenario'],
  teamByPlayer: ReadonlyMap<string, string>,
): ApplyResult {
  if (event.kind === 'PLAYER_DEATH') return applyDeath(state, event, teamByPlayer);
  return applyObjective(state, event.kind, scenario);
}

function advantageFor(
  event: TimelineEvent,
  before: VerifiedGameState,
  after: VerifiedGameState,
  teamIds: readonly string[],
  teamByPlayer: ReadonlyMap<string, string>,
  attributionConfidence: TimelineConfidence,
): AdvantageTransition | null {
  if (attributionConfidence !== 'CONFIRMED'
    || before.confidence !== 'CONFIRMED'
    || after.confidence !== 'CONFIRMED') return null;
  if (event.kind !== 'PLAYER_DEATH' || relation(event.actorId, event.targetId, teamByPlayer) !== 'ENEMY') return null;
  const actorTeamId = event.actorId ? teamByPlayer.get(event.actorId) : undefined;
  const enemyTeamId = teamIds.find((teamId) => teamId !== actorTeamId);
  if (!actorTeamId || !enemyTeamId) return null;
  const ownBefore = before.exactAliveCountByTeamId[actorTeamId];
  const enemyBefore = before.exactAliveCountByTeamId[enemyTeamId];
  const ownAfter = after.exactAliveCountByTeamId[actorTeamId];
  const enemyAfter = after.exactAliveCountByTeamId[enemyTeamId];
  if (ownBefore === null || enemyBefore === null || ownAfter === null || enemyAfter === null
    || ownBefore === undefined || enemyBefore === undefined || ownAfter === undefined || enemyAfter === undefined) return null;
  const beforeDifference = ownBefore - enemyBefore;
  const afterDifference = ownAfter - enemyAfter;
  return {
    actorTeamId,
    relation: 'ENEMY',
    actedAt: beforeDifference > 0 ? 'ADVANTAGE' : beforeDifference < 0 ? 'DISADVANTAGE' : 'EQUALITY',
    beforeDifference,
    afterDifference,
    createdEquality: beforeDifference < 0 && afterDifference === 0,
    createdAdvantage: beforeDifference <= 0 && afterDifference > 0,
    eliminatedEnemyAdvantage: beforeDifference < 0 && afterDifference >= 0,
    reducedDisadvantage: beforeDifference < 0 && afterDifference > beforeDifference,
  };
}

function attributionConfidenceFor(
  event: TimelineEvent,
  applied: ApplyResult,
  before: VerifiedGameState,
  after: VerifiedGameState,
  teamByPlayer: ReadonlyMap<string, string>,
): TimelineConfidence {
  if (applied.confidence === 'UNAVAILABLE'
    || before.confidence === 'UNAVAILABLE'
    || after.confidence === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (applied.confidence !== 'CONFIRMED'
    || before.confidence !== 'CONFIRMED'
    || after.confidence !== 'CONFIRMED') return 'PARTIAL';
  if (!event.actorId || !teamByPlayer.has(event.actorId)) return 'UNAVAILABLE';
  if (event.kind === 'PLAYER_DEATH') {
    return event.targetId && relation(event.actorId, event.targetId, teamByPlayer) === 'ENEMY'
      ? 'CONFIRMED'
      : 'UNAVAILABLE';
  }
  return event.kind.startsWith('BOMB_') || event.kind.startsWith('HOSTAGE_')
    ? 'CONFIRMED'
    : 'UNAVAILABLE';
}

function normalizedEvents(match: MatchData): TimelineEvent[] {
  return match.events.map((event): TimelineEvent => ({
    id: event.id,
    roundId: event.roundId,
    tick: event.tick,
    rowIndex: event.source.rowIndex,
    kind: event.kind,
    actorId: event.actorId,
    targetId: event.targetId,
    actorTeamId: event.context?.actorTeamId ?? null,
    targetTeamId: event.context?.targetTeamId ?? null,
    aliveByTeamId: event.context?.aliveByTeamId ?? null,
    phase: event.context?.phase ?? 'UNKNOWN',
    source: 'NORMALIZED_EVENT',
  }));
}

function supplementalEvents(rows: readonly TimelineSupplementalEvent[]): TimelineEvent[] {
  return rows.map((event): TimelineEvent => ({
    id: event.id,
    roundId: event.roundId,
    tick: event.tick,
    rowIndex: null,
    kind: event.kind,
    actorId: event.actorId,
    targetId: null,
    actorTeamId: null,
    targetTeamId: null,
    aliveByTeamId: null,
    phase: 'LIVE',
    source: 'PREPARED_SUPPLEMENT',
  }));
}

function eventEntry(
  event: TimelineEvent,
  beforeState: MutableState,
  afterState: MutableState,
  applied: ApplyResult,
  teamIds: readonly string[],
  teamByPlayer: ReadonlyMap<string, string>,
): RoundTimelineEntry {
  const before = gameState(beforeState, teamIds);
  const after = gameState(afterState, teamIds);
  const attributionConfidence = attributionConfidenceFor(event, applied, before, after, teamByPlayer);
  return {
    tick: event.tick,
    order: event.rowIndex,
    ordering: event.rowIndex === null ? 'SINGLE_EVENT' : 'ROW_INDEX_ORDERED',
    eventIds: [event.id],
    actorIds: event.actorId ? [event.actorId] : [],
    targetIds: event.targetId ? [event.targetId] : [],
    actionTypes: [event.kind],
    before,
    after,
    evidenceSource: event.source,
    confidence: applied.confidence,
    stateChangeConfidence: applied.confidence,
    attributionConfidence,
    evidenceAnchorIds: [event.id],
    uncertaintyReasons: unique(applied.reasons),
    advantage: advantageFor(event, before, after, teamIds, teamByPlayer, attributionConfidence),
    sameTick: null,
  };
}

function applyAtomicTick(
  events: readonly TimelineEvent[],
  state: MutableState,
  evidence: RoundStartEvidence,
  teamIds: readonly string[],
  teamByPlayer: ReadonlyMap<string, string>,
): RoundTimelineEntry {
  const beforeState = cloneState(state);
  const reasons = new Set<string>(['SAME_TICK_ORDER_UNAVAILABLE']);
  const deathsByVictim = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    if (event.kind !== 'PLAYER_DEATH' || !event.targetId) continue;
    const rows = deathsByVictim.get(event.targetId) ?? [];
    rows.push(event);
    deathsByVictim.set(event.targetId, rows);
  }
  for (const [victim, rows] of deathsByVictim) {
    if (rows.length > 1) reasons.add(`DUPLICATE_VICTIM_AT_TICK:${victim}`);
    const applied = applyDeath(state, rows[0]!, teamByPlayer);
    for (const reason of applied.reasons) reasons.add(reason);
  }
  const objectiveKinds = unique(events.map((event) => event.kind).filter((kind) => (
    kind.startsWith('BOMB_') || kind.startsWith('HOSTAGE_')
  )));
  const terminalKinds = objectiveKinds.filter((kind) => kind === 'BOMB_DEFUSED' || kind === 'BOMB_EXPLODED');
  if (terminalKinds.length > 1) {
    state.phase = 'UNKNOWN';
    reasons.add('CONFLICTING_OBJECTIVE_TERMINALS_AT_TICK');
  } else {
    for (const kind of objectiveKinds) {
      const applied = applyObjective(state, kind, evidence.scenario);
      for (const reason of applied.reasons) reasons.add(reason);
    }
  }
  for (const reason of reasons) state.reasons.add(reason);
  return {
    tick: events[0]!.tick,
    order: null,
    ordering: 'ATOMIC_SAME_TICK',
    eventIds: unique(events.map((event) => event.id)),
    actorIds: unique(events.flatMap((event) => event.actorId ? [event.actorId] : [])),
    targetIds: unique(events.flatMap((event) => event.targetId ? [event.targetId] : [])),
    actionTypes: unique(events.map((event) => event.kind)),
    before: gameState(beforeState, teamIds),
    after: gameState(state, teamIds),
    evidenceSource: events.some((event) => event.source === 'PREPARED_SUPPLEMENT')
      ? 'PREPARED_SUPPLEMENT'
      : 'NORMALIZED_EVENT',
    confidence: 'PARTIAL',
    stateChangeConfidence: 'PARTIAL',
    attributionConfidence: 'PARTIAL',
    evidenceAnchorIds: unique(events.map((event) => event.id)),
    uncertaintyReasons: sorted(reasons),
    advantage: null,
    sameTick: {
      eventCount: events.length,
      orderedIntermediateStatesExposed: false,
      atomicFinalStateEquivalent: true,
    },
  };
}

function snapshotDiagnostics(
  tickEvents: readonly TimelineEvent[],
  state: MutableState,
  teamIds: readonly string[],
): string[] {
  const snapshots = new Map<string, Record<string, number>>();
  for (const event of tickEvents) {
    if (!event.aliveByTeamId) continue;
    const ordered = Object.fromEntries(Object.entries(event.aliveByTeamId).sort(([left], [right]) => left.localeCompare(right)));
    snapshots.set(JSON.stringify(ordered), ordered);
  }
  if (snapshots.size === 0) return [];
  if (snapshots.size > 1) return ['CONFLICTING_ALIVE_SNAPSHOTS_AT_TICK'];
  const snapshot = [...snapshots.values()][0]!;
  const current = gameState(state, teamIds);
  const mismatch = teamIds.some((teamId) => {
    const expected = current.exactAliveCountByTeamId[teamId];
    return expected !== null && expected !== undefined && snapshot[teamId] !== expected;
  });
  return mismatch ? ['ALIVE_SNAPSHOT_MISMATCH'] : [];
}

function createClutches(
  roundId: string,
  timeline: readonly RoundTimelineEntry[],
  terminal: VerifiedGameState | null,
  winnerTeamId: string | null,
  teamIds: readonly string[],
): ClutchOpportunity[] {
  const byPlayer = new Map<string, ClutchOpportunity>();
  for (const entry of timeline) {
    if (entry.after.confidence !== 'CONFIRMED') continue;
    for (const teamId of teamIds) {
      const opponents = teamIds.find((candidate) => candidate !== teamId);
      const own = entry.after.alivePlayerIdsByTeamId[teamId] ?? [];
      const enemy = opponents ? entry.after.alivePlayerIdsByTeamId[opponents] ?? [] : [];
      if (own.length !== 1 || enemy.length < 2) continue;
      const playerId = own[0]!;
      if (byPlayer.has(playerId)) continue;
      byPlayer.set(playerId, {
        playerId,
        teamId,
        roundId,
        startedAtTick: entry.tick,
        sourceEventIds: [...entry.eventIds],
        opponentsAtStart: enemy.length,
        subsequentActionEventIds: [],
        outcome: 'CLUTCH_OUTCOME_UNAVAILABLE',
        survived: null,
      });
    }
  }
  for (const opportunity of byPlayer.values()) {
    opportunity.subsequentActionEventIds = unique(timeline
      .filter((entry) => entry.tick >= opportunity.startedAtTick && entry.actorIds.includes(opportunity.playerId))
      .flatMap((entry) => entry.eventIds));
    const aliveAtEnd = terminal?.alivePlayerIdsByTeamId[opportunity.teamId]?.includes(opportunity.playerId);
    const deadAtEnd = terminal !== null && !aliveAtEnd
      && !terminal.unknownPlayerIdsByTeamId[opportunity.teamId]?.includes(opportunity.playerId);
    opportunity.survived = aliveAtEnd === true ? true : deadAtEnd ? false : null;
    if (!winnerTeamId || opportunity.survived === null) {
      opportunity.outcome = 'CLUTCH_OUTCOME_UNAVAILABLE';
    } else if (winnerTeamId === opportunity.teamId && opportunity.survived) {
      opportunity.outcome = 'CLUTCH_WON';
    } else {
      opportunity.outcome = 'CLUTCH_LOST';
    }
  }
  return [...byPlayer.values()].sort((left, right) => left.startedAtTick - right.startedAtTick
    || left.playerId.localeCompare(right.playerId));
}

function survivalFacts(
  match: MatchData,
  round: MatchRound,
  timeline: readonly RoundTimelineEntry[],
  terminal: VerifiedGameState | null,
  clutches: readonly ClutchOpportunity[],
): PlayerSurvivalFact[] {
  const plantTick = timeline.find((entry) => entry.actionTypes.includes('BOMB_PLANTED'))?.tick;
  return match.players.map((player): PlayerSurvivalFact => {
    const alive = terminal?.alivePlayerIdsByTeamId[player.teamId]?.includes(player.id) ?? false;
    const unknown = terminal === null
      || terminal.unknownPlayerIdsByTeamId[player.teamId]?.includes(player.id) === true;
    return {
      playerId: player.id,
      teamId: player.teamId,
      state: unknown ? 'UNKNOWN' : alive ? 'ALIVE_CONFIRMED' : 'DEAD_CONFIRMED',
      roundResult: !round.winnerTeamId ? 'UNKNOWN' : round.winnerTeamId === player.teamId ? 'WIN' : 'LOSS',
      postplantParticipant: plantTick !== undefined && timeline.some((entry) => (
        entry.tick >= plantTick && (entry.actorIds.includes(player.id) || entry.targetIds.includes(player.id))
      )),
      clutchContext: clutches.some((opportunity) => opportunity.playerId === player.id),
      equipmentSaved: null,
      equipmentSavedReason: 'INVENTORY_TRANSITION_UNAVAILABLE',
    };
  }).sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function usefulLostActions(
  timeline: readonly RoundTimelineEntry[],
  winnerTeamId: string | null,
  teamByPlayer: ReadonlyMap<string, string>,
): UsefulLostRoundAction[] {
  if (!winnerTeamId) return [];
  return timeline.flatMap((entry): UsefulLostRoundAction[] => {
    const advantage = entry.advantage;
    const eventId = entry.eventIds.length === 1 ? entry.eventIds[0] : undefined;
    const playerId = entry.actorIds.length === 1 ? entry.actorIds[0] : undefined;
    if (entry.attributionConfidence !== 'CONFIRMED'
      || !advantage || !eventId || !playerId || teamByPlayer.get(playerId) === winnerTeamId) return [];
    const kind = advantage.createdAdvantage ? 'CREATED_ADVANTAGE' as const
      : advantage.createdEquality ? 'RESTORED_EQUALITY' as const
        : advantage.reducedDisadvantage ? 'REDUCED_DISADVANTAGE' as const
          : null;
    return kind ? [{
      playerId,
      eventId,
      tick: entry.tick,
      beforeDifference: advantage.beforeDifference,
      afterDifference: advantage.afterDifference,
      kind,
    }] : [];
  });
}

function coverageStatus(
  evidence: RoundStartEvidence,
  timeline: readonly RoundTimelineEntry[],
  initial: VerifiedGameState,
  diagnostics: readonly string[],
): TimelineCoverageStatus {
  if (!evidence.boundaryComplete) return 'EXCLUDED';
  if (initial.confidence === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (initial.confidence !== 'CONFIRMED' || diagnostics.length > 0
    || timeline.some((entry) => entry.confidence !== 'CONFIRMED')) return 'PARTIAL';
  return 'COMPLETE';
}

function roundTimeline(
  match: MatchData,
  round: MatchRound,
  evidence: RoundStartEvidence,
  roundEvents: readonly TimelineEvent[],
  duplicateIds: ReadonlySet<string>,
  excludedNonLiveEventIds: string[],
  excludedOutsideBoundaryEventIds: string[],
): ResearchRoundTimeline {
  const teamIds = match.teams.map((team) => team.id).sort((left, right) => left.localeCompare(right));
  const teamByPlayer = new Map(match.players.map((player) => [player.id, player.teamId]));
  const initial = initialState(match, evidence);
  let state = initial.state;
  const initialContract = gameState(state, teamIds);
  const timeline: RoundTimelineEntry[] = [{
    tick: evidence.liveStart,
    order: null,
    ordering: 'BOUNDARY',
    eventIds: [],
    actorIds: [],
    targetIds: [],
    actionTypes: ['ROUND_START'],
    before: initialContract,
    after: initialContract,
    evidenceSource: 'PARTICIPATION_SIDECAR',
    confidence: initialContract.confidence,
    stateChangeConfidence: initialContract.confidence,
    attributionConfidence: 'UNAVAILABLE',
    evidenceAnchorIds: [],
    uncertaintyReasons: initial.reasons,
    advantage: null,
    sameTick: null,
  }];
  const diagnostics = new Set(initial.reasons);
  const candidates = roundEvents.filter((event) => {
    if (duplicateIds.has(event.id)) return false;
    if (event.source === 'NORMALIZED_EVENT' && event.phase !== 'LIVE') {
      excludedNonLiveEventIds.push(event.id);
      return false;
    }
    if (event.tick < evidence.liveStart || event.tick > evidence.liveEnd) {
      excludedOutsideBoundaryEventIds.push(event.id);
      return false;
    }
    return true;
  }).sort((left, right) => left.tick - right.tick
    || (left.rowIndex ?? Number.MAX_SAFE_INTEGER) - (right.rowIndex ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id));
  const byTick = new Map<number, TimelineEvent[]>();
  for (const event of candidates) {
    const rows = byTick.get(event.tick) ?? [];
    rows.push(event);
    byTick.set(event.tick, rows);
  }
  for (const tickEvents of byTick.values()) {
    const rowIndexes = tickEvents.map((event) => event.rowIndex);
    const ordered = tickEvents.length === 1
      || rowIndexes.every((value): value is number => value !== null)
      && new Set(rowIndexes).size === rowIndexes.length;
    if (ordered) {
      const beforeTick = cloneState(state);
      const firstEntryIndex = timeline.length;
      for (const event of tickEvents) {
        const before = cloneState(state);
        const applied = applyEvent(state, event, evidence.scenario, teamByPlayer);
        const entry = eventEntry(event, before, state, applied, teamIds, teamByPlayer);
        timeline.push(entry);
        for (const reason of entry.uncertaintyReasons) diagnostics.add(reason);
      }
      if (tickEvents.length > 1) {
        const atomicState = cloneState(beforeTick);
        applyAtomicTick(tickEvents, atomicState, evidence, teamIds, teamByPlayer);
        const sequentialFinal = gameState(state, teamIds);
        const atomicFinal = gameState(atomicState, teamIds);
        const equivalent = JSON.stringify({
          alive: sequentialFinal.alivePlayerIdsByTeamId,
          unknown: sequentialFinal.unknownPlayerIdsByTeamId,
          phase: sequentialFinal.phase,
        }) === JSON.stringify({
          alive: atomicFinal.alivePlayerIdsByTeamId,
          unknown: atomicFinal.unknownPlayerIdsByTeamId,
          phase: atomicFinal.phase,
        });
        for (const entry of timeline.slice(firstEntryIndex)) {
          entry.sameTick = {
            eventCount: tickEvents.length,
            orderedIntermediateStatesExposed: true,
            atomicFinalStateEquivalent: equivalent,
          };
        }
      }
    } else {
      const entry = applyAtomicTick(tickEvents, state, evidence, teamIds, teamByPlayer);
      timeline.push(entry);
      for (const reason of entry.uncertaintyReasons) diagnostics.add(reason);
    }
    for (const reason of snapshotDiagnostics(tickEvents, state, teamIds)) {
      diagnostics.add(reason);
      state.reasons.add(reason);
    }
  }
  state = cloneState(state);
  state.phase = 'ROUND_ENDED';
  const terminal = gameState(state, teamIds);
  const clutches = createClutches(round.id, timeline, terminal, round.winnerTeamId, teamIds);
  const finalDiagnostics = sorted(diagnostics);
  return {
    matchId: match.matchId,
    roundId: round.id,
    ordinal: round.ordinal,
    teamIds,
    sideByTeamId: { ...round.sideByTeamId },
    roundStartTick: evidence.liveStart,
    roundEndTick: evidence.liveEnd,
    boundaryEvidence: {
      source: 'PARTICIPATION_SIDECAR',
      complete: evidence.boundaryComplete,
      reasons: [...evidence.boundaryReasons].sort(),
    },
    coverageStatus: coverageStatus(evidence, timeline, initialContract, finalDiagnostics),
    timeline,
    terminalState: {
      winnerTeamId: round.winnerTeamId,
      outcomeEvidence: round.winnerTeamId ? 'NORMALIZED_ROUND_WINNER' : 'UNAVAILABLE',
      state: terminal,
    },
    clutchOpportunities: clutches,
    survival: survivalFacts(match, round, timeline, terminal, clutches),
    usefulLostRoundActions: usefulLostActions(timeline, round.winnerTeamId, teamByPlayer),
    diagnostics: finalDiagnostics,
  };
}

export function roundStartEvidenceFromSidecars(
  participation: ParticipationSidecar,
  prepared?: C2S2PreparedSidecar,
): RoundStartEvidence[] {
  const byRound = new Map<string, ParticipationSidecar['participation']>();
  for (const row of participation.participation) {
    const rows = byRound.get(row.roundId) ?? [];
    rows.push(row);
    byRound.set(row.roundId, rows);
  }
  return [...byRound.entries()].map(([roundId, rows]): RoundStartEvidence => {
    const boundaries = new Map(rows.map((row) => [
      `${row.boundary.liveStart}:${row.boundary.liveEnd}:${row.boundary.complete}`,
      row.boundary,
    ]));
    const boundary = boundaries.size === 1 ? [...boundaries.values()][0]! : null;
    const preparedRound = prepared?.roundEvidence.find((row) => row.roundId === roundId);
    const supplemental = prepared?.hostageActions
      .filter((row) => row.roundId === roundId)
      .map((row, index): TimelineSupplementalEvent => ({
        id: `hostage:${roundId}:${row.tick}:${row.playerId}:${row.hostage ?? 'unknown'}:${index}`,
        roundId,
        tick: row.tick,
        kind: row.event === 'hostage_rescued' ? 'HOSTAGE_RESCUED' : 'HOSTAGE_HURT',
        actorId: row.playerId,
      })) ?? [];
    const preparedStart = preparedRound?.boundary.liveStart;
    const preparedEnd = preparedRound?.boundary.liveEnd;
    return {
      roundId,
      liveStart: boundary?.liveStart ?? (typeof preparedStart === 'number' ? preparedStart : 0),
      liveEnd: boundary?.liveEnd ?? (typeof preparedEnd === 'number' ? preparedEnd : 0),
      boundaryComplete: boundary?.complete === true && preparedRound?.clean !== false,
      boundaryReasons: unique([
        ...(boundary ? [] : ['PARTICIPATION_BOUNDARY_DISAGREEMENT']),
        ...(preparedRound?.reasons ?? []),
      ]),
      scenario: participation.scenario,
      players: rows.map((row) => ({
        playerId: row.playerId,
        classification: row.classification,
        counted: row.counted,
        startObserved: row.evidence.startObserved,
        startAlive: row.evidence.startAlive,
      })),
      supplementalEvents: supplemental,
    };
  }).sort((left, right) => left.liveStart - right.liveStart || left.roundId.localeCompare(right.roundId));
}

export function reconstructRoundTimelines(
  match: MatchData,
  evidenceRows: readonly RoundStartEvidence[],
): RoundTimelineContract {
  const evidenceByRound = new Map(evidenceRows.map((row) => [row.roundId, row]));
  const supplemental = evidenceRows.flatMap((row) => supplementalEvents(row.supplementalEvents));
  const allEvents = [...normalizedEvents(match), ...supplemental];
  const eventsById = new Map<string, TimelineEvent[]>();
  const eventsByRound = new Map<string, TimelineEvent[]>();
  for (const event of allEvents) {
    const sameId = eventsById.get(event.id) ?? [];
    sameId.push(event);
    eventsById.set(event.id, sameId);
    const sameRound = eventsByRound.get(event.roundId) ?? [];
    sameRound.push(event);
    eventsByRound.set(event.roundId, sameRound);
  }
  const duplicateIds = new Set([...eventsById]
    .filter(([, events]) => events.length > 1)
    .map(([id]) => id));
  const excludedNonLiveEventIds: string[] = [];
  const excludedOutsideBoundaryEventIds: string[] = [];
  const knownRoundIds = new Set(match.rounds.map((round) => round.id));
  const unknownRoundEventIds = allEvents
    .filter((event) => !knownRoundIds.has(event.roundId))
    .map((event) => event.id);
  const rounds = [...match.rounds]
    .sort((left, right) => left.ordinal - right.ordinal)
    .flatMap((round): ResearchRoundTimeline[] => {
      const evidence = evidenceByRound.get(round.id);
      if (!evidence) return [];
      return [roundTimeline(
        match,
        round,
        evidence,
        eventsByRound.get(round.id) ?? [],
        duplicateIds,
        excludedNonLiveEventIds,
        excludedOutsideBoundaryEventIds,
      )];
    });
  return {
    schemaVersion: H2_E4_TIMELINE_CONTRACT_VERSION,
    matchId: match.matchId,
    rounds,
    diagnostics: {
      rejectedDuplicateEventIds: sorted(duplicateIds),
      excludedNonLiveEventIds: unique(excludedNonLiveEventIds),
      excludedOutsideBoundaryEventIds: unique(excludedOutsideBoundaryEventIds),
      unknownRoundEventIds: unique(unknownRoundEventIds),
    },
  };
}
