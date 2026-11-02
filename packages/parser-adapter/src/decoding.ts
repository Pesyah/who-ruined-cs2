import type { UnknownRow } from './native-adapter.js';

export function asInteger(row: UnknownRow, aliases: string[]): number | null {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  }
  return null;
}

export function asText(row: UnknownRow, aliases: string[]): string | null {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function asBoolean(row: UnknownRow, aliases: string[]): boolean | null {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
    if (value === 0 || value === 1) return value === 1;
  }
  return null;
}

export function asNumber(row: UnknownRow, aliases: string[]): number | null {
  for (const key of aliases) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}
