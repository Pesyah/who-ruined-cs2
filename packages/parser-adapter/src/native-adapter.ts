import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);

export const PARSER_LIBRARY_VERSION = '0.42.0';

export type UnknownRow = Record<string, unknown>;

export interface DemoParserPort {
  parseHeader(path: string): unknown;
  parsePlayerInfo(path: string): unknown;
  listGameEvents(path: string): unknown;
  parseEvents(path: string, eventNames: string[], extraPlayer?: string[] | null, extraOther?: string[] | null): unknown;
  parseTicks(path: string, wantedProps: string[], wantedTicks?: number[] | null): unknown;
}

export const rowsSchema = z.array(z.record(z.string(), z.unknown()));

export function loadNativeParser(): DemoParserPort {
  return require('@laihoe/demoparser2') as DemoParserPort;
}

export function toRows(value: unknown): UnknownRow[] {
  if (Array.isArray(value)) return rowsSchema.parse(value);
  if (value && typeof value === 'object') {
    const columns = value as Record<string, unknown>;
    const arrays = Object.entries(columns).filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]));
    if (arrays.length === 0) return [];
    const length = Math.max(...arrays.map(([, items]) => items.length));
    return Array.from({ length }, (_, index) => Object.fromEntries(arrays.map(([key, items]) => [key, items[index] ?? null])));
  }
  return [];
}

export function isSource2Header(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const header = value as Record<string, unknown>;
  return header.demo_version_name === 'valve_demo_2' || (typeof header.demo_file_stamp === 'string' && header.demo_file_stamp.startsWith('PBDEMS2'));
}

export function sanitizeSchema(rows: UnknownRow[]): { count: number; columns: string[] } {
  return { count: rows.length, columns: [...new Set(rows.flatMap((row) => Object.keys(row)))].sort() };
}
