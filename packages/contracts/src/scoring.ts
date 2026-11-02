import { z } from 'zod';
import { eventPhaseSchema, qualitySchema, sideSchema } from './common.js';
import { matchArtifactSchema } from './analytics.js';
import { idSchema as id, nullableCountSchema as nullableCount, nullableMetricSchema as nullableMetric } from './internal.js';
import {
  activeParticipationRatingReportSchema,
  experimentalScenarioSchema,
  persistedParticipationPolicyIdSchema,
  persistedParticipationPolicySelectorSchema,
  participationSidecarSchema,
} from './participation.js';

export const matchResultRecomputeSeedSchema = z.object({
  schemaVersion: z.literal('match-result-recompute-seed@1'),
  binding: participationSidecarSchema.shape.binding,
  model: participationSidecarSchema.shape.model,
  scenario: experimentalScenarioSchema,
  profiles: participationSidecarSchema.shape.profiles
});
export type MatchResultRecomputeSeed = z.infer<typeof matchResultRecomputeSeedSchema>;

export const scoringFindingCodes = [
  'ENEMY_KILL','OPENING_KILL','TRADE_KILL','ENEMY_DAMAGE','BOMB_DEFUSE','BOMB_PLANT_WIN',
  'TEAM_KILL','TEAM_DAMAGE','TEAM_FLASH','LIVE_SUICIDE','FLASH_SUPPORT'
] as const;
export const scoringFindingCodeSchema = z.enum(scoringFindingCodes);
export const evidenceStrengthSchema = z.enum(['DIRECT','DERIVED','RESEARCH_HYPOTHESIS']);
export const scoringFindingSchema = z.object({
  id, code: scoringFindingCodeSchema, category: z.enum(['POSITIVE','NEGATIVE','FACT']),
  scorerVersion: z.string().min(1), configHash: z.string().regex(/^[a-f0-9]{64}$/),
  playerId: id, roundId: id, tick: z.number().int().nonnegative(), magnitude: z.number().nonnegative(),
  confidence: z.number().min(0).max(1), weight: z.number().nonnegative(), weightedValue: z.number().nonnegative(),
  evidenceEventIds: z.array(id), evidenceStrength: evidenceStrengthSchema, explanationKey: z.string().min(1)
});
export type ScoringFinding = z.infer<typeof scoringFindingSchema>;

export const scoringEpisodeSchema = z.object({
  id, kind: z.enum(['HIGHLIGHT','ANTI_HIGHLIGHT','RESEARCH']), type: z.string().min(1),
  scorerVersion: z.string().min(1), configHash: z.string().regex(/^[a-f0-9]{64}$/),
  playerId: id, roundId: id, startTick: z.number().int().nonnegative(), endTick: z.number().int().nonnegative(),
  evidenceEventIds: z.array(id).min(1), observedFacts: z.array(z.string()), significance: z.number().nullable(),
  confidence: z.number().min(0).max(1), evidenceStrength: evidenceStrengthSchema, explanationKey: z.string().min(1),
  supportingFindingCodes: z.array(scoringFindingCodeSchema),
  context: z.object({
    phase: eventPhaseSchema.nullable(), side: sideSchema.nullable(), weapon: z.string().nullable(),
    bombState: z.enum(['NOT_PLANTED','PLANTED','DEFUSED','EXPLODED']).nullable(),
    secondsFromFreezeEnd: z.number().nullable(), equipmentValue: z.number().int().nonnegative().nullable(),
    aliveByTeamId: z.record(z.string(), z.number().int().nonnegative()).nullable()
  }),
  research: z.object({ classification: z.enum(['STRONG','MODERATE','NOT_TRIGGERED']), intervalSeconds: z.number().nonnegative(), alternatives: z.array(z.string()) }).nullable()
});
export type ScoringEpisode = z.infer<typeof scoringEpisodeSchema>;

const scoringWeightsSchema = z.object({
  enemyKill: z.number().nonnegative(), openingKill: z.number().nonnegative(), tradeKill: z.number().nonnegative(),
  enemyDamage: z.number().nonnegative(), bombDefuse: z.number().nonnegative(), bombPlantWin: z.number().nonnegative(),
  teamKill: z.number().nonnegative(), teamDamage: z.number().nonnegative(), teamFlash: z.number().nonnegative(),
  teamFlashConfidence: z.number().min(0).max(1), liveSuicide: z.number().nonnegative(), flashSupport: z.number().nonnegative()
});
export const scoringConfigSchema = z.object({
  schemaVersion: z.literal('scoring-config-1'), version: z.string().min(1), model: z.enum(['V1_COMPAT','SUCCESSOR']),
  alpha: z.number().min(0).max(1), beta: z.number().min(0).max(1), weights: scoringWeightsSchema,
  thresholds: z.object({ v1Spread: z.number().nonnegative(), v1TopMargin: z.number().nonnegative(), closeGap: z.number().nonnegative(), mvpCloseGap: z.number().nonnegative() }),
  policies: z.object({ bundleLethalTeamDamage: z.boolean(), alwaysAssignWhoRuinedOnEligibleSuccessor: z.boolean() })
}).superRefine((value, context) => {
  if (Math.abs(value.alpha + value.beta - 1) > 1e-9) context.addIssue({ code: 'custom', message: 'alpha + beta must equal 1' });
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

const nullableNonnegative = z.number().nonnegative().nullable();
export const scoringPlayerSchema = z.object({
  playerId: id, teamId: id, validRounds: z.number().int().nonnegative(), positive: z.number().nonnegative(),
  negative: z.number().nonnegative(), net: z.number(), positiveRate: nullableNonnegative, performanceRate: z.number().nullable(),
  contextContributionRate: nullableNonnegative, confirmedHarmRate: nullableNonnegative,
  teamReference: nullableNonnegative, positiveShortfall: nullableNonnegative,
  ruinRaw: nullableNonnegative, relativeIndex: z.number().int().min(0).max(100).nullable(),
  components: z.object({
    performance: z.object({ kills: nullableCount, assists: nullableCount, enemyDamage: nullableCount, adr: nullableMetric, kastPercent: nullableMetric, survivedRounds: nullableCount, multiKillRounds: z.number().int().nonnegative(), flashAssists: z.number().int().nonnegative(), enemyBlindSeconds: nullableMetric }),
    contextContribution: z.object({ points: z.number().nonnegative(), openingKills: nullableCount, tradeKills: nullableCount, killsWithAdvantage: nullableCount, killsAtDisadvantage: nullableCount, bombPlantsWon: z.number().int().nonnegative(), bombDefuses: nullableCount }),
    confirmedHarm: z.object({ points: z.number().nonnegative(), teamDamage: nullableCount, teamKills: nullableCount, teamBlindSeconds: nullableMetric, liveSuicides: nullableCount })
  }),
  findings: z.array(scoringFindingSchema), episodeIds: z.array(id)
});
export type ScoringPlayer = z.infer<typeof scoringPlayerSchema>;

const leaderSchema = z.object({ playerId: id, rate: z.number(), tied: z.boolean(), close: z.boolean(), tiedPlayerIds: z.array(id), margin: z.number().nonnegative(), reason: z.string() });
const whoRuinedSchema = z.object({ playerId: id, ruinRaw: z.number().nonnegative(), relativeIndex: z.number().int().min(0).max(100), primaryScoreTied: z.boolean(), close: z.boolean(), tiedPlayerIds: z.array(id), margin: z.number().nonnegative(), noConfirmedHarm: z.boolean(), reason: z.string() });
export const scoringRoundPlayerSchema = z.object({
  playerId: id, positive: z.number().nonnegative(), negative: z.number().nonnegative(),
  net: z.number(), findingIds: z.array(id), episodeIds: z.array(id)
});
export const scoringRoundSchema = z.object({
  roundId: id, ordinal: z.number().int().positive(), players: z.array(scoringRoundPlayerSchema)
});
export const scoringReportSchema = z.object({
  schemaVersion: z.literal('m3-score-1'), matchId: id, scorerVersion: z.string().min(1), configHash: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.enum(['V1_COMPAT','SUCCESSOR']), experimental: z.literal(true), status: z.enum(['COMPLETED','PARTIAL','UNSUPPORTED','INSUFFICIENT_COVERAGE']),
  quality: qualitySchema, winningTeamId: id.nullable(), losingTeamId: id.nullable(),
  coverage: z.object({ score: z.number().min(0).max(1), rounds: z.number().min(0).max(1), identities: z.number().min(0).max(1), deaths: z.number().min(0).max(1), enemyDamage: z.number().min(0).max(1), teamDamage: z.number().min(0).max(1), eligible: z.boolean(), reasons: z.array(z.string()) }),
  mvp: leaderSchema.nullable(), whoRuined: whoRuinedSchema.nullable(), v1ClearRuinerPlayerId: id.nullable(),
  players: z.array(scoringPlayerSchema), episodes: z.array(scoringEpisodeSchema),
  rounds: z.array(scoringRoundSchema),
  warnings: z.array(z.string()), limitations: z.array(z.string())
});
export type ScoringReport = z.infer<typeof scoringReportSchema>;

export const canonicalMatchResultSchema = z.object({
  schemaVersion: z.literal('match-result@1'),
  createdAt: z.string().datetime(),
  internal: z.object({
    selectedPolicyId: persistedParticipationPolicyIdSchema,
    selectedPolicyDigest: z.string().regex(/^[a-f0-9]{64}$/),
    selectedPolicySelector: persistedParticipationPolicySelectorSchema,
    sourceBindingDigest: z.string().regex(/^[a-f0-9]{64}$/),
    recomputeSeed: matchResultRecomputeSeedSchema
  }),
  artifact: matchArtifactSchema,
  productionReports: z.array(scoringReportSchema),
  activeRating: activeParticipationRatingReportSchema,
  storage: z.object({ sourceDemoRetained: z.boolean() })
});
export type CanonicalMatchResult = z.infer<typeof canonicalMatchResultSchema>;

export const playerScoringReportSchema = z.object({
  schemaVersion: z.literal('m3-score-1'), matchId: id, scorerVersion: z.string().min(1),
  configHash: z.string().regex(/^[a-f0-9]{64}$/), model: z.enum(['V1_COMPAT','SUCCESSOR']),
  experimental: z.literal(true), player: scoringPlayerSchema, episodes: z.array(scoringEpisodeSchema),
  rounds: z.array(z.object({
    roundId: id, ordinal: z.number().int().positive(), player: scoringRoundPlayerSchema
  })),
  warnings: z.array(z.string()), limitations: z.array(z.string())
});
export type PlayerScoringReport = z.infer<typeof playerScoringReportSchema>;

export const rescoreRequestSchema = z.object({
  scoringVersion: z.string().min(1),
  configHash: z.string().regex(/^[a-f0-9]{64}$/).optional()
});
export type RescoreRequest = z.infer<typeof rescoreRequestSchema>;
