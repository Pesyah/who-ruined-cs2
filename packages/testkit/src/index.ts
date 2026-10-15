import type { MatchData, MatchRound, Side } from '@who-ruined/contracts';

export function syntheticValidMatch(): MatchData {
  const a = Array.from({ length: 5 }, (_, i) => `7656119800000000${i}`);
  const b = Array.from({ length: 5 }, (_, i) => `7656119800000001${i}`);
  const teamA = 'team_synthetic_a';
  const teamB = 'team_synthetic_b';
  const scores: Record<string, number> = { [teamA]: 0, [teamB]: 0 };
  const rounds: MatchRound[] = [];
  for (let ordinal = 1; ordinal <= 13; ordinal += 1) {
    const winnerTeamId = ordinal <= 7 ? teamA : teamB;
    const before = { ...scores };
    scores[winnerTeamId] = (scores[winnerTeamId] ?? 0) + 1;
    const swapped = ordinal >= 7;
    const sideA: Side = swapped ? 'CT' : 'T';
    const sideB: Side = swapped ? 'T' : 'CT';
    rounds.push({ id: `round_${ordinal}`, ordinal, startTick: ordinal * 1000, freezeEndTick: ordinal * 1000 + 100, endTick: ordinal * 1000 + 900, winnerTeamId, winnerSide: winnerTeamId === teamA ? sideA : sideB, sideByTeamId: { [teamA]: sideA, [teamB]: sideB }, scoreBefore: before, scoreAfter: { ...scores }, isValid: true, issues: [] });
  }
  return {
    schemaVersion: '1', matchId: 'synthetic_match', fileSha256: 'a'.repeat(64), map: 'de_synthetic', tickRate: 64,
    teams: [{ id: teamA, playerIds: a, label: 'Команда A' }, { id: teamB, playerIds: b, label: 'Команда B' }],
    players: [...a.map((id, i) => ({ id, steamId: id, displayName: `A${i + 1}`, teamId: teamA })), ...b.map((id, i) => ({ id, steamId: id, displayName: `B${i + 1}`, teamId: teamB }))],
    rounds, events: [], quality: 'VALID', qualityIssues: [], provenance: { parser: 'synthetic-test-fixture', parserVersion: '0', normalizedAt: '2026-10-15T00:00:00.000Z' }
  };
}
