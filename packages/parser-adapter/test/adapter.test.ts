import { describe, expect, it } from "vitest";
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  asInteger,
  asText,
  decodeParticipationRow,
  isSource2Header,
  parseDemoMatchSnapshot,
  parseDemoReplaySnapshot,
  parseDemoSnapshot,
  readParticipationEvidenceFacts,
  readPreparedParticipationSupplementRows,
  sanitizeSchema,
  toRows,
  validateParsedMatchSnapshotEnvelope,
  validateSource2HeaderInChild,
  type DemoParserPort,
} from "../src/index.js";

describe("parser boundary", () => {
  it('bounds the isolated native header probe', async () => {
    const child = fileURLToPath(new URL(
      './fixtures/header-status-child.mjs',
      import.meta.url,
    ));
    await expect(validateSource2HeaderInChild('C:\\synthetic-valid.dem', 1000, child))
      .resolves.toBe('VALID');
    await expect(validateSource2HeaderInChild('C:\\synthetic-invalid.dem', 1000, child))
      .resolves.toBe('INVALID');
    await expect(validateSource2HeaderInChild('C:\\synthetic-hang.dem', 50, child))
      .resolves.toBe('UNREADABLE');
  });
  it("normalizes array-of-structs and struct-of-arrays", () => {
    expect(toRows([{ tick: 1, name: "x" }])).toEqual([{ tick: 1, name: "x" }]);
    expect(toRows({
      tick: [1, 2],
      name: ["x", "y"],
      steamid: [76561198000000001n, null],
    })).toEqual([
      { tick: 1, name: "x", steamid: "76561198000000001" },
      { tick: 2, name: "y", steamid: null },
    ]);
  });
  it("uses aliases and never substitutes missing data with zero", () => {
    expect(asInteger({ team_number: 3 }, ["team_num", "team_number"])).toBe(3);
    expect(asInteger({}, ["tick"])).toBeNull();
    expect(asText({ steamid: 765n }, ["steamid"])).toBe("765");
  });
  it("decodes participation aliases inside the parser boundary", () => {
    expect(decodeParticipationRow({
      event: "player_spawn",
      tick: "42",
      xuid: 76561198000000000n,
      steam_id: "76561198000000001",
      user_steamid: "76561198000000002",
      hostage: 7,
      is_alive: "true",
    })).toEqual({
      eventName: "player_spawn",
      tick: 42,
      candidateSteamIds: [
        "76561198000000002",
        "76561198000000000",
        "76561198000000001",
      ],
      tickSteamId: "76561198000000001",
      actorSteamId: "76561198000000002",
      hostageId: "7",
      isAlive: true,
    });
    expect(decodeParticipationRow({ tick: "-1" }).tick).toBe(-1);
  });
  it("recognizes only Source 2 headers and emits schema only", () => {
    expect(isSource2Header({ demo_version_name: "valve_demo_2" })).toBe(true);
    expect(isSource2Header({ demo_version_name: "valve_demo" })).toBe(false);
    expect(sanitizeSchema([{ name: "secret", tick: 3 }])).toEqual({
      count: 1,
      columns: ["name", "tick"],
    });
  });
  it("calls the five required APIs once and limits tick reads to selected event ticks", () => {
    const calls: string[] = [];
    const parser: DemoParserPort = {
      parseHeader: () => {
        calls.push("parseHeader");
        return { demo_version_name: "valve_demo_2" };
      },
      parsePlayerInfo: () => {
        calls.push("parsePlayerInfo");
        return [];
      },
      listGameEvents: () => {
        calls.push("listGameEvents");
        return ["round_end", "player_death"];
      },
      parseEvents: (_path, names) => {
        calls.push(`parseEvents:${names.join(",")}`);
        return [
          { event_name: "round_end", tick: 200 },
          { event_name: "player_death", tick: 150 },
        ];
      },
      parseTicks: (_path, props, ticks) => {
        calls.push(`parseTicks:${props.join(",")}:${ticks?.join(",")}`);
        return [];
      },
    };
    const snapshot = parseDemoSnapshot("synthetic.dem", parser);
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.ticks.every((row) => row.cash === undefined)).toBe(true);
    expect(calls).toEqual([
      "parseHeader",
      "parsePlayerInfo",
      "listGameEvents",
      "parseEvents:round_end,player_death",
      "parseTicks:team_num,team_name,team_rounds_total,is_alive,game_time,current_equip_value,inventory,armor_value,has_helmet,has_defuser,cash:150,200",
    ]);
  });
  it('extracts ordered participation rows into the validated parse envelope', () => {
    const calls: string[] = [];
    const parser: DemoParserPort = {
      parseHeader: () => ({ demo_version_name: 'valve_demo_2' }),
      parsePlayerInfo: () => [],
      listGameEvents: () => [
        'round_end',
        'player_disconnect',
        'player_spawn',
        'player_team',
        'hostage_hurt',
        'hostage_rescued',
      ],
      parseEvents: (_path, names) => {
        calls.push(names.join(','));
        if (names.includes('round_end')) return [{ event_name: 'round_end', tick: 200 }];
        if (names.includes('player_disconnect')) {
          return [
            { event_name: 'player_spawn', tick: 100, user_steamid: 'a' },
            { event_name: 'player_disconnect', tick: 100, user_steamid: 'b' },
          ];
        }
        if (names.includes('player_spawn')) {
          return [
            { event_name: 'player_team', tick: 100, user_steamid: 'b' },
            { event_name: 'player_spawn', tick: 100, user_steamid: 'a' },
          ];
        }
        return [
          { event_name: 'hostage_rescued', tick: 150, user_steamid: 'b' },
          { event_name: 'hostage_hurt', tick: 150, user_steamid: 'a' },
        ];
      },
      parseTicks: () => [],
    };

    const envelope = parseDemoMatchSnapshot('synthetic.dem', parser);

    expect(envelope.schemaVersion).toBe('parser-match-snapshot@1');
    expect(envelope.participation.evidence.lifecycleRows.map((row) => row.event_name))
      .toEqual(['player_spawn', 'player_disconnect']);
    expect(envelope.participation.prepared.lifecycleRows.map((row) => row.event_name))
      .toEqual(['player_team', 'player_spawn']);
    expect(envelope.participation.prepared.hostageRows.map((row) => row.event_name))
      .toEqual(['hostage_rescued', 'hostage_hurt']);
    expect(readParticipationEvidenceFacts(
      envelope.snapshot,
      envelope.participation,
    ).lifecycle.map((row) => ({ tick: row.tick, sourceRowIndex: row.sourceRowIndex })))
      .toEqual([
        { tick: 100, sourceRowIndex: 0 },
        { tick: 100, sourceRowIndex: 1 },
      ]);
    expect(calls).toEqual([
      'round_end,player_disconnect',
      'player_disconnect,player_spawn,player_team',
      'player_spawn,player_team',
      'hostage_hurt,hostage_rescued',
    ]);
  });
  it('preserves JSON-safe participation evidence through the child artifact format', () => {
    const steamId = 76561198000000001n;
    const parser: DemoParserPort = {
      parseHeader: () => ({ map_name: 'de_synthetic' }),
      parsePlayerInfo: () => [],
      listGameEvents: () => [
        'round_end',
        'player_disconnect',
        'player_spawn',
        'player_team',
        'hostage_hurt',
      ],
      parseEvents: (_path, names) => {
        if (names.includes('round_end')) {
          return [{ event_name: 'round_end', tick: 100 }];
        }
        if (names.includes('hostage_hurt')) {
          return [{ event_name: 'hostage_hurt', tick: 100, user_steamid: steamId }];
        }
        if (names.includes('player_disconnect')) {
          return [
            {
              event_name: 'player_spawn',
              tick: 100,
              user_steamid: steamId,
              omitted: undefined,
              explicitNull: null,
              metadata: { label: 'nested', omitted: undefined },
            },
            { event_name: 'player_disconnect', tick: 100, user_steamid: null },
          ];
        }
        return [
          { event_name: 'player_team', tick: 100, user_steamid: steamId },
          { event_name: 'player_spawn', tick: 100, user_steamid: null },
        ];
      },
      parseTicks: () => [{
        tick: 100,
        steamid: steamId,
        is_alive: true,
        team_num: 2,
      }],
    };

    const envelope = parseDemoMatchSnapshot('synthetic.dem', parser);
    const roundTripped = validateParsedMatchSnapshotEnvelope(JSON.parse(
      gunzipSync(gzipSync(JSON.stringify(envelope))).toString('utf8'),
    ) as unknown);
    const originalFacts = readParticipationEvidenceFacts(
      envelope.snapshot,
      envelope.participation,
    );
    const roundTrippedFacts = readParticipationEvidenceFacts(
      roundTripped.snapshot,
      roundTripped.participation,
    );
    const firstEvidenceRow = roundTripped.participation.evidence.lifecycleRows[0];

    expect(firstEvidenceRow?.user_steamid).toBe(steamId.toString());
    expect(firstEvidenceRow).not.toHaveProperty('omitted');
    expect(firstEvidenceRow).toHaveProperty('explicitNull', null);
    expect(firstEvidenceRow?.metadata).toEqual({ label: 'nested' });
    expect(roundTrippedFacts).toEqual(originalFacts);
    expect(roundTrippedFacts.lifecycle.map(({ steamId: id, sourceRowIndex }) => ({
      steamId: id,
      sourceRowIndex,
    }))).toEqual([
      { steamId: steamId.toString(), sourceRowIndex: 0 },
      { steamId: null, sourceRowIndex: 1 },
    ]);
    expect(roundTrippedFacts.ticks[0]?.steamId).toBe(steamId.toString());
    expect(readPreparedParticipationSupplementRows(roundTripped.participation))
      .toEqual(readPreparedParticipationSupplementRows(envelope.participation));
  });
  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite parser row number %s instead of serializing it as null',
    (value) => {
      expect(() => toRows([{ tick: value }])).toThrow('PARSER_ROW_NOT_JSON_SAFE');
    },
  );
  it('rejects undefined array entries that JSON would silently replace with null', () => {
    expect(() => toRows([{ inventory: ['ak47', undefined] }]))
      .toThrow('PARSER_ROW_NOT_JSON_SAFE');
  });
  it('supports an explicit empty participation supplement', () => {
    const parser: DemoParserPort = {
      parseHeader: () => ({}),
      parsePlayerInfo: () => [],
      listGameEvents: () => [],
      parseEvents: () => { throw new Error('no event parse expected'); },
      parseTicks: () => [],
    };

    expect(parseDemoMatchSnapshot('synthetic.dem', parser).participation).toEqual({
      schemaVersion: 'parser-participation-supplement@1',
      evidence: { lifecycleEventNames: [], lifecycleRows: [] },
      prepared: { lifecycleRows: [], hostageRows: [] },
    });
  });
  it("samples replay at 4 Hz, includes round boundaries, and requests only factual player state", () => {
    let requestedProps: string[] = [];
    let requestedTicks: number[] = [];
    const parser: DemoParserPort = {
      parseHeader: () => ({}), parsePlayerInfo: () => [], listGameEvents: () => [], parseEvents: () => [],
      parseTicks: (_path, props, ticks) => {
        requestedProps = props;
        requestedTicks = ticks ?? [];
        return requestedTicks.map((tick) => ({ tick, steamid: '76561198000000000', X: -10, Y: 20, Z: 3, yaw: null, pitch: null, is_alive: true }));
      }
    };
    const snapshot = parseDemoReplaySnapshot('synthetic.dem', {
      tickRate: 64, sampleRateHz: 4,
      rounds: [{ id: 'round_1', ordinal: 1, startTick: 100, freezeEndTick: 110, endTick: 140 }]
    }, parser);
    expect(requestedProps).toEqual(['X','Y','Z','yaw','pitch','steamid','is_alive']);
    expect(requestedTicks).toEqual([100, 110, 116, 132, 140]);
    expect(snapshot.rows[0]).toMatchObject({ X: -10, Y: 20, is_alive: true });
  });
});
