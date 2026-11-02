import { useQuery } from '@tanstack/react-query';
import type { MatchData } from '@who-ruined/contracts';
import { presentAnalytics } from '../../entities/match/adapter.js';
import { ApiClientError } from '../../shared/api/transport.js';
import { getMatch, getMatchAnalytics } from './api.js';

export const matchReportKeys = {
  match: (matchId: string) => ['match', matchId] as const,
  analytics: (matchId: string | undefined) => ['analytics', matchId] as const,
};

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: matchReportKeys.match(matchId),
    queryFn: ({ signal }) => getMatch(matchId, signal),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAnalytics(match: MatchData | undefined) {
  return useQuery({
    queryKey: matchReportKeys.analytics(match?.matchId),
    enabled: !!match,
    queryFn: async ({ signal }) => {
      if (!match) throw new Error('A match is required');
      return presentAnalytics(match, await getMatchAnalytics(match.matchId, signal));
    },
    staleTime: 60_000,
    retry: (count, error) => !(error instanceof ApiClientError && [404, 409].includes(error.status)) && count < 1,
  });
}
