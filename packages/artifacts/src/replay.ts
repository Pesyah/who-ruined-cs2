import {
  replayIndexArtifactSchema,
  replayRoundArtifactSchema,
  type ReplayIndexArtifact,
  type ReplayRoundArtifact,
} from '@who-ruined/contracts';
import { sha256Bytes } from './canonical.js';
import { ArtifactError } from './errors.js';

export interface ReplayBinding {
  matchId: string;
  fileSha256: string;
}

export interface ReplayRoundExpectation extends ReplayBinding {
  roundId: string;
  sampleCount: number;
  eventCount: number;
}

export function replayRootRelative(matchId: string, fileSha256: string): string {
  return 'replays/' + matchId + '/' + fileSha256;
}

export function replayIndexRelative(matchId: string, fileSha256: string): string {
  return replayRootRelative(matchId, fileSha256) + '/index.m4.7-replay@1.json.gz';
}

export function replayRoundRelative(matchId: string, fileSha256: string, roundId: string): string {
  return replayRootRelative(matchId, fileSha256) + '/rounds/' + roundId + '.m4.7-replay-round@1.json.gz';
}

export function replayIndexFingerprint(index: Omit<ReplayIndexArtifact, 'fingerprint'>): string {
  return sha256Bytes(JSON.stringify(index));
}

export function verifyReplayIndexFingerprint(index: ReplayIndexArtifact): boolean {
  const value = { ...index } as Partial<ReplayIndexArtifact>;
  delete value.fingerprint;
  return index.fingerprint === replayIndexFingerprint(value as Omit<ReplayIndexArtifact, 'fingerprint'>);
}

function assertReplayBinding(value: { binding: ReplayBinding }, expected: ReplayBinding): void {
  if (
    value.binding.matchId !== expected.matchId
    || value.binding.fileSha256 !== expected.fileSha256
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }
}

export function parseReplayIndex(value: unknown, expected: ReplayBinding): ReplayIndexArtifact {
  const parsed = replayIndexArtifactSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  assertReplayBinding(parsed.data, expected);
  if (!verifyReplayIndexFingerprint(parsed.data)) throw new ArtifactError('INTEGRITY_MISMATCH');
  return parsed.data;
}

export function parseReplayRound(value: unknown, expected: ReplayRoundExpectation): ReplayRoundArtifact {
  const parsed = replayRoundArtifactSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  assertReplayBinding(parsed.data, expected);
  if (
    parsed.data.round.id !== expected.roundId
    || parsed.data.frames.length !== expected.sampleCount
    || parsed.data.events.length !== expected.eventCount
  ) {
    throw new ArtifactError('INTEGRITY_MISMATCH');
  }
  return parsed.data;
}
