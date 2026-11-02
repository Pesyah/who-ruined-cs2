import { z } from 'zod';
import { idSchema as id } from './internal.js';
import { matchDataSchema } from './matches.js';

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
