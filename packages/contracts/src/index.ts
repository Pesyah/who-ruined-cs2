import { z } from 'zod';

export const jobStatuses = ['QUEUED', 'PARSING', 'NORMALIZING', 'VALIDATING', 'FEATURIZING', 'SCORING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'] as const;
export const jobStatusSchema = z.enum(jobStatuses);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const qualitySchema = z.enum(['VALID', 'PARTIAL', 'UNSUPPORTED']);
export type Quality = z.infer<typeof qualitySchema>;
export const sideSchema = z.enum(['T', 'CT']);
export type Side = z.infer<typeof sideSchema>;
export const eventPhaseSchema = z.enum(['PRE_FREEZE', 'LIVE', 'POST_ROUND', 'UNKNOWN']);
export type EventPhase = z.infer<typeof eventPhaseSchema>;

const id = z.string().min(1).max(160);
const scoreRecord = z.record(z.string(), z.number().int().nonnegative());
const sideRecord = z.record(z.string(), sideSchema);

export const teamSchema = z.object({ id, playerIds: z.array(id), label: z.string().max(160) });
export const scoreboardStatsSchema = z.object({
  kills: z.number().int().nonnegative(), deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(), teamKills: z.number().int().nonnegative(),
  source: z.literal('PARSED_DEATH_EVENTS_ALL_PHASES')
});
export const playerSchema = z.object({
  id, steamId: z.string().regex(/^7656119\d{10}$/).nullable(),
  displayName: z.string().max(160), teamId: id, scoreboard: scoreboardStatsSchema.optional()
});
export const roundSchema = z.object({
  id,
  ordinal: z.number().int().positive(),
  startTick: z.number().int().nonnegative(),
  freezeEndTick: z.number().int().nonnegative().nullable(),
  endTick: z.number().int().nonnegative(),
  winnerTeamId: id.nullable(),
  winnerSide: sideSchema.nullable(),
  sideByTeamId: sideRecord,
  scoreBefore: scoreRecord,
  scoreAfter: scoreRecord,
  isPistol: z.boolean().optional(),
  isOvertime: z.boolean().optional(),
  isValid: z.boolean(),
  issues: z.array(z.string())
});
export const matchEventSchema = z.object({
  id,
  kind: z.string(),
  roundId: id,
  tick: z.number().int().nonnegative(),
  actorId: id.nullable(),
  targetId: id.nullable(),
  assisterId: id.nullable(),
  attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
  context: z.object({
    phase: eventPhaseSchema,
    actorTeamId: id.nullable(), targetTeamId: id.nullable(), actorSide: sideSchema.nullable(), targetSide: sideSchema.nullable(),
    aliveByTeamId: z.record(z.string(), z.number().int().nonnegative()).nullable(),
    secondsFromFreezeEnd: z.number().nullable(), bombState: z.enum(['NOT_PLANTED','PLANTED','DEFUSED','EXPLODED']).nullable(),
    actorEquipmentValue: z.number().int().nonnegative().nullable(), actorMoney: z.number().int().nonnegative().nullable()
  }).optional(),
  source: z.object({ eventName: z.string(), rowIndex: z.number().int().nonnegative() })
});
export const qualityIssueSchema = z.object({ code: z.string(), message: z.string(), roundOrdinal: z.number().int().positive().optional() });
export const matchDataSchema = z.object({
  schemaVersion: z.literal('1'), matchId: id, fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  map: z.string().nullable(), tickRate: z.number().positive().nullable(),
  teams: z.array(teamSchema), players: z.array(playerSchema), rounds: z.array(roundSchema), events: z.array(matchEventSchema),
  quality: qualitySchema, qualityIssues: z.array(qualityIssueSchema),
  provenance: z.object({ parser: z.string(), parserVersion: z.string(), normalizedAt: z.string().datetime() })
});
export type MatchData = z.infer<typeof matchDataSchema>;
export type MatchRound = z.infer<typeof roundSchema>;
export type MatchEvent = z.infer<typeof matchEventSchema>;

export const availabilitySchema = z.enum(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE']);
const nullableCount = z.number().int().nonnegative().nullable();
const nullableMetric = z.number().nonnegative().nullable();
export const playerAnalyticsSchema = z.object({
  playerId: id, teamId: id, roundsPlayed: z.number().int().nonnegative(),
  kills: nullableCount, deaths: nullableCount, assists: nullableCount, kdaRatio: nullableMetric,
  enemyDamage: nullableCount, teamDamage: nullableCount, adr: nullableMetric,
  kastRounds: nullableCount, kastPercent: nullableMetric, survivedRounds: nullableCount,
  openingKills: nullableCount, openingDeaths: nullableCount,
  tradeKills: nullableCount, deathsTraded: nullableCount, untradedDeaths: nullableCount, tradeParticipation: nullableCount,
  multiKills: z.object({ two: z.number().int().nonnegative(), three: z.number().int().nonnegative(), four: z.number().int().nonnegative(), five: z.number().int().nonnegative() }),
  clutches: z.record(z.string(), z.number().int().nonnegative()),
  killsWithAdvantage: nullableCount, killsAtDisadvantage: nullableCount,
  teamKills: nullableCount, suicides: nullableCount,
  bomb: z.object({ plants: nullableCount, defuses: nullableCount, explosions: nullableCount }),
  grenades: z.object({
    flashesThrown: nullableCount, enemiesFlashed: nullableCount, teammatesFlashed: nullableCount,
    enemyBlindSeconds: nullableMetric, teamBlindSeconds: nullableMetric,
    heThrown: nullableCount, heEnemyDamage: nullableCount, heTeamDamage: nullableCount,
    infernosStarted: nullableCount, infernoEnemyDamage: nullableCount, infernoTeamDamage: nullableCount,
    smokesThrown: nullableCount, smokeEffectiveness: z.null()
  }),
  economy: z.object({ availability: availabilitySchema, freezeEquipmentValueTotal: nullableCount, freezeRoundsObserved: nullableCount, money: z.null() }),
  facts: z.array(z.object({ category: z.enum(['POSITIVE_CONTRIBUTION','ERROR','NEUTRAL']), kind: z.string(), roundId: id, eventId: id.nullable(), value: z.number().nullable() }))
});
export type PlayerAnalytics = z.infer<typeof playerAnalyticsSchema>;

export const matchAnalyticsSchema = z.object({
  schemaVersion: z.literal('m2-1'), featureVersion: z.literal('m2-0.1.0'), matchId: id,
  generatedAt: z.string().datetime(), tradeWindowSeconds: z.literal(5),
  availability: z.object({ damage: availabilitySchema, flashes: availabilitySchema, economy: availabilitySchema, aliveContext: availabilitySchema }),
  players: z.array(playerAnalyticsSchema),
  limitations: z.array(z.string())
});
export type MatchAnalytics = z.infer<typeof matchAnalyticsSchema>;

export const matchArtifactSchema = z.object({ schemaVersion: z.literal('m2-artifact-1'), match: matchDataSchema, analytics: matchAnalyticsSchema });
export type MatchArtifact = z.infer<typeof matchArtifactSchema>;

export const jobDtoSchema = z.object({
  id, matchId: id, status: jobStatusSchema, stage: z.string(), createdAt: z.string(), updatedAt: z.string(),
  errorCode: z.string().optional(), message: z.string().optional()
});
export type JobDto = z.infer<typeof jobDtoSchema>;

export const errorCodes = ['INVALID_DEMO','UNSUPPORTED_MODE','INCOMPLETE_MATCH','MISSING_REQUIRED_EVENTS','SIZE_LIMIT','PARSE_TIMEOUT','PARSE_FAILED','VALIDATION_FAILED','JOB_NOT_FOUND','MATCH_NOT_FOUND','PLAYER_NOT_FOUND','INTERNAL_ERROR'] as const;
export type ErrorCode = typeof errorCodes[number];
