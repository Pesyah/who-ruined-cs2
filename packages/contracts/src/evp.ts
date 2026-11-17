import { z } from 'zod';
import { idSchema } from './internal.js';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const finiteNumberSchema = z.number().finite();
const boundedStrengthSchema = finiteNumberSchema.min(0).max(2);

export const evpReportSchemaVersion = 'evp-report@1' as const;
export const evpPolicyId = 'evp-policy@1-experimental' as const;
export const evpSpecializationIds = [
  'FLASH_SUPPORT',
  'NON_FLASH_ASSIST_SUPPORT',
  'TRADE_SPECIALIST',
  'CLUTCH_SPECIALIST',
  'MULTIKILL_SPECIALIST',
  'ENTRY_SPECIALIST',
  'UTILITY_DAMAGE_SPECIALIST',
  'OBJECTIVE_SPECIALIST',
] as const;
export const evpReasonCodes = [
  'NO_PLAYERS',
  'MVP_UNAVAILABLE',
  'MVP_NOT_IN_PLAYER_POOL',
  'PARTICIPATION_INELIGIBLE',
  'UNKNOWN_ROUND_COVERAGE',
  'INSUFFICIENT_EXPOSURE',
  'ANALYTICS_VALUE_UNAVAILABLE',
  'FLASH_DATA_UNAVAILABLE',
  'DAMAGE_DATA_UNAVAILABLE',
  'ALIVE_CONTEXT_UNAVAILABLE',
  'BOMB_SCENARIO_REQUIRED',
  'INSUFFICIENT_COMPARISON_POOL',
  'BELOW_ABSOLUTE_GATE',
  'BELOW_QUALIFICATION_SCORE',
  'NO_QUALIFYING_SPECIALIZATION',
  'MVP_EXCLUDED',
  'SEVERE_CONFIRMED_TEAM_HARM',
  'NOT_SELECTED_TOP_TWO',
] as const;

export const evpSpecializationIdSchema = z.enum(evpSpecializationIds);
export const evpReasonCodeSchema = z.enum(evpReasonCodes);
export const evpEvidenceQualitySchema = z.enum(['VERIFIED_EVENTS', 'VERIFIED_ROUNDS', 'AGGREGATE_ONLY']);
export const evpEvidenceGroupSchema = z.enum([
  'KILL_EVENTS',
  'FLASH_SUPPORT',
  'NON_FLASH_ASSIST',
  'UTILITY_DAMAGE',
  'OBJECTIVE_EVENTS',
]);

export const evpReportBindingSchema = z.object({
  matchResultSchemaVersion: z.literal('match-result@1'),
  fileSha256: sha256Schema,
  sourceBindingDigest: sha256Schema,
  inputDigest: sha256Schema,
}).strict();

const evpEvidenceSchema = z.object({
  eventIds: z.array(idSchema).max(512),
  roundIds: z.array(idSchema).max(128),
  quality: evpEvidenceQualitySchema,
}).strict();

const evpThresholdSchema = z.object({
  metric: z.string().min(1).max(80),
  actual: finiteNumberSchema.nullable(),
  minimum: finiteNumberSchema,
  passed: z.boolean(),
}).strict();

const evpRelativeComparisonSchema = z.object({
  comparisonPoolSize: z.number().int().min(2).max(64),
  averageRank: finiteNumberSchema.min(1).max(64),
  median: finiteNumberSchema,
  rankSignal: finiteNumberSchema.min(0).max(1),
  medianGap: finiteNumberSchema.min(0).max(1),
  dominance: finiteNumberSchema.min(0).max(1),
}).strict();

export const evpSpecializationResultSchema = z.object({
  specializationId: evpSpecializationIdSchema,
  evidenceGroup: evpEvidenceGroupSchema,
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE']),
  reasonCodes: z.array(evpReasonCodeSchema).max(32),
  sourceMetrics: z.record(z.string().min(1).max(80), finiteNumberSchema.nullable()),
  thresholds: z.array(evpThresholdSchema).max(16),
  verifiedRounds: z.number().int().nonnegative().max(512),
  comparisonScalar: finiteNumberSchema.nullable(),
  absoluteGatePassed: z.boolean(),
  absoluteStrength: boundedStrengthSchema.nullable(),
  evidencePenalty: finiteNumberSchema.min(0).max(1).nullable(),
  relative: evpRelativeComparisonSchema.nullable(),
  achievementStrength: boundedStrengthSchema.nullable(),
  qualified: z.boolean(),
  evidence: evpEvidenceSchema,
}).strict();

const evpTeamHarmSchema = z.object({
  available: z.boolean(),
  teamKillsAvailable: z.boolean(),
  teamDamageAvailable: z.boolean(),
  teamDamagePerVerifiedRoundAvailable: z.boolean(),
  teamKills: finiteNumberSchema.nonnegative().nullable(),
  teamDamage: finiteNumberSchema.nonnegative().nullable(),
  teamDamagePerVerifiedRound: finiteNumberSchema.nonnegative().nullable(),
  disqualified: z.boolean(),
}).strict();

export const evpPlayerResultSchema = z.object({
  playerId: idSchema,
  teamId: idSchema,
  status: z.enum([
    'AWARDED',
    'QUALIFIED_NOT_SELECTED',
    'NOT_QUALIFIED',
    'MVP_EXCLUDED',
    'TEAM_HARM_DISQUALIFIED',
    'NOT_APPLICABLE',
  ]),
  reasonCodes: z.array(evpReasonCodeSchema).max(32),
  candidateStrength: boundedStrengthSchema.nullable(),
  primarySpecializationId: evpSpecializationIdSchema.nullable(),
  secondarySpecializationId: evpSpecializationIdSchema.nullable(),
  secondaryBonus: finiteNumberSchema.min(0).max(1),
  teamHarm: evpTeamHarmSchema,
  specializations: z.array(evpSpecializationResultSchema).length(evpSpecializationIds.length),
}).strict();

export const evpAwardSchema = z.object({
  position: z.union([z.literal(1), z.literal(2)]),
  playerId: idSchema,
  specializationId: evpSpecializationIdSchema,
  achievementStrength: boundedStrengthSchema,
  candidateStrength: boundedStrengthSchema,
}).strict();

export const evpReportSchema = z.object({
  schemaVersion: z.literal(evpReportSchemaVersion),
  matchId: idSchema,
  policyId: z.literal(evpPolicyId),
  experimental: z.literal(true),
  calibrated: z.literal(false),
  binding: evpReportBindingSchema,
  applicability: z.object({
    applicable: z.boolean(),
    reasonCodes: z.array(evpReasonCodeSchema).max(32),
  }).strict(),
  mvpPlayerId: idSchema.nullable(),
  mvpExcludedFromAwards: z.literal(true),
  awards: z.array(evpAwardSchema).max(2),
  players: z.array(evpPlayerResultSchema).max(64),
}).strict().superRefine((report, context) => {
  const playerIds = new Set<string>();
  for (let index = 0; index < report.players.length; index += 1) {
    const player = report.players[index]!;
    if (playerIds.has(player.playerId)) {
      context.addIssue({ code: 'custom', path: ['players', index, 'playerId'], message: 'duplicate EVP player' });
    }
    playerIds.add(player.playerId);
  }
  if (report.mvpPlayerId !== null && !playerIds.has(report.mvpPlayerId)) {
    context.addIssue({ code: 'custom', path: ['mvpPlayerId'], message: 'MVP is not in the EVP roster' });
  }

  const awardedPlayers = new Set<string>();
  for (let index = 0; index < report.awards.length; index += 1) {
    const award = report.awards[index]!;
    if (award.position !== index + 1) {
      context.addIssue({ code: 'custom', path: ['awards', index, 'position'], message: 'EVP award positions must be contiguous' });
    }
    if (award.playerId === report.mvpPlayerId) {
      context.addIssue({ code: 'custom', path: ['awards', index, 'playerId'], message: 'MVP cannot receive EVP' });
    }
    if (awardedPlayers.has(award.playerId)) {
      context.addIssue({ code: 'custom', path: ['awards', index, 'playerId'], message: 'duplicate EVP award player' });
    }
    awardedPlayers.add(award.playerId);
    const player = report.players.find((candidate) => candidate.playerId === award.playerId);
    const primary = player?.specializations.find(
      (specialization) => specialization.specializationId === award.specializationId,
    );
    if (
      !player
      || player.status !== 'AWARDED'
      || player.primarySpecializationId !== award.specializationId
      || player.candidateStrength !== award.candidateStrength
      || primary?.achievementStrength !== award.achievementStrength
    ) {
      context.addIssue({ code: 'custom', path: ['awards', index], message: 'EVP award does not match the candidate result' });
    }
  }
  for (let index = 0; index < report.players.length; index += 1) {
    const player = report.players[index]!;
    if ((player.status === 'AWARDED') !== awardedPlayers.has(player.playerId)) {
      context.addIssue({ code: 'custom', path: ['players', index, 'status'], message: 'EVP candidate award status is inconsistent' });
    }
  }
});

export const evpReportOpenApiSchema = z.toJSONSchema(evpReportSchema, { target: 'openapi-3.0' });
export type EvpReportBinding = z.infer<typeof evpReportBindingSchema>;
export type EvpReport = z.infer<typeof evpReportSchema>;
export type EvpSpecializationId = z.infer<typeof evpSpecializationIdSchema>;
export type EvpReasonCode = z.infer<typeof evpReasonCodeSchema>;
