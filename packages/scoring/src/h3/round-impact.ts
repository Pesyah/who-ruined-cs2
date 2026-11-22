import type { ResearchRoundTimeline, RoundTimelineEntry } from './round-timeline.js';

export const ROUND_IMPACT_RULES = Object.freeze({
  clutchMinimumOpponents: 2, clutchWinBase: 0.08, clutchExtraOpponent: 0.02,
  recoveryMinimumEliminations: 2, recoveryBase: 0.035, recoveryExtraElimination: 0.0125,
  recoveryParity: 0.01, recoveryCap: 0.08, roundCap: 0.14, matchAverageCap: 0.08,
  postplantConversion: 0.065,
});

export type RoundImpactAward = {
  playerId: string;
  teamId: string;
  roundId: string;
  kind: 'CLUTCH_CONVERSION' | 'DEFICIT_RECOVERY_SEQUENCE' | 'POSTPLANT_CONVERSION';
  entryEventIds: string[];
  transitionEventIds: string[];
  objectiveCompletionEventId: string | null;
  terminalWinnerTeamId: string;
  startAgainst: number;
  startAllies: number;
  endDifference: number;
  requestedPoints: number;
  awardedPoints: number;
};

export function hasRoundImpactCoverage(round: ResearchRoundTimeline): boolean {
  return new Set(round.teamIds).size === 2 && round.teamIds.length === 2
    && round.boundaryEvidence.complete && round.coverageStatus === 'COMPLETE'
    && round.terminalState.outcomeEvidence === 'NORMALIZED_ROUND_WINNER'
    && round.terminalState.state?.confidence === 'CONFIRMED'
    && round.terminalState.winnerTeamId !== null && round.teamIds.includes(round.terminalState.winnerTeamId);
}

function transitionFor(entry: RoundTimelineEntry, playerId: string, teamId: string): boolean {
  return entry.attributionConfidence === 'CONFIRMED' && entry.eventIds.length === 1
    && entry.actionTypes.length === 1 && entry.actionTypes[0] === 'PLAYER_DEATH'
    && entry.actorIds.length === 1 && entry.actorIds[0] === playerId
    && entry.advantage?.actorTeamId === teamId && entry.advantage.relation === 'ENEMY';
}

function award(
  round: ResearchRoundTimeline, playerId: string, teamId: string, enemyId: string,
  kind: RoundImpactAward['kind'], start: RoundTimelineEntry['before'], entryEventIds: string[],
  transitions: RoundTimelineEntry[], requestedPoints: number,
  objectiveCompletionEventId: string | null = null,
): RoundImpactAward {
  return {
    playerId, teamId, roundId: round.roundId, kind, entryEventIds,
    transitionEventIds: [...new Set(transitions.flatMap((entry) => entry.eventIds))],
    objectiveCompletionEventId,
    terminalWinnerTeamId: round.terminalState.winnerTeamId!,
    startAgainst: start.exactAliveCountByTeamId[enemyId]!,
    startAllies: start.exactAliveCountByTeamId[teamId]!,
    endDifference: transitions.at(-1)!.advantage!.afterDifference,
    requestedPoints, awardedPoints: Math.min(requestedPoints, ROUND_IMPACT_RULES.roundCap),
  };
}

function postplantConversion(round: ResearchRoundTimeline, playerId: string, teamId: string, enemyId: string): RoundImpactAward | null {
  if (round.terminalState.winnerTeamId !== teamId || !round.terminalState.state?.alivePlayerIdsByTeamId[teamId]?.includes(playerId)) return null;
  const side = round.sideByTeamId[teamId];
  if (side !== 'CT' && side !== 'T') return null;
  const plants = round.timeline.filter((entry) => entry.actionTypes.includes('BOMB_PLANTED'));
  const terminals = round.timeline.filter((entry) => entry.actionTypes.includes('BOMB_DEFUSED') || entry.actionTypes.includes('BOMB_EXPLODED'));
  const plant = plants.length === 1 ? plants[0] : undefined;
  const terminal = terminals.length === 1 ? terminals[0] : undefined;
  if (!plant || !terminal || plant.eventIds.length !== 1 || plant.attributionConfidence !== 'CONFIRMED'
    || terminal.eventIds.length !== 1 || terminal.stateChangeConfidence !== 'CONFIRMED') return null;
  const isOwnedDefuse = side === 'CT' && terminal.actionTypes[0] === 'BOMB_DEFUSED'
    && terminal.attributionConfidence === 'CONFIRMED' && terminal.actorIds[0] === playerId;
  const isOwnedPlantConversion = side === 'T' && plant.actorIds[0] === playerId && terminal.actionTypes[0] === 'BOMB_EXPLODED';
  if (!isOwnedDefuse && !isOwnedPlantConversion) return null;
  const transitions = round.timeline.filter((entry) => entry.tick > plant.tick && entry.tick < terminal.tick
    && (entry.before.phase === 'POSTPLANT' || entry.before.phase === 'DEFUSING')
    && transitionFor(entry, playerId, teamId) && entry.advantage!.beforeDifference < 0
    && entry.advantage!.afterDifference > entry.advantage!.beforeDifference);
  const start = transitions[0];
  if (!start) return null;
  return award(round, playerId, teamId, enemyId, 'POSTPLANT_CONVERSION', start.before,
    plant.eventIds, transitions, ROUND_IMPACT_RULES.postplantConversion, terminal.eventIds[0]!);
}

function clutchConversion(round: ResearchRoundTimeline, playerId: string, teamId: string, enemyId: string): RoundImpactAward | null {
  const clutch = round.clutchOpportunities.find((entry) => entry.playerId === playerId && entry.teamId === teamId
    && entry.outcome === 'CLUTCH_WON' && entry.survived === true && entry.opponentsAtStart >= ROUND_IMPACT_RULES.clutchMinimumOpponents);
  if (!clutch || round.terminalState.winnerTeamId !== teamId || !round.terminalState.state?.alivePlayerIdsByTeamId[teamId]?.includes(playerId)) return null;
  const start = round.timeline.findIndex((entry) => entry.tick === clutch.startedAtTick
    && entry.after.confidence === 'CONFIRMED' && entry.after.alivePlayerIdsByTeamId[teamId]?.length === 1
    && entry.after.alivePlayerIdsByTeamId[teamId]?.[0] === playerId
    && entry.after.exactAliveCountByTeamId[enemyId] === clutch.opponentsAtStart
    && entry.eventIds.length === clutch.sourceEventIds.length && entry.eventIds.every((id) => clutch.sourceEventIds.includes(id)));
  if (start < 0) return null;
  const transitions = round.timeline.slice(start + 1).filter((entry) => transitionFor(entry, playerId, teamId));
  if (transitions.length === 0) return null;
  const points = ROUND_IMPACT_RULES.clutchWinBase
    + ROUND_IMPACT_RULES.clutchExtraOpponent * (clutch.opponentsAtStart - ROUND_IMPACT_RULES.clutchMinimumOpponents);
  return award(round, playerId, teamId, enemyId, 'CLUTCH_CONVERSION', round.timeline[start]!.after, clutch.sourceEventIds, transitions, points);
}

function recoverySequence(round: ResearchRoundTimeline, playerId: string, teamId: string, enemyId: string): RoundImpactAward | null {
  let best: RoundImpactAward | null = null;
  let chain: RoundTimelineEntry[] = [];
  let previousStateAnchors: string[] = [];
  let entryEventIds: string[] = [];
  for (const entry of round.timeline) {
    const ours = entry.before.exactAliveCountByTeamId[teamId];
    const theirs = entry.before.exactAliveCountByTeamId[enemyId];
    const populationChanged = ours !== entry.after.exactAliveCountByTeamId[teamId]
      || theirs !== entry.after.exactAliveCountByTeamId[enemyId];
    const advance = transitionFor(entry, playerId, teamId) && entry.advantage!.beforeDifference < 0
      && entry.advantage!.afterDifference > entry.advantage!.beforeDifference;
    if (advance) {
      if (chain.length === 0) entryEventIds = previousStateAnchors;
      chain.push(entry);
      const first = chain[0]!;
      const solo = first.before.exactAliveCountByTeamId[teamId] === 1;
      const parity = entry.advantage!.afterDifference >= 0;
      if (chain.length >= ROUND_IMPACT_RULES.recoveryMinimumEliminations && (solo || parity)) {
        const points = Math.min(ROUND_IMPACT_RULES.recoveryCap, ROUND_IMPACT_RULES.recoveryBase
          + ROUND_IMPACT_RULES.recoveryExtraElimination * (chain.length - ROUND_IMPACT_RULES.recoveryMinimumEliminations)
          + (parity ? ROUND_IMPACT_RULES.recoveryParity : 0));
        if (!best || points > best.requestedPoints) {
          best = award(round, playerId, teamId, enemyId, 'DEFICIT_RECOVERY_SEQUENCE', first.before, entryEventIds, chain, points);
        }
      }
      if (parity) chain = [];
    } else if (populationChanged || entry.actionTypes.includes('PLAYER_DEATH')) {
      chain = [];
    }
    if (populationChanged || entry.ordering === 'BOUNDARY') previousStateAnchors = entry.evidenceAnchorIds;
  }
  return best;
}

export function evaluateRoundImpact(round: ResearchRoundTimeline, playerId: string, teamId: string): RoundImpactAward | null {
  if (!hasRoundImpactCoverage(round) || !round.teamIds.includes(teamId)) return null;
  const enemyId = round.teamIds.find((id) => id !== teamId)!;
  return clutchConversion(round, playerId, teamId, enemyId) ?? postplantConversion(round, playerId, teamId, enemyId)
    ?? recoverySequence(round, playerId, teamId, enemyId);
}
