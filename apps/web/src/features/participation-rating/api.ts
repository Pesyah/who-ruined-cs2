import { activeParticipationRatingReportSchema, type ActiveParticipationRatingReport } from '@who-ruined/contracts';
import { ApiClientError, request } from '../../shared/api/transport.js';

export async function getActiveParticipationRating(id: string, signal: AbortSignal): Promise<ActiveParticipationRatingReport> {
  const result = await request(`/api/v1/matches/${encodeURIComponent(id)}/experimental-participation-rating`, { signal }, activeParticipationRatingReportSchema);
  if (result.matchId !== id) throw new ApiClientError('INVALID_RESPONSE');
  return result;
}
