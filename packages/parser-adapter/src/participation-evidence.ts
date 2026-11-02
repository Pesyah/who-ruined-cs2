import { asText } from './decoding.js';
import { loadNativeParser, toRows, type UnknownRow } from './native-adapter.js';
import type { ParsedDemoSnapshot } from './normalization-mapping.js';

export interface ParticipationLifecycleFact {
  steamId: string | null;
  tick: number | null;
  kind: string | null;
  sourceRowIndex: number;
}

export interface ParticipationEvidenceFacts {
  lifecycleEventNames: string[];
  lifecycle: ParticipationLifecycleFact[];
  ticks: Array<{
    tick: number | null;
    steamId: string | null;
    isAlive: boolean | null;
    sideNumber: number | null;
  }>;
}

function participationBoolean(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function participationInteger(row: UnknownRow, aliases: string[]): number | null {
  for (const key of aliases) {
    const value = row[key];
    if (Number.isInteger(value)) return value as number;
    if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  }
  return null;
}

export function readParticipationEvidenceFacts(
  path: string,
  snapshot: ParsedDemoSnapshot,
): ParticipationEvidenceFacts {
  const lifecycleEventNames = [
    'player_disconnect',
    'player_connect',
    'player_connect_full',
    'player_spawn',
    'player_team',
  ].filter((name) => snapshot.eventNames.includes(name));
  const parser = loadNativeParser();
  const rows = lifecycleEventNames.length
    ? toRows(parser.parseEvents(path, lifecycleEventNames))
    : [];
  return {
    lifecycleEventNames,
    lifecycle: rows.map((row, sourceRowIndex) => ({
      steamId: asText(row, [
        'user_steamid',
        'xuid',
        'steamid',
        'steam_id',
        'userid_steamid',
        'player_steamid',
        'networkid',
      ]),
      tick: participationInteger(row, ['tick']),
      kind: asText(row, ['event_name', 'event', 'name']),
      sourceRowIndex,
    })),
    ticks: snapshot.ticks.map((row) => ({
      tick: participationInteger(row, ['tick']),
      steamId: asText(row, ['steamid', 'steam_id']),
      isAlive: participationBoolean(row.is_alive),
      sideNumber: participationInteger(row, ['team_num']),
    })),
  };
}

export interface DecodedParticipationRow {
  eventName: string | null;
  tick: number | null;
  candidateSteamIds: string[];
  tickSteamId: string | null;
  actorSteamId: string | null;
  hostageId: string | null;
  isAlive: boolean | null;
}

export function decodeParticipationRow(row: UnknownRow): DecodedParticipationRow {
  return {
    eventName: asText(row, ['event_name', 'event', 'name']),
    tick: participationInteger(row, ['tick']),
    candidateSteamIds: [
      'user_steamid',
      'xuid',
      'steamid',
      'steam_id',
      'userid_steamid',
      'player_steamid',
      'networkid',
    ].flatMap((key) => {
      const value = asText(row, [key]);
      return value === null ? [] : [value];
    }),
    tickSteamId: asText(row, ['steamid', 'steam_id']),
    actorSteamId: asText(row, ['user_steamid', 'steamid']),
    hostageId: asText(row, ['hostage']),
    isAlive: participationBoolean(row.is_alive),
  };
}

export function readPreparedParticipationSupplementRows(
  path: string,
  snapshot: ParsedDemoSnapshot,
): { lifecycleRows: UnknownRow[]; hostageRows: UnknownRow[] } {
  const parser = loadNativeParser();
  const lifecycleNames = ['player_spawn', 'player_team']
    .filter((name) => snapshot.eventNames.includes(name));
  const hostageNames = snapshot.eventNames
    .filter((name) => name.startsWith('hostage_'));
  return {
    lifecycleRows: lifecycleNames.length
      ? toRows(parser.parseEvents(path, lifecycleNames))
      : [],
    hostageRows: hostageNames.length
      ? toRows(parser.parseEvents(path, hostageNames))
      : [],
  };
}
