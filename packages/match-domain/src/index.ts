import { createHash } from 'node:crypto';
import type { MatchData, MatchRound, Quality } from '@who-ruined/contracts';
import { asInteger, asText, PARSER_LIBRARY_VERSION, type ParsedDemoSnapshot, type UnknownRow } from '@who-ruined/parser-adapter';

export type MatchId = string & { readonly __matchId: unique symbol };
export type TeamId = string & { readonly __teamId: unique symbol };
export type PlayerId = string & { readonly __playerId: unique symbol };
export type RoundId = string & { readonly __roundId: unique symbol };
export type EventId = string & { readonly __eventId: unique symbol };

export function stableTeamId(playerIds: readonly string[]): TeamId {
  const roster = [...playerIds].sort().join('\n');
  return `team_${createHash('sha256').update(roster).digest('hex').slice(0, 16)}` as TeamId;
}

export function eventId(roundOrdinal: number, eventName: string, parserRowIndex: number): EventId {
  return `${roundOrdinal}:${eventName}:${parserRowIndex}` as EventId;
}

export interface ValidationResult { quality: Quality; issues: Array<{ code: string; message: string; roundOrdinal?: number }>; validRoundCount: number }

export function validateMatch(match: MatchData): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  if (match.teams.length !== 2) issues.push({ code: 'TEAM_COUNT', message: 'Требуются ровно две стабильные команды.' });
  const playerIds = new Set(match.players.map((player) => player.id));
  if (playerIds.size !== match.players.length) issues.push({ code: 'DUPLICATE_PLAYER', message: 'Идентификаторы игроков не уникальны.' });
  for (const team of match.teams) {
    if (team.playerIds.length !== 5 || new Set(team.playerIds).size !== 5) issues.push({ code: 'ROSTER_NOT_5V5', message: `Состав ${team.id} не содержит пять уникальных игроков.` });
  }
  let priorEnd = -1;
  let expectedOrdinal = 1;
  for (const round of [...match.rounds].sort((a, b) => a.ordinal - b.ordinal)) {
    validateRound(round, priorEnd, expectedOrdinal, issues);
    priorEnd = Math.max(priorEnd, round.endTick);
    expectedOrdinal += 1;
  }
  const validRoundCount = match.rounds.filter((round) => round.isValid && !issues.some((issue) => issue.roundOrdinal === round.ordinal)).length;
  const ratio = match.rounds.length === 0 ? 0 : validRoundCount / match.rounds.length;
  const quality: Quality = issues.length === 0 && validRoundCount >= 8 && ratio >= 0.9 ? 'VALID' : 'PARTIAL';
  return { quality, issues, validRoundCount };
}

function validateRound(round: MatchRound, priorEnd: number, expectedOrdinal: number, issues: ValidationResult['issues']): void {
  const add = (code: string, message: string): void => { issues.push({ code, message, roundOrdinal: round.ordinal }); };
  if (round.ordinal !== expectedOrdinal) add('ROUND_ORDINAL', 'Нарушена непрерывная нумерация раундов.');
  if (round.startTick <= priorEnd) add('ROUND_OVERLAP', 'Интервалы раундов пересекаются.');
  if (round.startTick > round.endTick) add('ROUND_INTERVAL', 'Начало раунда позже конца.');
  if (round.freezeEndTick !== null && (round.freezeEndTick < round.startTick || round.freezeEndTick > round.endTick)) add('FREEZE_INTERVAL', 'Некорректная граница freeze time.');
  if (!round.winnerTeamId || !round.winnerSide) add('ROUND_WINNER_MISSING', 'Победитель раунда не подтверждён.');
  if (round.winnerTeamId) {
    const teams = Object.keys(round.scoreBefore).sort();
    if (teams.length !== 2 || Object.keys(round.scoreAfter).sort().join('|') !== teams.join('|')) add('SCORE_TEAMS', 'Счёт не привязан к двум стабильным командам.');
    for (const teamId of teams) {
      const delta = (round.scoreAfter[teamId] ?? -1) - (round.scoreBefore[teamId] ?? -1);
      if (delta !== (teamId === round.winnerTeamId ? 1 : 0)) add('SCORE_MISMATCH', 'Переход счёта не соответствует победителю раунда.');
    }
    if (round.sideByTeamId[round.winnerTeamId] !== round.winnerSide) add('SIDE_WINNER_MISMATCH', 'Сторона победителя не соответствует стабильной команде.');
  }
}

export interface NormalizeInput { matchId: string; fileSha256: string; snapshot: ParsedDemoSnapshot; normalizedAt?: string }

export function normalizeSnapshot(input: NormalizeInput): MatchData {
  const issues: MatchData['qualityIssues'] = [];
  const parsedPlayers = input.snapshot.players.map((row, index) => {
    const steamId = asText(row, ['steamid','steam_id','user_steamid']);
    const sideNumber = asInteger(row, ['team_number','team_num']);
    return { id: steamId ?? `anon_${index + 1}`, steamId, displayName: asText(row, ['name','player_name']) ?? `Игрок ${index + 1}`, sideNumber };
  });
  const groups = new Map<number, typeof parsedPlayers>();
  for (const player of parsedPlayers) {
    if (player.sideNumber === null) continue;
    const group = groups.get(player.sideNumber) ?? [];
    group.push(player); groups.set(player.sideNumber, group);
  }
  const rosterGroups = [...groups.entries()].filter(([, players]) => players.length === 5).sort(([a], [b]) => a - b);
  if (rosterGroups.length !== 2 || parsedPlayers.length !== 10) issues.push({ code: 'ROSTER_UNVERIFIED', message: 'Парсер не подтвердил два стабильных состава 5×5.' });
  const teams = rosterGroups.map(([, roster], index) => ({ id: stableTeamId(roster.map((p) => p.id)), playerIds: roster.map((p) => p.id).sort(), label: `Команда ${index + 1}` }));
  const playerToTeam = new Map(teams.flatMap((team) => team.playerIds.map((playerId) => [playerId, team.id] as const)));
  const players = parsedPlayers.filter((player) => playerToTeam.has(player.id)).map((player) => ({ id: player.id, steamId: player.steamId, displayName: player.displayName, teamId: playerToTeam.get(player.id) ?? '' }));
  const byKind = (name: string): UnknownRow[] => input.snapshot.events.filter((row) => asText(row, ['event_name','event','name']) === name);
  const starts = byKind('round_start').map((row) => asInteger(row, ['tick'])).filter((v): v is number => v !== null).sort((a,b) => a-b);
  const ends = byKind('round_end').map((row, rowIndex) => ({ row, rowIndex, tick: asInteger(row, ['tick']) })).filter((v): v is { row: UnknownRow; rowIndex: number; tick: number } => v.tick !== null).sort((a,b) => a.tick-b.tick);
  const freezes = byKind('round_freeze_end').map((row) => asInteger(row, ['tick'])).filter((v): v is number => v !== null).sort((a,b) => a-b);
  const rounds: MatchRound[] = [];
  const priorScore = Object.fromEntries(teams.map((team) => [team.id, 0]));
  for (let index = 0; index < ends.length; index += 1) {
    const end = ends[index]; if (!end) continue;
    const ordinal = index + 1;
    const startTick = [...starts].reverse().find((tick) => tick <= end.tick && (index === 0 || tick > (ends[index - 1]?.tick ?? -1)));
    const winnerNumber = asInteger(end.row, ['winner','winner_team_num','winner_team_number']);
    const tickRows = input.snapshot.ticks.filter((row) => asInteger(row, ['tick']) === end.tick);
    const stableSide = new Map<string, 'T'|'CT'>();
    const scoreAfter = { ...priorScore };
    for (const tickRow of tickRows) {
      const steamId = asText(tickRow, ['steamid','steam_id']);
      const teamId = steamId ? playerToTeam.get(steamId) : undefined;
      const sideNumber = asInteger(tickRow, ['team_num','team_number']);
      const teamScore = asInteger(tickRow, ['team_rounds_total','team_score']);
      if (teamId && (sideNumber === 2 || sideNumber === 3)) stableSide.set(teamId, sideNumber === 2 ? 'T' : 'CT');
      if (teamId && teamScore !== null) scoreAfter[teamId] = Math.max(scoreAfter[teamId] ?? 0, teamScore);
    }
    const winnerSide = winnerNumber === 2 ? 'T' : winnerNumber === 3 ? 'CT' : null;
    const winnerTeamId = winnerSide ? [...stableSide.entries()].find(([, side]) => side === winnerSide)?.[0] ?? null : null;
    const roundIssues: string[] = [];
    if (startTick === undefined) roundIssues.push('ROUND_START_MISSING');
    if (stableSide.size !== 2) roundIssues.push('SIDE_MAPPING_MISSING');
    if (!winnerTeamId) roundIssues.push('WINNER_TEAM_MISSING');
    const scoreChanged = teams.length === 2 && teams.every((team) => (scoreAfter[team.id] ?? 0) - (priorScore[team.id] ?? 0) === (team.id === winnerTeamId ? 1 : 0));
    if (!scoreChanged) roundIssues.push('SCORE_TRANSITION_UNVERIFIED');
    rounds.push({ id: `round_${ordinal}`, ordinal, startTick: startTick ?? end.tick, freezeEndTick: freezes.find((tick) => tick >= (startTick ?? end.tick) && tick <= end.tick) ?? null, endTick: end.tick, winnerTeamId, winnerSide, sideByTeamId: Object.fromEntries(stableSide), scoreBefore: { ...priorScore }, scoreAfter: { ...scoreAfter }, isValid: roundIssues.length === 0, issues: roundIssues });
    for (const team of teams) priorScore[team.id] = scoreAfter[team.id] ?? priorScore[team.id] ?? 0;
  }
  if (rounds.length === 0) issues.push({ code: 'ROUNDS_MISSING', message: 'Не удалось восстановить игровые раунды.' });
  const match: MatchData = {
    schemaVersion: '1', matchId: input.matchId, fileSha256: input.fileSha256,
    map: asText(input.snapshot.header, ['map_name']), tickRate: null, teams, players, rounds, events: [], quality: 'PARTIAL', qualityIssues: issues,
    provenance: { parser: '@laihoe/demoparser2', parserVersion: PARSER_LIBRARY_VERSION, normalizedAt: input.normalizedAt ?? new Date().toISOString() }
  };
  const validation = validateMatch(match);
  return { ...match, quality: validation.quality, qualityIssues: [...issues, ...validation.issues] };
}
