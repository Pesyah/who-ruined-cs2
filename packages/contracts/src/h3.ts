import { z } from 'zod';
import { idSchema as id } from './internal.js';
import { sideSchema } from './common.js';
import {
  activeParticipationRatingReportSchema,
  experimentalScenarioSchema,
  participationClassSchema,
  participationExplanationFamilyRowSchema,
  participationExplanationFamilySchema,
  participationExplanationPlayerSchema,
  participationExplanationReportSchema,
  participationExplanationSourceSchema,
  participationFamilyInputsSchema,
  participationRatingPlayerSchema,
  participationRatingValueSchema,
} from './participation.js';

export const h3PolicyId = 'h3-seven-family@1' as const;
export const h3PolicyDigest = '17b310bd0e8173a899519d91adf5533bf888e9c858b7e04ad93d1bf6ccb0b68a' as const;
export const h3FamilySchema = z.enum([...participationExplanationFamilySchema.options, 'ROUND_IMPACT']);
export const h3FamilyInputsSchema = participationFamilyInputsSchema.extend({ ROUND_IMPACT: z.number().nullable() }).strict();
export const h3PolicySchema = z.object({ id: z.literal(h3PolicyId), digest: z.literal(h3PolicyDigest) }).strict();
const ratingVersion = z.literal('m4.3-participation-rating@2');
const resultVersion = z.literal('match-result@2');

const h3RatingValueSchema = participationRatingValueSchema.extend({
  rawFamilyInputs: h3FamilyInputsSchema,
  finalAttribution: h3FamilyInputsSchema,
});
export const h3RatingReportSchema = activeParticipationRatingReportSchema.extend({
  schemaVersion: ratingVersion,
  reportVersion: resultVersion,
  scorerVersion: z.literal(h3PolicyId),
  policy: h3PolicySchema,
  players: z.array(participationRatingPlayerSchema.extend({ rating: h3RatingValueSchema.nullable() })).length(10),
});

export const h3ExplanationFamilySchema = participationExplanationFamilyRowSchema.extend({
  family: h3FamilySchema,
  rawInput: z.number().nullable(),
  finalAttribution: z.number().nullable(),
  sources: z.array(participationExplanationSourceSchema.extend({
    reason: z.enum([
      ...participationExplanationSourceSchema.shape.reason.options,
      'VERIFIED_UTILITY_USE','TRADED_DEATH_NEUTRALIZED','ROUND_IMPACT_CLUTCH',
      'ROUND_IMPACT_RECOVERY','ROUND_IMPACT_POSTPLANT',
    ]),
  })),
  transformations: z.array(participationExplanationFamilyRowSchema.shape.transformations.element.extend({
    code: z.enum([...participationExplanationFamilyRowSchema.shape.transformations.element.shape.code.options, 'ROUND_IMPACT_CAP']),
  })),
  coverage: z.object({
    availability: z.enum(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE']),
    observedRoundIds: z.array(id), withheldRoundIds: z.array(id),
  }).optional(),
});
const h3ExplanationPlayerSchema = participationExplanationPlayerSchema.extend({
  rating: participationExplanationPlayerSchema.shape.rating.unwrap().extend({
    families: z.array(h3ExplanationFamilySchema).length(7),
  }).nullable(),
});
export const h3ExplanationReportSchema = participationExplanationReportSchema.extend({
  schemaVersion: z.literal('m4.6-participation-explanation@2'),
  reportVersion: resultVersion,
  policy: h3PolicySchema,
  players: z.array(h3ExplanationPlayerSchema).length(10),
  provenance: participationExplanationReportSchema.shape.provenance.extend({ source: resultVersion }),
});

export const storedParticipationRatingSchema = z.discriminatedUnion('schemaVersion', [
  activeParticipationRatingReportSchema, h3RatingReportSchema,
]);
export const storedParticipationExplanationSchema = z.discriminatedUnion('schemaVersion', [
  participationExplanationReportSchema, h3ExplanationReportSchema,
]);
export const storedParticipationRatingOpenApiSchema = z.toJSONSchema(storedParticipationRatingSchema, { target: 'openapi-3.0' });
export const storedParticipationExplanationOpenApiSchema = z.toJSONSchema(storedParticipationExplanationSchema, { target: 'openapi-3.0' });
export type StoredParticipationRating = z.infer<typeof storedParticipationRatingSchema>;
export type StoredParticipationExplanation = z.infer<typeof storedParticipationExplanationSchema>;
export type H3RatingReport = z.infer<typeof h3RatingReportSchema>;
export type H3ExplanationReport = z.infer<typeof h3ExplanationReportSchema>;
export type H3ExplanationFamily = z.infer<typeof h3ExplanationFamilySchema>;

const tick = z.number().int().nonnegative();
export const h3RoundStartEvidenceSchema = z.object({
  roundId: id, liveStart: tick, liveEnd: tick, boundaryComplete: z.boolean(),
  boundaryReasons: z.array(z.string()), scenario: experimentalScenarioSchema,
  players: z.array(z.object({
    playerId: id, classification: participationClassSchema, counted: z.boolean(),
    startObserved: z.boolean(), startAlive: z.boolean().nullable(),
  })),
  supplementalEvents: z.array(z.object({
    id, roundId: id, tick, kind: z.enum(['HOSTAGE_RESCUED','HOSTAGE_HURT']), actorId: id.nullable(),
  })),
});
const integer = z.number().int().nullable();
export const h3EquipmentObservationSchema = z.object({
  evidenceId: id, matchId: id, roundId: id, playerId: id, teamId: id,
  side: sideSchema.nullable(), tick, phase: z.enum(['FREEZE_END', 'ROUND_END']),
  equipmentValue: integer, roundStartEquipmentValue: integer, inventory: z.array(z.string()).nullable(),
  activeWeapon: z.string().nullable(), activeWeaponEntityId: integer, armor: integer,
  hasHelmet: z.boolean().nullable(), hasDefuser: z.boolean().nullable(), balance: integer,
  cashSpentThisRound: integer, totalCashSpent: integer, alive: z.boolean().nullable(),
  provenance: z.enum(['NORMALIZED_FREEZE_SNAPSHOT', 'RAW_DEMOPARSER_TICK', 'SYNTHETIC_TEST']),
});
export type H3RoundStartEvidence = z.infer<typeof h3RoundStartEvidenceSchema>;
export type H3EquipmentObservation = z.infer<typeof h3EquipmentObservationSchema>;
export const h3EquipmentTicksSchema = z.array(h3EquipmentObservationSchema.omit({
  evidenceId: true, matchId: true, roundId: true, playerId: true, teamId: true, phase: true, provenance: true,
}).extend({ rowIndex: tick, tick: tick.nullable(), steamId: z.string().nullable() }));
