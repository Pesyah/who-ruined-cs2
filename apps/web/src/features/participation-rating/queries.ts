import { useQuery } from '@tanstack/react-query';
import type { MatchData } from '@who-ruined/contracts';
import { ApiClientError } from '../../shared/api/transport.js';
import { getActiveParticipationRating } from './api.js';

export const participationRatingKey = (matchId: string | undefined) => ['active-participation-rating', matchId] as const;

function retryRating(count: number, error: unknown): boolean {
  return !(error instanceof ApiClientError && [404, 409, 422].includes(error.status)) && count < 1;
}

export function useParticipationRating(match: MatchData | undefined) {
  return useQuery({
    queryKey: participationRatingKey(match?.matchId),
    enabled: !!match,
    queryFn: ({ signal }) => {
      if (!match) throw new Error('A match is required');
      return getActiveParticipationRating(match.matchId, signal);
    },
    staleTime: 60_000,
    retry: retryRating,
  });
}
