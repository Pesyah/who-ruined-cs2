import { z } from 'zod';

export const jobStatuses = ['QUEUED', 'PARSING', 'NORMALIZING', 'VALIDATING', 'FEATURIZING', 'SCORING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'] as const;
export const jobStatusSchema = z.enum(jobStatuses);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const qualitySchema = z.enum(['VALID', 'PARTIAL', 'UNSUPPORTED']);
export type Quality = z.infer<typeof qualitySchema>;
export const sideSchema = z.enum(['T', 'CT']);
export type Side = z.infer<typeof sideSchema>;

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
  attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
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

export const jobDtoSchema = z.object({
  id, matchId: id, status: jobStatusSchema, stage: z.string(), createdAt: z.string(), updatedAt: z.string(),
  errorCode: z.string().optional(), message: z.string().optional()
});
export type JobDto = z.infer<typeof jobDtoSchema>;

export const errorCodes = ['INVALID_DEMO','UNSUPPORTED_MODE','INCOMPLETE_MATCH','MISSING_REQUIRED_EVENTS','SIZE_LIMIT','PARSE_TIMEOUT','PARSE_FAILED','VALIDATION_FAILED','JOB_NOT_FOUND','MATCH_NOT_FOUND','INTERNAL_ERROR'] as const;
export type ErrorCode = typeof errorCodes[number];
