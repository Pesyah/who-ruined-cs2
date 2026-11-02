import {
  canonicalMatchResultSchema,
  type CanonicalMatchResult,
} from '@who-ruined/contracts';
import { ArtifactError } from './errors.js';
import { gzipJson, type FileArtifactStore } from './store.js';
import { sha256Bytes } from './canonical.js';

export interface MatchResultBinding {
  matchId: string;
  policyId?: string | null;
  policyDigest?: string | null;
}

export function canonicalMatchResultRelativePath(matchId: string, sha256: string): string {
  return 'results/' + matchId + '/' + sha256 + '.match-result@1.json.gz';
}

export async function encodeCanonicalMatchResult(
  value: CanonicalMatchResult,
): Promise<{ bytes: Buffer; sha256: string }> {
  const parsed = canonicalMatchResultSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  const bytes = await gzipJson(parsed.data);
  return { bytes, sha256: sha256Bytes(bytes) };
}

export function parseCanonicalMatchResult(
  value: unknown,
  binding?: MatchResultBinding,
): CanonicalMatchResult {
  const parsed = canonicalMatchResultSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  const result = parsed.data;
  if (binding) assertCanonicalMatchResultBinding(result, binding);
  return result;
}

export function assertCanonicalMatchResultBinding(
  result: CanonicalMatchResult,
  binding: MatchResultBinding,
): void {
  if (
    result.artifact.match.matchId !== binding.matchId
    || result.activeRating.matchId !== binding.matchId
    || result.internal.recomputeSeed.binding.matchId !== binding.matchId
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }
  if (
    binding.policyId !== undefined
    && (
      result.internal.selectedPolicyId !== binding.policyId
      || result.internal.selectedPolicyDigest !== binding.policyDigest
    )
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }
}

export async function readCanonicalMatchResultArtifact(
  store: FileArtifactStore,
  relativePath: string,
  expectedSha256?: string,
  binding?: MatchResultBinding,
): Promise<CanonicalMatchResult> {
  return parseCanonicalMatchResult(
    await store.readGzipJson(relativePath, expectedSha256),
    binding,
  );
}
