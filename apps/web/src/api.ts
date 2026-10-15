import { jobDtoSchema, matchDataSchema, type JobDto, type MatchData } from '@who-ruined/contracts';

async function json<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? JSON.stringify((body as { error: unknown }).error) : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parse(body);
}
export async function uploadDemo(file: File): Promise<{ matchId: string; jobId: string; duplicate: boolean }> {
  const form = new FormData(); form.append('demo', file);
  return json(await fetch('/api/v1/matches', { method: 'POST', body: form }), (value) => value as { matchId: string; jobId: string; duplicate: boolean });
}
export async function getJob(id: string): Promise<JobDto> { return json(await fetch(`/api/v1/jobs/${encodeURIComponent(id)}`), (value) => jobDtoSchema.parse(value)); }
export async function getMatch(id: string): Promise<MatchData> { return json(await fetch(`/api/v1/matches/${encodeURIComponent(id)}`), (value) => matchDataSchema.parse(value)); }
export async function getMatches(): Promise<{ items: Array<{ id: string; map: string | null; status: string; quality: string | null; createdAt: string }> }> { return json(await fetch('/api/v1/matches'), (value) => value as { items: Array<{ id: string; map: string | null; status: string; quality: string | null; createdAt: string }> }); }
