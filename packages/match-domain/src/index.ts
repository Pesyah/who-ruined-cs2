import { createHash } from 'node:crypto';
import type { MatchData, MatchEvent, MatchRound, Quality, Side } from '@who-ruined/contracts';
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
  const deathsByRoundPlayer = new Set<string>();
  for (const event of match.events.filter((item) => item.kind === 'PLAYER_DEATH')) {
    if (!event.targetId) {
      issues.push({ code: 'DEATH_VICTIM_MISSING', message: 'Событие смерти не привязано к игроку.' });
      continue;
    }
    const key = `${event.roundId}:${event.targetId}`;
    if (deathsByRoundPlayer.has(key)) issues.push({ code: 'DUPLICATE_ROUND_DEATH', message: 'Игрок умер более одного раза в раунде без поддержки respawn.' });
    deathsByRoundPlayer.add(key);
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

function uniqueTicks(rows: UnknownRow[]): number[] {
  return [...new Set(rows.map((row) => asInteger(row, ['tick'])).filter((tick): tick is number => tick !== null))].sort((a, b) => a - b);
}

interface TeamTickState { sideByTeamId: Record<string, Side>; scoreByTeamId: Record<string, number>; issues: string[] }

function readTeamTickState(tick: number, tickRows: UnknownRow[], teams: MatchData['teams'], playerToTeam: Map<string, string>): TeamTickState {
  const rows = tickRows.filter((row) => asInteger(row, ['tick']) === tick);
  const sideValues = new Map<string, Set<Side>>();
  const scoreValues = new Map<string, Set<number>>();
  const members = new Map<string, Set<string>>();
  for (const row of rows) {
    const playerId = asText(row, ['steamid','steam_id']);
    const teamId = playerId ? playerToTeam.get(playerId) : undefined;
    if (!teamId || !playerId) continue;
    const sideNumber = asInteger(row, ['team_num','team_number']);
    const score = asInteger(row, ['team_rounds_total','team_score']);
    const side = sideNumber === 2 ? 'T' : sideNumber === 3 ? 'CT' : null;
    if (side) { const values = sideValues.get(teamId) ?? new Set<Side>(); values.add(side); sideValues.set(teamId, values); }
    if (score !== null) { const values = scoreValues.get(teamId) ?? new Set<number>(); values.add(score); scoreValues.set(teamId, values); }
    const playerIds = members.get(teamId) ?? new Set<string>(); playerIds.add(playerId); members.set(teamId, playerIds);
  }
  const issues: string[] = [];
  const sideByTeamId: Record<string, Side> = {};
  const scoreByTeamId: Record<string, number> = {};
  for (const team of teams) {
    const teamSides = sideValues.get(team.id) ?? new Set<Side>();
    const teamScores = scoreValues.get(team.id) ?? new Set<number>();
    if ((members.get(team.id)?.size ?? 0) !== 5) issues.push('TICK_ROSTER_NOT_5');
    if (teamSides.size !== 1) issues.push('SIDE_MAPPING_MISSING'); else sideByTeamId[team.id] = [...teamSides][0] as Side;
    if (teamScores.size !== 1) issues.push('TEAM_SCORE_MISSING'); else scoreByTeamId[team.id] = [...teamScores][0] as number;
  }
  if (new Set(Object.values(sideByTeamId)).size !== 2) issues.push('SIDES_NOT_OPPOSED');
  return { sideByTeamId, scoreByTeamId, issues: [...new Set(issues)] };
}

function asBoolean(row: UnknownRow, aliases: string[]): boolean | null {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
    if (value === 0 || value === 1) return value === 1;
  }
  return null;
}

export function isCreditedAssist(assisterId: string | null, targetId: string | null, playerToTeam: ReadonlyMap<string, string>): boolean {
  return assisterId !== null && targetId !== null && playerToTeam.get(assisterId) !== undefined && playerToTeam.get(assisterId) !== playerToTeam.get(targetId);
}

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
  const explicitStarts = uniqueTicks([...byKind('round_prestart'), ...byKind('round_start')]);
  const freezes = uniqueTicks(byKind('round_freeze_end'));
  const legacyEnds = uniqueTicks(byKind('round_end'));
  const officialEnds = uniqueTicks(byKind('round_officially_ended'));
  const matchEnds = uniqueTicks(byKind('cs_win_panel_match'));
  const ends = officialEnds.length > 0 ? [...officialEnds] : [...legacyEnds];
  const lastFreeze = freezes.at(-1);
  const finalMatchEnd = matchEnds.find((tick) => lastFreeze !== undefined && tick > lastFreeze);
  if (finalMatchEnd !== undefined && !ends.some((tick) => tick >= finalMatchEnd) && ends.length < freezes.length) ends.push(finalMatchEnd);
  ends.sort((a, b) => a - b);
  const rounds: MatchRound[] = [];
  const priorScore = Object.fromEntries(teams.map((team) => [team.id, 0]));
  for (let index = 0; index < freezes.length; index += 1) {
    const freezeTick = freezes[index]; if (freezeTick === undefined) continue;
    const nextFreeze = freezes[index + 1] ?? Number.POSITIVE_INFINITY;
    const endTick = ends.find((tick) => tick >= freezeTick && tick < nextFreeze);
    if (endTick === undefined) {
      issues.push({ code: 'ROUND_END_MISSING', message: 'Для live-раунда не найден подтверждённый конец.', roundOrdinal: index + 1 });
      continue;
    }
    const ordinal = index + 1;
    const priorEnd = rounds.at(-1)?.endTick ?? -1;
    const phaseStart = [...explicitStarts].reverse().find((tick) => tick <= freezeTick && tick >= priorEnd);
    const startTick = Math.max(phaseStart ?? freezeTick, priorEnd + 1);
    const beforeState = readTeamTickState(freezeTick, input.snapshot.ticks, teams, playerToTeam);
    const afterState = readTeamTickState(endTick, input.snapshot.ticks, teams, playerToTeam);
    const scoreAfter = { ...afterState.scoreByTeamId };
    const winners = teams.filter((team) => (scoreAfter[team.id] ?? -1) - (priorScore[team.id] ?? -1) === 1 && teams.every((other) => other.id === team.id || (scoreAfter[other.id] ?? -1) === (priorScore[other.id] ?? -1)));
    const winnerTeamId = winners.length === 1 ? winners[0]?.id ?? null : null;
    const winnerSide = winnerTeamId ? beforeState.sideByTeamId[winnerTeamId] ?? null : null;
    const roundIssues: string[] = [];
    if (phaseStart === undefined) roundIssues.push('ROUND_START_MISSING');
    roundIssues.push(...beforeState.issues, ...afterState.issues);
    if (teams.some((team) => beforeState.scoreByTeamId[team.id] !== priorScore[team.id])) roundIssues.push('SCORE_BEFORE_MISMATCH');
    const sidesStay = teams.every((team) => beforeState.sideByTeamId[team.id] === afterState.sideByTeamId[team.id]);
    const sidesSwapAtBoundary = teams.every((team) => beforeState.sideByTeamId[team.id] !== afterState.sideByTeamId[team.id]);
    if (!sidesStay && !sidesSwapAtBoundary) roundIssues.push('SIDE_MAPPING_INCONSISTENT_AT_BOUNDARY');
    if (!winnerTeamId) roundIssues.push('WINNER_TEAM_MISSING');
    const scoreChanged = teams.length === 2 && teams.every((team) => (scoreAfter[team.id] ?? 0) - (priorScore[team.id] ?? 0) === (team.id === winnerTeamId ? 1 : 0));
    if (!scoreChanged) roundIssues.push('SCORE_TRANSITION_UNVERIFIED');
    const uniqueRoundIssues = [...new Set(roundIssues)];
    rounds.push({ id: `round_${ordinal}`, ordinal, startTick, freezeEndTick: freezeTick, endTick, winnerTeamId, winnerSide, sideByTeamId: beforeState.sideByTeamId, scoreBefore: { ...priorScore }, scoreAfter: { ...scoreAfter }, isValid: uniqueRoundIssues.length === 0, issues: uniqueRoundIssues });
    for (const team of teams) priorScore[team.id] = scoreAfter[team.id] ?? priorScore[team.id] ?? 0;
  }
  if (rounds.length === 0) issues.push({ code: 'ROUNDS_MISSING', message: 'Не удалось восстановить игровые раунды.' });
  if (rounds.length !== freezes.length) issues.push({ code: 'ROUND_COVERAGE', message: `Восстановлено ${rounds.length} из ${freezes.length} live-раундов.` });
  const normalizedEvents: MatchEvent[] = [];
  let unassignedDeaths = 0;
  input.snapshot.events.forEach((row, parserRowIndex) => {
    const eventName = asText(row, ['event_name','event','name']);
    if (eventName !== 'player_death') return;
    const tick = asInteger(row, ['tick']);
    if (tick === null) { unassignedDeaths += 1; return; }
    const round = rounds.find((candidate) => tick >= (candidate.freezeEndTick ?? candidate.startTick) && tick <= candidate.endTick);
    if (!round) { unassignedDeaths += 1; return; }
    const rawActor = asText(row, ['attacker_steamid']);
    const rawTarget = asText(row, ['user_steamid','victim_steamid']);
    const rawAssister = asText(row, ['assister_steamid']);
    const actorId = rawActor && playerToTeam.has(rawActor) ? rawActor : null;
    const targetId = rawTarget && playerToTeam.has(rawTarget) ? rawTarget : null;
    const candidateAssisterId = rawAssister && playerToTeam.has(rawAssister) ? rawAssister : null;
    const assisterId = isCreditedAssist(candidateAssisterId, targetId, playerToTeam) ? candidateAssisterId : null;
    const friendlyFire = actorId !== null && targetId !== null && actorId !== targetId && playerToTeam.get(actorId) === playerToTeam.get(targetId);
    normalizedEvents.push({
      id: eventId(round.ordinal, eventName, parserRowIndex), kind: 'PLAYER_DEATH', roundId: round.id, tick, actorId, targetId, assisterId,
      attrs: { friendlyFire, suicide: actorId !== null && actorId === targetId, headshot: asBoolean(row, ['headshot']), assistedFlash: asBoolean(row, ['assistedflash']), weapon: asText(row, ['weapon']) },
      source: { eventName, rowIndex: parserRowIndex }
    });
  });
  if (unassignedDeaths > 0) issues.push({ code: 'UNASSIGNED_DEATH_EVENTS', message: `${unassignedDeaths} событий смерти не удалось однозначно привязать к live-раунду.` });
  const match: MatchData = {
    schemaVersion: '1', matchId: input.matchId, fileSha256: input.fileSha256,
    map: asText(input.snapshot.header, ['map_name']), tickRate: null, teams, players, rounds, events: normalizedEvents, quality: 'PARTIAL', qualityIssues: issues,
    provenance: { parser: '@laihoe/demoparser2', parserVersion: PARSER_LIBRARY_VERSION, normalizedAt: input.normalizedAt ?? new Date().toISOString() }
  };
  const validation = validateMatch(match);
  return { ...match, quality: validation.quality, qualityIssues: [...issues, ...validation.issues] };
}
