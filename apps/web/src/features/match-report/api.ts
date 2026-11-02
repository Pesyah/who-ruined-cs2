import { matchAnalyticsSchema, matchDataSchema, scoringReportSchema, type MatchData, type ScoringReport } from '@who-ruined/contracts';
import { ApiClientError, request } from '../../shared/api/transport.js';

export async function getMatch(id: string, signal: AbortSignal): Promise<MatchData> {
  const result = await request(`/api/v1/matches/${encodeURIComponent(id)}`, { signal }, matchDataSchema);
  if (result.matchId !== id) throw new ApiClientError('INVALID_RESPONSE');
  return result;
}

export async function getMatchAnalytics(id: string, signal: AbortSignal) {
  const result = await request(`/api/v1/matches/${encodeURIComponent(id)}/analytics`, { signal }, matchAnalyticsSchema);
  if (result.matchId !== id) throw new ApiClientError('INVALID_RESPONSE');
  return result;
}

export async function getScoringReport(id: string, signal: AbortSignal): Promise<ScoringReport> {
  const result = await request(`/api/v1/matches/${encodeURIComponent(id)}/report`, { signal }, scoringReportSchema);
  if (result.matchId !== id) throw new ApiClientError('INVALID_RESPONSE');
  return result;
}
