import { createHash } from 'node:crypto';
import { ArtifactError } from './errors.js';

export function sha256Bytes(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as object)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key]));
    return '{' + entries.join(',') + '}';
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new ArtifactError('INVALID_JSON');
  return serialized;
}

export function sha256Canonical(value: unknown): string {
  return sha256Bytes(canonicalJson(value));
}

export function serializeJson(value: unknown): Buffer {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new ArtifactError('INVALID_JSON');
  return Buffer.from(serialized);
}
