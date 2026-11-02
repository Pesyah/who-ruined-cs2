import {
  participationSidecarSchema,
  type ParticipationSidecar,
} from '@who-ruined/contracts';
import { sha256Canonical } from './canonical.js';
import { ArtifactError } from './errors.js';

const fingerprintPattern = /^[a-f0-9]{64}$/;
const safePathSegment = /^[A-Za-z0-9_-]{1,160}$/;

export function participationSidecarRelativePath(
  matchId: string,
  fileSha256: string,
  schemaVersion: string,
  policyDigest: string,
): string {
  if (
    !safePathSegment.test(matchId)
    || !fingerprintPattern.test(fileSha256)
    || !safePathSegment.test(schemaVersion.replaceAll('.', '_').replaceAll('@', '_'))
    || !fingerprintPattern.test(policyDigest)
  ) {
    throw new ArtifactError('UNSAFE_PATH');
  }
  return 'experimental/c2s2-participation/' + matchId + '/' + fileSha256 + '.'
    + schemaVersion + '.' + policyDigest + '.json.gz';
}

export function parseParticipationSidecar(value: unknown): ParticipationSidecar {
  const parsed = participationSidecarSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  return parsed.data;
}

export function assertParticipationSidecarBinding(
  sidecar: ParticipationSidecar,
  expected: ParticipationSidecar['binding'],
): void {
  if (
    sidecar.binding.matchId !== expected.matchId
    || sidecar.binding.fileSha256 !== expected.fileSha256
    || sidecar.binding.parserVersion !== expected.parserVersion
    || sidecar.binding.normalizerVersion !== expected.normalizerVersion
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }
}

export function participationSidecarFingerprint(sidecar: ParticipationSidecar): string {
  return sha256Canonical({
    binding: sidecar.binding,
    model: sidecar.model,
    scenario: sidecar.scenario,
    participation: sidecar.participation,
    profiles: sidecar.profiles,
    provenance: sidecar.provenance,
  });
}

export function assertParticipationSidecarFingerprint(sidecar: ParticipationSidecar): void {
  if (participationSidecarFingerprint(sidecar) !== sidecar.fingerprint) {
    throw new ArtifactError('INTEGRITY_MISMATCH');
  }
}
