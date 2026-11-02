import { readFile } from 'node:fs/promises';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import {
  participationSidecarRelativePath as artifactParticipationSidecarRelativePath,
} from '@who-ruined/artifacts';
import { C2S2_POLICY_DIGEST } from '@who-ruined/scoring';
import {
  PARTICIPATION_SIDECAR_SCHEMA_VERSION,
  type ParticipationSidecar,
} from './participation-model.js';
import { publishImmutableBytes, resolveDataPath } from './storage.js';

const zip = promisify(gzip);
const unzip = promisify(gunzip);

export function validateParticipationSidecar(value: unknown): ParticipationSidecar {
  if (!value || typeof value !== 'object') throw new Error('PARTICIPATION_SIDECAR_INVALID');
  const row = value as Partial<ParticipationSidecar>;
  if (row.schemaVersion !== PARTICIPATION_SIDECAR_SCHEMA_VERSION) {
    throw new Error('PARTICIPATION_SIDECAR_SCHEMA_MISMATCH');
  }
  if (
    !row.binding
    || !row.model
    || !Array.isArray(row.participation)
    || !Array.isArray(row.profiles)
    || typeof row.fingerprint !== 'string'
  ) {
    throw new Error('PARTICIPATION_SIDECAR_INVALID');
  }
  if (row.model.preparedInputDigest !== C2S2_POLICY_DIGEST) {
    throw new Error('PARTICIPATION_SIDECAR_POLICY_MISMATCH');
  }
  return row as ParticipationSidecar;
}

export function participationSidecarRelativePath(
  matchId: string,
  fileSha256: string,
): string {
  return artifactParticipationSidecarRelativePath(
    matchId,
    fileSha256,
    PARTICIPATION_SIDECAR_SCHEMA_VERSION,
    C2S2_POLICY_DIGEST,
  );
}

export async function persistParticipationSidecar(
  dataRoot: string,
  sidecar: ParticipationSidecar,
  beforeCommit?: () => Promise<void>,
): Promise<string> {
  const relative = participationSidecarRelativePath(
    sidecar.binding.matchId,
    sidecar.binding.fileSha256,
  );
  const target = resolveDataPath(dataRoot, relative);
  try {
    const existing = validateParticipationSidecar(
      JSON.parse((await unzip(await readFile(target))).toString('utf8')),
    );
    if (existing.fingerprint === sidecar.fingerprint) return relative;
    throw new Error('PARTICIPATION_SIDECAR_IMMUTABLE_CONFLICT');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error('PARTICIPATION_SIDECAR_INVALID_EXISTING', { cause: error });
    }
  }
  await publishImmutableBytes(
    dataRoot,
    target,
    await zip(Buffer.from(JSON.stringify(sidecar))),
    beforeCommit,
  );
  return relative;
}

export async function readParticipationSidecar(
  dataRoot: string,
  relative: string,
): Promise<ParticipationSidecar> {
  try {
    return validateParticipationSidecar(
      JSON.parse(
        (await unzip(await readFile(resolveDataPath(dataRoot, relative)))).toString('utf8'),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'PARTICIPATION_SIDECAR_UNAVAILABLE_REQUIRES_ORIGINAL_DEMO',
        { cause: error },
      );
    }
    throw error;
  }
}
