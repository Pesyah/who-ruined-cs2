import {
  canonicalMatchResultSchema,
  assertMatchRelations,
  matchArtifactSchema,
  type CanonicalMatchResult,
  type H3MatchResult,
  h3FamilySchema,
  type MatchArtifact,
} from '@who-ruined/contracts';
import { ArtifactError } from './errors.js';
import {
  gzipJson,
  type ArtifactLimits,
  type FileArtifactStore,
} from './store.js';
import { sha256Bytes, sha256Canonical } from './canonical.js';

function assertArtifactRelations(artifact: MatchArtifact): void {
  try {
    assertMatchRelations(artifact.match);
  } catch (error) {
    throw new ArtifactError('INTEGRITY_MISMATCH', { cause: error });
  }
}

export function parseMatchArtifact(value: unknown): MatchArtifact {
  const parsed = matchArtifactSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  assertArtifactRelations(parsed.data);
  return parsed.data;
}

export interface MatchResultBinding {
  matchId: string;
  policyId?: string | null;
  policyDigest?: string | null;
}

export function canonicalMatchResultRelativePath(matchId: string, sha256: string, version: CanonicalMatchResult['schemaVersion'] = 'match-result@1'): string {
  return 'results/' + matchId + '/' + sha256 + '.' + version + '.json.gz';
}

function assertH3Integrity(result: H3MatchResult): void {
  const { artifact, activeRating, explanation, internal } = result;
  const { binding, profiles, roundStarts, equipment } = internal.recomputeSeed;
  const { match } = artifact;
  const roster = new Map(match.players.map((player) => [player.id, player.teamId]));
  const rounds = new Set(match.rounds.map((round) => round.id));
  const eventRounds = new Map(match.events.map((event) => [event.id, event.roundId]));
  const byPlayer = new Map(explanation.players.map((player) => [player.playerId, player]));
  const fails = (flag: boolean) => { if (flag) throw new ArtifactError('INTEGRITY_MISMATCH'); };
  fails(binding.matchId !== match.matchId || binding.fileSha256 !== match.fileSha256
    || internal.sourceBindingDigest !== sha256Canonical(binding)
    || activeRating.matchId !== match.matchId || explanation.matchId !== match.matchId
    || internal.selectedPolicyDigest !== activeRating.policy.digest
    || activeRating.policy.digest !== explanation.policy.digest
    || byPlayer.size !== roster.size || new Set(activeRating.players.map((p) => p.playerId)).size !== roster.size
    || new Set(profiles.map((p) => p.playerId)).size !== roster.size
    || profiles.some((p) => roster.get(p.playerId) !== p.teamId || p.countedRoundIds.some((id) => !rounds.has(id)))
    || new Set(roundStarts.map((row) => row.roundId)).size !== roundStarts.length
    || roundStarts.some((row) => !rounds.has(row.roundId) || row.players.some((player) => !roster.has(player.playerId)))
    || equipment.some((row) => row.matchId !== match.matchId || roster.get(row.playerId) !== row.teamId || !rounds.has(row.roundId)));
  const ranked = new Set(activeRating.players.filter((p) => p.rating !== null).map((p) => p.playerId));
  const { mvp, whoRuined } = activeRating.awards;
  fails([mvp.playerId, whoRuined.playerId].some((id) => id !== null && !ranked.has(id)));
  for (const player of activeRating.players) {
    const explained = byPlayer.get(player.playerId);
    if (!explained || roster.get(player.playerId) !== player.teamId || player.teamId !== explained.teamId
      || player.availability.status !== explained.availability.status || player.availability.reason !== explained.availability.reason
      || (player.rating === null) !== (explained.rating === null)) throw new ArtifactError('INTEGRITY_MISMATCH');
    if (!player.rating || !explained.rating) continue;
    const rating = player.rating;
    const families = new Map(explained.rating.families.map((row) => [row.family, row]));
    const coverage = families.get('ROUND_IMPACT')?.coverage;
    fails(!coverage || (coverage.availability === 'UNAVAILABLE') !== (rating.rawFamilyInputs.ROUND_IMPACT === null)
      || (rating.rawFamilyInputs.ROUND_IMPACT === null) !== (rating.finalAttribution.ROUND_IMPACT === null));
    if (coverage) {
      const observed = coverage.observedRoundIds;
      const withheld = coverage.withheldRoundIds;
      const counted = new Set(profiles.find((profile) => profile.playerId === player.playerId)!.countedRoundIds);
      const tracked = [...observed, ...withheld];
      fails(new Set(tracked).size !== tracked.length || tracked.length !== counted.size || tracked.some((id) => !counted.has(id))
        || coverage.availability !== (!observed.length ? 'UNAVAILABLE' : withheld.length ? 'PARTIAL' : 'AVAILABLE'));
    }
    const reconstructed = 1 + h3FamilySchema.options.reduce((sum, family) => sum + (rating.finalAttribution[family] ?? 0), 0);
    fails(explained.rating.value !== rating.value || Math.abs(reconstructed - rating.value) > 1e-12
      || Math.abs(reconstructed - rating.arithmetic.reconstructed) > 1e-12
      || Math.abs(reconstructed - explained.rating.arithmetic.reconstructed) > 1e-12
      || h3FamilySchema.options.some((family) => {
        const row = families.get(family);
        return !row || row.rawInput !== rating.rawFamilyInputs[family] || row.finalAttribution !== rating.finalAttribution[family]
          || row.sources.some((source) => source.roundIds.some((id) => !rounds.has(id))
            || source.evidenceEventIds.some((id) => !source.roundIds.includes(eventRounds.get(id) ?? '')));
      }));
  }
}

export async function encodeCanonicalMatchResult(
  value: CanonicalMatchResult,
  limits?: ArtifactLimits,
): Promise<{ bytes: Buffer; sha256: string }> {
  const parsed = canonicalMatchResultSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  assertArtifactRelations(parsed.data.artifact);
  if (parsed.data.schemaVersion === 'match-result@2') assertH3Integrity(parsed.data);
  const bytes = await gzipJson(parsed.data, limits);
  return { bytes, sha256: sha256Bytes(bytes) };
}

export function parseCanonicalMatchResult(
  value: unknown,
  binding?: MatchResultBinding,
): CanonicalMatchResult {
  const parsed = canonicalMatchResultSchema.safeParse(value);
  if (!parsed.success) throw new ArtifactError('SCHEMA_MISMATCH');
  const result = parsed.data;
  assertArtifactRelations(result.artifact);
  if (result.schemaVersion === 'match-result@2') assertH3Integrity(result);
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
