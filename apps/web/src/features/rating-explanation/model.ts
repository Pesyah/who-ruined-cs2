import type { MatchData, ScoringReport } from '@who-ruined/contracts';
import { ApiClientError } from '../../shared/api/transport.js';
import type { MatchAnalytics } from '../../entities/match/types.js';

/** Adds backend evidence episodes only. Legacy report scores and awards are deliberately ignored. */
export function presentEvidenceReport(match: MatchData, base: MatchAnalytics | undefined, report: ScoringReport): MatchAnalytics {
  if (report.matchId !== match.matchId || report.players.length !== match.players.length) throw new ApiClientError('INVALID_RESPONSE');
  const roster = new Map(match.players.map((player) => [player.id, player.teamId]));
  const roundIds = new Set(match.rounds.map((round) => round.id));
  const seen = new Set<string>();
  for (const player of report.players) {
    if (seen.has(player.playerId) || roster.get(player.playerId) !== player.teamId) throw new ApiClientError('INVALID_RESPONSE');
    seen.add(player.playerId);
  }
  if (report.episodes.some((episode) => !roster.has(episode.playerId) || !roundIds.has(episode.roundId))) throw new ApiClientError('INVALID_RESPONSE');
  if (report.rounds.some((round) => !roundIds.has(round.roundId) || round.players.some((player) => !roster.has(player.playerId)))) {
    throw new ApiClientError('INVALID_RESPONSE');
  }
  const fallback: MatchAnalytics = {
    players: {}, mvp: { state: 'unavailable' }, whoRuined: { state: 'unavailable' },
    moments: null, roundImpact: null, insights: null,
  };
  return {
    ...(base ?? fallback),
    moments: report.episodes.map((episode) => ({
      id: episode.id, playerId: episode.playerId, roundId: episode.roundId, tick: episode.startTick,
      endTick: episode.endTick,
      category: episode.kind === 'HIGHLIGHT' ? 'positive' : episode.kind === 'ANTI_HIGHLIGHT' ? 'mistake' : 'fact',
      kind: episode.type, importance: (episode.significance ?? 0) >= 2 ? 'high' : 'medium',
      confidence: episode.confidence, evidenceStrength: episode.evidenceStrength, observedFacts: episode.observedFacts,
    })),
    roundImpact: report.rounds.map((round) => ({
      roundId: round.roundId,
      players: Object.fromEntries(round.players.map((player) => [player.playerId, player.net])),
    })),
  };
}
