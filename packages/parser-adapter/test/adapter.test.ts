import { describe, expect, it } from 'vitest';
import { asInteger, asText, isSource2Header, parseDemoSnapshot, sanitizeSchema, toRows, type DemoParserPort } from '../src/index.js';

describe('parser boundary', () => {
  it('normalizes array-of-structs and struct-of-arrays', () => {
    expect(toRows([{ tick: 1, name: 'x' }])).toEqual([{ tick: 1, name: 'x' }]);
    expect(toRows({ tick: [1, 2], name: ['x', 'y'] })).toEqual([{ tick: 1, name: 'x' }, { tick: 2, name: 'y' }]);
  });
  it('uses aliases and never substitutes missing data with zero', () => {
    expect(asInteger({ team_number: 3 }, ['team_num', 'team_number'])).toBe(3);
    expect(asInteger({}, ['tick'])).toBeNull();
    expect(asText({ steamid: 765n }, ['steamid'])).toBe('765');
  });
  it('recognizes only Source 2 headers and emits schema only', () => {
    expect(isSource2Header({ demo_version_name: 'valve_demo_2' })).toBe(true);
    expect(isSource2Header({ demo_version_name: 'valve_demo' })).toBe(false);
    expect(sanitizeSchema([{ name: 'secret', tick: 3 }])).toEqual({ count: 1, columns: ['name', 'tick'] });
  });
  it('calls the five required APIs and limits tick reads to phase-event ticks', () => {
    const calls: string[] = [];
    const parser: DemoParserPort = {
      parseHeader: () => { calls.push('parseHeader'); return { demo_version_name: 'valve_demo_2' }; },
      parsePlayerInfo: () => { calls.push('parsePlayerInfo'); return []; },
      listGameEvents: () => { calls.push('listGameEvents'); return ['round_end','player_death']; },
      parseEvents: (_path, names) => { calls.push(`parseEvents:${names.join(',')}`); return [{ event_name: 'round_end', tick: 200 }, { event_name: 'player_death', tick: 150 }]; },
      parseTicks: (_path, props, ticks) => { calls.push(`parseTicks:${props.join(',')}:${ticks?.join(',')}`); return []; }
    };
    const snapshot = parseDemoSnapshot('synthetic.dem', parser);
    expect(snapshot.events).toHaveLength(2);
    expect(calls).toEqual(['parseHeader','parsePlayerInfo','listGameEvents','parseEvents:round_end,player_death','parseTicks:team_num,team_name,team_rounds_total,is_alive:200']);
  });
});
