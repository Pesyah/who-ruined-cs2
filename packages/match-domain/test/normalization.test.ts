import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from '../src/index.js';

describe('conservative normalization', () => {
  it('does not guess absent rosters or rounds', () => {
    const match = normalizeSnapshot({ matchId: 'm', fileSha256: 'b'.repeat(64), normalizedAt: '2026-10-15T00:00:00.000Z', snapshot: { header: { map_name: 'de_test' }, players: [], eventNames: [], events: [], ticks: [] } });
    expect(match.quality).toBe('PARTIAL');
    expect(match.qualityIssues.map((issue) => issue.code)).toContain('ROSTER_UNVERIFIED');
    expect(match.qualityIssues.map((issue) => issue.code)).toContain('ROUNDS_MISSING');
  });
  it('preserves stable roster identities across a synthetic side switch and validates score transitions', () => {
    const rosterA = Array.from({ length: 5 }, (_, index) => `7656119800000010${index}`);
    const rosterB = Array.from({ length: 5 }, (_, index) => `7656119800000020${index}`);
    const players = [...rosterA.map((steamid, index) => ({ steamid, name: `A${index}`, team_number: 2 })), ...rosterB.map((steamid, index) => ({ steamid, name: `B${index}`, team_number: 3 }))];
    const events: Array<Record<string, unknown>> = [];
    const ticks: Array<Record<string, unknown>> = [];
    let scoreA = 0; let scoreB = 0;
    for (let ordinal = 1; ordinal <= 8; ordinal += 1) {
      const start = ordinal * 1000; const end = start + 900; const swapped = ordinal >= 5;
      const sideA = swapped ? 3 : 2; const sideB = swapped ? 2 : 3;
      for (const steamid of rosterA) ticks.push({ tick: start + 100, game_time: (start + 100) / 64, steamid, team_num: sideA, team_rounds_total: scoreA });
      for (const steamid of rosterB) ticks.push({ tick: start + 100, game_time: (start + 100) / 64, steamid, team_num: sideB, team_rounds_total: scoreB });
      const aWins = ordinal <= 5; if (aWins) scoreA += 1; else scoreB += 1;
      events.push({ event_name: 'round_start', tick: start }, { event_name: 'round_freeze_end', tick: start + 100 }, { event_name: 'round_end', tick: end, winner: aWins ? sideA : sideB });
      // At halftime demoparser2 may expose the new sides on the prior round's
      // official boundary tick. A complete two-team swap is valid there.
      const endSideA = ordinal === 4 ? 3 : sideA; const endSideB = ordinal === 4 ? 2 : sideB;
      for (const steamid of rosterA) ticks.push({ tick: end, game_time: end / 64, steamid, team_num: endSideA, team_rounds_total: scoreA });
      for (const steamid of rosterB) ticks.push({ tick: end, game_time: end / 64, steamid, team_num: endSideB, team_rounds_total: scoreB });
    }
    events.push(
      { event_name: 'player_death', tick: 5050, attacker_steamid: rosterA[0], user_steamid: rosterA[0], weapon: 'world' },
      { event_name: 'player_hurt', tick: 5200, attacker_steamid: rosterA[1], user_steamid: rosterB[1], dmg_health: 37, health: 63, weapon: 'hegrenade' },
      { event_name: 'smokegrenade_detonate', tick: 5300, user_steamid: rosterA[2], entityid: 42 }
    );
    const match = normalizeSnapshot({ matchId: 'm', fileSha256: 'c'.repeat(64), normalizedAt: '2026-10-15T00:00:00.000Z', snapshot: { header: { map_name: 'de_synthetic' }, players, eventNames: ['round_start','round_freeze_end','round_end'], events, ticks } });
    expect(match.quality).toBe('VALID');
    expect(match.teams).toHaveLength(2);
    expect(match.rounds).toHaveLength(8);
    expect(match.tickRate).toBe(64);
    expect(match.rounds[3]?.sideByTeamId).not.toEqual(match.rounds[4]?.sideByTeamId);
    expect(match.rounds.every((round) => round.isValid)).toBe(true);
    expect(match.events.filter((event) => event.kind === 'PLAYER_DEATH_NONLIVE')).toHaveLength(1);
    expect(match.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'PLAYER_HURT', attrs: expect.objectContaining({ rawHealthDamage: 37, weapon: 'hegrenade' }), context: expect.objectContaining({ phase: 'LIVE' }) }),
      expect.objectContaining({ kind: 'SMOKE_DETONATE', actorId: rosterA[2] })
    ]));
    expect(match.events.filter((event) => event.kind === 'ECONOMY_SNAPSHOT')).toHaveLength(80);
    expect(match.players.find((player) => player.id === rosterA[0])?.scoreboard?.deaths).toBe(1);
  });
});
