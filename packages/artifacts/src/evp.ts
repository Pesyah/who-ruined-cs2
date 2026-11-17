import {
  evpPolicyId,
  evpReportSchema,
  evpReportSchemaVersion,
  evpSpecializationIds,
  type CanonicalMatchResult,
  type EvpReport,
  type EvpReportBinding,
} from '@who-ruined/contracts';
import { sha256Bytes, sha256Canonical } from './canonical.js';
import { ArtifactError } from './errors.js';
import { gzipJson, type ArtifactLimits, type FileArtifactStore } from './store.js';

const sha256Pattern = /^[a-f0-9]{64}$/;
const safePathSegment = /^[A-Za-z0-9_-]{1,160}$/;

export function evpReportBinding(canonical: CanonicalMatchResult): EvpReportBinding {
  const rating = canonical.activeRating;
  return {
    matchResultSchemaVersion: canonical.schemaVersion,
    fileSha256: canonical.artifact.match.fileSha256,
    sourceBindingDigest: canonical.internal.sourceBindingDigest,
    inputDigest: sha256Canonical({
      artifact: canonical.artifact,
      participation: rating.players.map((player) => ({
        playerId: player.playerId,
        teamId: player.teamId,
        availability: player.availability,
        coverage: player.coverage,
      })),
      scenario: rating.scenario,
      mvpPlayerId: rating.awards.mvp.playerId,
    }),
  };
}

export function evpReportRelativePath(matchId: string, inputDigest: string): string {
  if (!safePathSegment.test(matchId) || !sha256Pattern.test(inputDigest)) {
    throw new ArtifactError('UNSAFE_PATH');
  }
  return `experimental/evp/${matchId}/${inputDigest}.${evpReportSchemaVersion}.json.gz`;
}

export function assertEvpReportBinding(
  report: EvpReport,
  canonical: CanonicalMatchResult,
): void {
  const expected = evpReportBinding(canonical);
  if (
    report.matchId !== canonical.artifact.match.matchId
    || report.binding.matchResultSchemaVersion !== expected.matchResultSchemaVersion
    || report.binding.fileSha256 !== expected.fileSha256
    || report.binding.sourceBindingDigest !== expected.sourceBindingDigest
    || report.binding.inputDigest !== expected.inputDigest
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }

  const roster = new Map(canonical.artifact.match.players.map((player) => [player.id, player.teamId]));
  if (
    report.players.length !== roster.size
    || report.players.some((player) => roster.get(player.playerId) !== player.teamId)
  ) {
    throw new ArtifactError('BINDING_MISMATCH');
  }

  const eventIds = new Set(canonical.artifact.match.events.map((event) => event.id));
  const roundIds = new Set(canonical.artifact.match.rounds.map((round) => round.id));
  const expectedSpecializations = new Set(evpSpecializationIds);
  for (const player of report.players) {
    const specializationIds = new Set(player.specializations.map((row) => row.specializationId));
    if (
      specializationIds.size !== expectedSpecializations.size
      || [...expectedSpecializations].some((id) => !specializationIds.has(id))
    ) {
      throw new ArtifactError('INTEGRITY_MISMATCH');
    }
    for (const specialization of player.specializations) {
      if (
        specialization.evidence.eventIds.some((id) => !eventIds.has(id))
        || specialization.evidence.roundIds.some((id) => !roundIds.has(id))
      ) {
        throw new ArtifactError('BINDING_MISMATCH');
      }
    }
  }
}

export function parseEvpReport(value: unknown, canonical: CanonicalMatchResult): EvpReport {
  if (
    value !== null
    && typeof value === 'object'
    && 'policyId' in value
    && value.policyId !== evpPolicyId
  ) {
    throw new ArtifactError('POLICY_MISMATCH');
  }
  const parsed = evpReportSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  assertEvpReportBinding(parsed.data, canonical);
  return parsed.data;
}

export async function encodeEvpReport(
  report: EvpReport,
  limits: ArtifactLimits,
): Promise<{ bytes: Buffer; sha256: string }> {
  const parsed = evpReportSchema.parse(report);
  const bytes = await gzipJson(parsed, limits);
  return { bytes, sha256: sha256Bytes(bytes) };
}

export async function readEvpReportArtifact(
  store: FileArtifactStore,
  relativePath: string,
  expectedSha256: string,
  canonical: CanonicalMatchResult,
): Promise<EvpReport> {
  return parseEvpReport(
    await store.readGzipJson(relativePath, expectedSha256),
    canonical,
  );
}
