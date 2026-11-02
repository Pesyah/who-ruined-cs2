import { z } from 'zod';
import {
  loadNativeParser,
  rowsSchema,
  toRows,
  type DemoParserPort,
  type UnknownRow,
} from './native-adapter.js';

export interface ReplaySamplingRound {
  id: string;
  ordinal: number;
  startTick: number;
  freezeEndTick: number | null;
  endTick: number;
}

export interface ReplaySamplingRequest {
  tickRate: number;
  sampleRateHz: number;
  rounds: ReplaySamplingRound[];
}

export interface ParsedReplaySnapshot {
  schemaVersion: 'parser-replay-snapshot@1';
  tickRate: number;
  sampleRateHz: number;
  rounds: ReplaySamplingRound[];
  rows: UnknownRow[];
}

const replaySamplingRoundSchema = z.object({
  id: z.string().min(1).max(160),
  ordinal: z.number().int().positive(),
  startTick: z.number().int().nonnegative(),
  freezeEndTick: z.number().int().nonnegative().nullable(),
  endTick: z.number().int().nonnegative()
}).refine((round) => round.startTick <= round.endTick && (round.freezeEndTick === null || round.freezeEndTick >= round.startTick && round.freezeEndTick <= round.endTick));

export const parsedReplaySnapshotSchema = z.object({
  schemaVersion: z.literal('parser-replay-snapshot@1'),
  tickRate: z.number().positive(),
  sampleRateHz: z.number().positive().max(32),
  rounds: z.array(replaySamplingRoundSchema).min(1).max(256),
  rows: rowsSchema.max(1_280_000)
});

export function validateParsedReplaySnapshot(value: unknown): ParsedReplaySnapshot {
  return parsedReplaySnapshotSchema.parse(value);
}

export function parseDemoReplaySnapshot(
  path: string,
  input: ReplaySamplingRequest,
  parser: DemoParserPort = loadNativeParser()
): ParsedReplaySnapshot {
  const request = z.object({
    tickRate: z.number().positive().max(1024),
    sampleRateHz: z.number().positive().max(32),
    rounds: z.array(replaySamplingRoundSchema).min(1).max(256)
  }).parse(input);
  const step = Math.max(1, Math.round(request.tickRate / request.sampleRateHz));
  const ticks = new Set<number>();
  for (const round of request.rounds) {
    for (let tick = round.startTick; tick <= round.endTick; tick += step) ticks.add(tick);
    ticks.add(round.endTick);
    if (round.freezeEndTick !== null) ticks.add(round.freezeEndTick);
  }
  if (ticks.size > 20_000) throw new Error('REPLAY_SAMPLE_LIMIT');
  const wantedTicks = [...ticks].sort((a, b) => a - b);
  const rows = toRows(parser.parseTicks(path, ['X','Y','Z','yaw','pitch','steamid','is_alive'], wantedTicks));
  return validateParsedReplaySnapshot({
    schemaVersion: 'parser-replay-snapshot@1',
    tickRate: request.tickRate,
    sampleRateHz: request.sampleRateHz,
    rounds: request.rounds,
    rows
  });
}
