import type { NormalizationInput } from '@who-ruined/match-domain';
import { z } from 'zod';
import { asBoolean, asInteger, asNumber, asText } from './decoding.js';
import {
  loadNativeParser,
  PARSER_LIBRARY_VERSION,
  rowsSchema,
  toRows,
  type DemoParserPort,
  type UnknownRow,
} from './native-adapter.js';

export const NORMALIZER_VERSION = 'm2.5-0.2.0';

export interface ParsedDemoSnapshot {
  header: Record<string, unknown>;
  players: UnknownRow[];
  eventNames: string[];
  events: UnknownRow[];
  ticks: UnknownRow[];
}

export const parsedDemoSnapshotSchema = z.object({
  header: z.record(z.string(), z.unknown()),
  players: rowsSchema,
  eventNames: z.array(z.string()),
  events: rowsSchema,
  ticks: rowsSchema,
});

export function validateParsedDemoSnapshot(value: unknown): ParsedDemoSnapshot {
  return parsedDemoSnapshotSchema.parse(value);
}

export interface NormalizationInputRequest {
  matchId: string;
  fileSha256: string;
  snapshot: ParsedDemoSnapshot;
  normalizedAt?: string;
}

export function toNormalizationInput(request: NormalizationInputRequest): NormalizationInput {
  const { snapshot } = request;
  return {
    matchId: request.matchId,
    fileSha256: request.fileSha256,
    map: asText(snapshot.header, ['map_name']),
    players: snapshot.players.map((row, sourceRowIndex) => ({
      sourceRowIndex,
      candidateSteamId: asText(row, ['steamid','steam_id','user_steamid']),
      displayName: asText(row, ['name','player_name']),
      initialSideNumber: asInteger(row, ['team_number','team_num']),
    })),
    events: snapshot.events.map((row, sourceRowIndex) => ({
      sourceRowIndex,
      name: asText(row, ['event_name','event','name']),
      tick: asInteger(row, ['tick']),
      attackerPlayerId: asText(row, ['attacker_steamid']),
      actorPlayerId: asText(row, ['attacker_steamid','user_steamid','userid_steamid','thrower_steamid']),
      subjectPlayerId: asText(row, ['user_steamid','victim_steamid']),
      targetPlayerId: asText(row, ['victim_steamid','user_steamid']),
      assisterPlayerId: asText(row, ['assister_steamid']),
      weapon: asText(row, ['weapon']),
      headshot: asBoolean(row, ['headshot']),
      assistedFlash: asBoolean(row, ['assistedflash']),
      healthAfter: asInteger(row, ['health']),
      armorAfter: asInteger(row, ['armor']),
      rawHealthDamage: asInteger(row, ['dmg_health']),
      rawArmorDamage: asInteger(row, ['dmg_armor']),
      hitgroup: asInteger(row, ['hitgroup']),
      blindDuration: asNumber(row, ['blind_duration']),
      entityId: asInteger(row, ['entityid']),
      site: asText(row, ['site']),
      hasKit: asBoolean(row, ['haskit']),
      x: asNumber(row, ['x']),
      y: asNumber(row, ['y']),
      z: asNumber(row, ['z']),
    })),
    ticks: snapshot.ticks.map((row, sourceRowIndex) => {
      const rawGameTime = row.game_time;
      const rawInventory = row.inventory;
      return {
        sourceRowIndex,
        tick: asInteger(row, ['tick']),
        gameTime: typeof rawGameTime === 'number' && Number.isFinite(rawGameTime) ? rawGameTime : null,
        playerId: asText(row, ['steamid','steam_id']),
        sideNumber: asInteger(row, ['team_num','team_number']),
        teamScore: asInteger(row, ['team_rounds_total','team_score']),
        isAlive: asBoolean(row, ['is_alive']),
        equipmentValue: asInteger(row, ['current_equip_value']),
        inventory: Array.isArray(rawInventory) ? rawInventory.filter((item): item is string => typeof item === 'string') : [],
        armorValue: asInteger(row, ['armor_value']),
        hasHelmet: asBoolean(row, ['has_helmet']),
        hasDefuser: asBoolean(row, ['has_defuser']),
        cash: asInteger(row, ['cash']),
      };
    }),
    provenance: {
      parser: '@laihoe/demoparser2',
      parserVersion: PARSER_LIBRARY_VERSION,
    },
    ...(request.normalizedAt === undefined ? {} : { normalizedAt: request.normalizedAt }),
  };
}

const requiredCandidates = ['round_prestart','round_poststart','round_start','round_freeze_end','round_end','round_officially_ended','cs_win_panel_match','player_connect','player_connect_full','player_disconnect','player_death','player_hurt','bomb_beginplant','bomb_begindefuse','bomb_planted','bomb_defused','bomb_exploded','player_blind','flashbang_detonate','hegrenade_detonate','smokegrenade_detonate','inferno_startburn','inferno_expire'];

export function parseDemoSnapshot(path: string, parser: DemoParserPort = loadNativeParser()): ParsedDemoSnapshot {
  const rawHeader = parser.parseHeader(path);
  const header = rawHeader && typeof rawHeader === 'object' ? rawHeader as Record<string, unknown> : {};
  const players = toRows(parser.parsePlayerInfo(path));
  const listed = parser.listGameEvents(path);
  const eventNames = Array.isArray(listed) ? listed.filter((value): value is string => typeof value === 'string') : [];
  const selected = requiredCandidates.filter((eventName) => eventNames.includes(eventName));
  const events = selected.length ? toRows(parser.parseEvents(path, selected)) : [];
  const ticksToRead = [...new Set(events
    .map((row) => asInteger(row, ['tick']))
    .filter((tick): tick is number => tick !== null))].sort((a, b) => a - b);
  const tickProps = ['team_num','team_name','team_rounds_total','is_alive','game_time','current_equip_value','inventory','armor_value','has_helmet','has_defuser','cash'];
  const ticks = ticksToRead.length ? toRows(parser.parseTicks(path, tickProps, ticksToRead)) : [];
  return { header, players, eventNames, events, ticks };
}
