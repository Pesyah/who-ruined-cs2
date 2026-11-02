import { z } from 'zod';
import { qualitySchema, sideSchema } from './common.js';
import { playerAnalyticsSchema } from './analytics.js';
import { idSchema as id, nullableCountSchema as nullableCount, nullableMetricSchema as nullableMetric } from './internal.js';

export const experimentalScenarioSchema = z.enum(['BOMB','HOSTAGE','UNKNOWN']);

const c2s2FamilyContributionsSchema = z.object({
  COMBAT: z.number(), SUPPORT: z.number(), DEATH_RELATED: z.number(), DIRECT_HARM: z.number(), CONTEXT: z.number(), OBJECTIVES: z.number()
});
const c2s2PreparedRowSchema = z.object({
  status: z.enum(['CALCULATED_RESEARCH_ONLY','WITHHELD_REQUIRED_INPUT','UNKNOWN_APPLICABILITY']),
  reason: z.string().nullable().optional(), familyContributions: c2s2FamilyContributionsSchema.partial().nullable().optional(),
  objectiveSignals: z.record(z.string(), z.number()).nullable().optional(),
  episodeContributions: z.array(z.object({ anchorId: id, chosenAxis: z.string(), family: z.enum(['COMBAT','SUPPORT','DEATH_RELATED','DIRECT_HARM']), base: z.number(), tags: z.array(z.string()) })).nullable().optional()
});
export const c2s2PreparedProfileSchema = z.object({
  profileKey: id, playerId: id, teamId: id, scenario: experimentalScenarioSchema,
  rounds: z.number().int().nonnegative(), validRounds: z.number().int().nonnegative(),
  tRounds: z.number().int().nonnegative(), ctRounds: z.number().int().nonnegative(),
  requiredInputStatus: z.string(), p4BPlus: c2s2PreparedRowSchema, p4CPlus: c2s2PreparedRowSchema
});
export const c2s2PreparedSidecarSchema = z.object({
  schemaVersion: z.literal('m3c8-c2s2-prepared-sidecar-1'), createdAt: z.string().datetime(),
  binding: z.object({ matchId: id, fileSha256: z.string().regex(/^[a-f0-9]{64}$/), parserVersion: z.string(), normalizerVersion: z.string() }),
  model: z.object({ modelVersion: z.literal('m3c8-c2-s2@1.0.0-experimental'), policyDigest: z.string().regex(/^[a-f0-9]{64}$/), referenceVersion: z.literal('p5-c2-p51-s2-development-67@1') }),
  scenario: experimentalScenarioSchema,
  roundEvidence: z.array(z.object({ roundId: id, clean: z.boolean(), reasons: z.array(z.string()), boundary: z.record(z.string(), z.unknown()) })),
  hostageActions: z.array(z.object({ event: z.enum(['hostage_hurt','hostage_rescued']), roundId: id, tick: z.number().int().nonnegative(), playerId: id, hostage: z.string().nullable() })),
  armorAxes: z.array(z.object({ anchorId: id, roundId: id, playerId: id, relation: z.enum(['ENEMY','ALLY']), axis: z.enum(['enemyArmor','allyArmor']), value: z.number().nonnegative() })),
  physicalAnchors: z.array(z.object({ profileKey: id, anchorId: id, components: z.record(z.string(), z.number()), tags: z.array(z.string()) })),
  contextTagRegistry: z.array(z.enum(['OPENING','TRADE','FAST_TRADE','MULTI_KILL','DISADVANTAGE','ALIVE_LEAD_TAKEN','POSTPLANT','FLASH_ASSIST','FLASH_TEAM_KILL_WINDOW','FLASH_TEAM_DAMAGE_WINDOW','LOW_EQUIP_COMBAT'])).length(11).refine((tags) => new Set(tags).size === 11),
  contextTags: z.array(z.object({ profileKey: id, anchorId: id, tag: z.enum(['OPENING','TRADE','FAST_TRADE','MULTI_KILL','DISADVANTAGE','ALIVE_LEAD_TAKEN','POSTPLANT','FLASH_ASSIST','FLASH_TEAM_KILL_WINDOW','FLASH_TEAM_DAMAGE_WINDOW','LOW_EQUIP_COMBAT']) })),
  preparedProfiles: z.array(c2s2PreparedProfileSchema).length(10)
});
export type C2S2PreparedSidecar = z.infer<typeof c2s2PreparedSidecarSchema>;
export type C2S2PreparedProfileDto = z.infer<typeof c2s2PreparedProfileSchema>;

export const participationSidecarSchemaVersion = 'm3c8-participation-prepared@1.0.0-experimental' as const;
export const participationClassSchema = z.enum([
  'PRESENT_VERIFIED','ABSENT_FULL_ROUND_VERIFIED','INTERRUPTED_PARTIAL_ROUND',
  'PARTICIPATION_UNKNOWN','ROUND_GLOBAL_EVIDENCE_MISSING'
]);
export const participationProfileStatusSchema = z.enum([
  'ELIGIBLE','PARTICIPATION_ABSENT_GT_2_ROUNDS','PARTICIPATION_EVIDENCE_UNKNOWN',
  'WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE','UNKNOWN_APPLICABILITY'
]);
export const participationSidecarSchema = z.object({
  schemaVersion: z.literal(participationSidecarSchemaVersion),
  createdAt: z.string().datetime(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  binding: z.object({
    matchId: id, fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
    parserVersion: z.string().min(1), normalizerVersion: z.string().min(1)
  }),
  model: z.object({
    preparedInputModel: z.string().min(1),
    preparedInputDigest: z.string().regex(/^[a-f0-9]{64}$/),
    referenceVersion: z.string().min(1),
    policies: z.array(z.object({
      id: z.string().min(1), digest: z.string().regex(/^[a-f0-9]{64}$/),
      harmMultiplier: z.union([z.literal(1),z.literal(2)])
    })).length(2)
  }),
  scenario: experimentalScenarioSchema,
  participation: z.array(z.object({
    roundId: id, ordinal: z.number().int().positive(), playerId: id,
    classification: participationClassSchema, reason: z.string().min(1), counted: z.boolean(),
    side: sideSchema.nullable(),
    boundary: z.object({ liveStart: z.number().int().nonnegative(), liveEnd: z.number().int().nonnegative(), complete: z.boolean() }),
    evidence: z.object({
      startObserved: z.boolean(), startAlive: z.boolean().nullable(), startTeamNum: z.number().int().nullable(),
      deathTick: z.number().int().nonnegative().nullable(), gameplayEventCount: z.number().int().nonnegative(),
      lifecycle: z.array(z.object({ kind: z.string().min(1), tick: z.number().int().nonnegative() }))
    })
  })),
  profiles: z.array(z.object({
    profileKey: id, playerId: id, teamId: id, status: participationProfileStatusSchema,
    reason: z.string().nullable(), verifiedRounds: z.number().int().nonnegative(),
    absentRounds: z.number().int().nonnegative(), partialRounds: z.number().int().nonnegative(),
    unknownRounds: z.number().int().nonnegative(), globalExcludedRounds: z.number().int().nonnegative(),
    tRounds: z.number().int().nonnegative(), ctRounds: z.number().int().nonnegative(),
    countedRoundIds: z.array(id), excludedRoundIds: z.array(id), prepared: c2s2PreparedProfileSchema
  })).length(10),
  provenance: z.object({
    source: z.literal('RAW_DEMO_EVENTS_AND_TICKS'), lifecycleEvents: z.array(z.string()),
    contextTags: z.array(z.string()), s2AppliedBy: z.string().min(1)
  })
});
export type ParticipationSidecar = z.infer<typeof participationSidecarSchema>;

/**
 * Historical serialized envelopes may contain H1. These schemas are retained
 * for compatible reads only; runtime rating calculation is H2-only.
 */
export const persistedParticipationPolicySelectorSchema = z.enum(['H2','H1']);
export const persistedParticipationPolicyIdSchema = z.enum([
  'P72B_D_P10_N5_K025_A015_H2',
  'P72B_D_P10_N5_K025_A015_H1'
]);

export const participationRatingAvailabilitySchema = z.enum([
  'CALCULATED_RESEARCH_ONLY','PARTICIPATION_ABSENT_GT_2_ROUNDS','PARTICIPATION_EVIDENCE_UNKNOWN',
  'PARTIAL_COVERAGE_INSUFFICIENT','WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE','UNKNOWN_APPLICABILITY'
]);
const participationRatingAggregatesSchema = z.object({
  positiveMass: z.number().nonnegative(), negativeMass: z.number().nonnegative(),
  positiveTerm: z.number().nonnegative(), negativeTerm: z.number().nonpositive(), harmTerm: z.number().nonpositive()
});
const participationRatingValueSchema = z.object({
  value: z.number(), rank: z.number().int().positive(), losingTeamRank: z.number().int().positive().nullable(),
  rawFamilyInputs: c2s2FamilyContributionsSchema,
  aggregates: participationRatingAggregatesSchema,
  finalAttribution: c2s2FamilyContributionsSchema,
  arithmetic: z.object({ origin: z.literal(1), reconstructed: z.number(), tolerance: z.literal(1e-12), exactWithinTolerance: z.literal(true) }),
  kernelDetails: z.object({
    factorContributions: z.object({ CONTEXT: z.record(z.string(), z.number()), OBJECTIVES: z.record(z.string(), z.number()) }),
    directHarm: z.object({ raw: z.number(), soft: z.number(), adjustment: z.number(), transformed: z.boolean(), k: z.number(), a: z.number() }),
    context: z.object({ uncenteredSignal: z.number(), saturated: z.boolean(), winningTagByAnchor: z.record(z.string(), z.string()) }),
    objectives: z.object({ positiveCapped: z.boolean(), negativeCapped: z.boolean() })
  })
});
const participationCoverageSchema = z.object({
  verifiedRounds: z.number().int().nonnegative(), absentFullRounds: z.number().int().nonnegative(),
  partialRounds: z.number().int().nonnegative(), unknownRounds: z.number().int().nonnegative(),
  globalExcludedRounds: z.number().int().nonnegative(), countedOpportunities: z.number().int().nonnegative(),
  excludedOpportunities: z.number().int().nonnegative(), sideExposure: z.object({ T: z.number().int().nonnegative(), CT: z.number().int().nonnegative() }),
  causeCodes: z.array(z.string())
});
export const participationRatingPlayerSchema = z.object({
  playerId: id, teamId: id, displayName: z.string().max(160),
  steamId: z.string().regex(/^7656119\d{10}$/).nullable(), steamProfileUrl: z.string().url().nullable(),
  availability: z.object({ status: participationRatingAvailabilitySchema, reason: z.string().nullable() }),
  coverage: participationCoverageSchema, rating: participationRatingValueSchema.nullable(),
  baseStats: z.object({ kills: nullableCount, deaths: nullableCount, assists: nullableCount, kdaRatio: nullableMetric, adr: nullableMetric, kastPercent: nullableMetric }),
  analytics: playerAnalyticsSchema
});
const participationAwardSchema = z.object({
  playerId: id.nullable(), awardPoolSize: z.number().int().nonnegative(), tied: z.boolean(), close: z.boolean(),
  tiedPlayerIds: z.array(id), scoreGap: z.number().nonnegative().nullable(), reasonIfUnavailable: z.string().nullable()
});
export const participationRatingReportSchema = z.object({
  schemaVersion: z.literal('m3c8-participation-rating-report@1.0.0-experimental'),
  matchId: id, experimental: z.literal(true), calibrated: z.literal(false), causalBlame: z.literal(false),
  scorerVersion: z.literal('m3c8-p7.2-f-rating-projector@1.0.0-experimental'),
  policy: z.object({
    selector: persistedParticipationPolicySelectorSchema,
    policyId: persistedParticipationPolicyIdSchema,
    policyDigest: z.string().regex(/^[a-f0-9]{64}$/), harmMultiplier: z.union([z.literal(1),z.literal(2)])
  }),
  prepared: z.object({
    schemaVersion: z.literal(participationSidecarSchemaVersion), preparedInputDigest: z.string().regex(/^[a-f0-9]{64}$/),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/), sourceBindingDigest: z.string().regex(/^[a-f0-9]{64}$/)
  }),
  scenario: experimentalScenarioSchema,
  applicability: z.object({ status: z.enum(['SUPPORTED','UNKNOWN']), reason: z.string().nullable() }),
  match: z.object({
    map: z.string().nullable(), quality: qualitySchema, totalRounds: z.number().int().nonnegative(), validRounds: z.number().int().nonnegative(),
    teams: z.array(z.object({ teamId: id, score: z.number().int().nonnegative().nullable() })).length(2)
  }),
  players: z.array(participationRatingPlayerSchema).length(10),
  ordering: z.array(id), losingTeamOrdering: z.array(id),
  awards: z.object({
    eligiblePoolSize: z.number().int().nonnegative(), incompletePool: z.boolean(),
    losingTeamId: id.nullable(), outcome: z.enum(['DECIDED','DRAW','UNKNOWN']),
    mvp: participationAwardSchema,
    whoRuined: participationAwardSchema.extend({ scope: z.enum(['LOSING_TEAM_ELIGIBLE','DRAW_ALL_ELIGIBLE','UNAVAILABLE']) })
  }),
  warnings: z.array(z.string()), limitations: z.array(z.string()),
  provenance: z.object({
    parserVersion: z.string(), normalizerVersion: z.string(), featureVersion: z.string(),
    sidecarReadOnly: z.literal(true), originalDemoParsedAtRequest: z.literal(false)
  })
});
export const participationRatingOpenApiSchema = z.toJSONSchema(participationRatingReportSchema, { target: 'openapi-3.0' });
export type ParticipationRatingReport = z.infer<typeof participationRatingReportSchema>;

/**
 * M4.3 exposes the active H2 result. The frozen policy identity is
 * deliberately kept in the canonical file's private section, not this DTO.
 */
export const activeParticipationRatingReportSchema = participationRatingReportSchema.omit({
  schemaVersion: true,
  policy: true,
  prepared: true,
  provenance: true
}).extend({
  schemaVersion: z.literal('m4.3-participation-rating@1'),
  reportVersion: z.literal('match-result@1'),
  provenance: z.object({
    parserVersion: z.string(), normalizerVersion: z.string(), featureVersion: z.string(),
    originalDemoParsedAtRequest: z.literal(false)
  })
});
export type ActiveParticipationRatingReport = z.infer<typeof activeParticipationRatingReportSchema>;
export const activeParticipationRatingOpenApiSchema = z.toJSONSchema(activeParticipationRatingReportSchema, { target: 'openapi-3.0' });

export const participationExplanationFamilySchema = z.enum([
  'COMBAT','SUPPORT','DEATH_RELATED','OBJECTIVES','CONTEXT','DIRECT_HARM'
]);
export const participationExplanationSourceKindSchema = z.enum(['EVENT','AGGREGATE','BASELINE']);
export const participationExplanationReasonSchema = z.enum([
  'CONFIRMED_COMBAT_EVENT','CONFIRMED_SUPPORT_EVENT','RECORDED_DEATH_EVENT',
  'CONFIRMED_FRIENDLY_HARM','CONTEXT_FACTOR','OBJECTIVE_FACTOR','MODEL_BASELINE'
]);
export const participationExplanationTransformationSchema = z.enum([
  'POSITIVE_LINEAR_SCALE','NEGATIVE_MASS_SOFTENING','DIRECT_HARM_SOFTENING',
  'DIRECT_HARM_MULTIPLIER','CONTEXT_CENTERING','CONTEXT_SATURATION','OBJECTIVE_CAP'
]);
export const participationExplanationSourceSchema = z.object({
  kind: participationExplanationSourceKindSchema,
  reason: participationExplanationReasonSchema,
  rawContribution: z.number(),
  finalContribution: z.number().nullable(),
  roundIds: z.array(id),
  evidenceEventIds: z.array(id)
});
export const participationExplanationTransformSchema = z.object({
  code: participationExplanationTransformationSchema,
  scope: z.enum(['FAMILY','CROSS_FAMILY']),
  input: z.number().nullable(),
  output: z.number().nullable(),
  adjustment: z.number().nullable()
});
export const participationExplanationFamilyRowSchema = z.object({
  family: participationExplanationFamilySchema,
  rawInput: z.number(),
  finalAttribution: z.number(),
  sources: z.array(participationExplanationSourceSchema),
  transformations: z.array(participationExplanationTransformSchema)
});
export const importantMomentSchema = z.object({
  id,
  type: z.enum(['MULTI_KILL','TRADE','FAST_TRADE']),
  playerId: id,
  roundId: id,
  roundOrdinal: z.number().int().positive(),
  startTick: z.number().int().nonnegative(),
  endTick: z.number().int().nonnegative(),
  killCount: z.number().int().min(1).max(5),
  tradeCount: z.number().int().nonnegative(),
  tradeDelaySeconds: z.number().nonnegative().nullable(),
  evidenceEventIds: z.array(id).min(1)
});
export const participationExplanationPlayerSchema = z.object({
  playerId: id,
  teamId: id,
  availability: z.object({ status: participationRatingAvailabilitySchema, reason: z.string().nullable() }),
  rating: z.object({
    value: z.number(),
    arithmetic: z.object({
      origin: z.literal(1), reconstructed: z.number(), tolerance: z.literal(1e-12), exactWithinTolerance: z.literal(true)
    }),
    aggregates: participationRatingAggregatesSchema,
    families: z.array(participationExplanationFamilyRowSchema).length(6)
  }).nullable(),
  importantMoments: z.array(importantMomentSchema).max(8)
});
export const participationExplanationReportSchema = z.object({
  schemaVersion: z.literal('m4.6-participation-explanation@1'),
  reportVersion: z.literal('match-result@1'),
  matchId: id,
  experimental: z.literal(true),
  calibrated: z.literal(false),
  causalBlame: z.literal(false),
  players: z.array(participationExplanationPlayerSchema).length(10),
  importantMoments: z.array(importantMomentSchema).max(8),
  provenance: z.object({ source: z.literal('match-result@1'), originalDemoParsedAtRequest: z.literal(false) })
});
export const participationExplanationOpenApiSchema = z.toJSONSchema(participationExplanationReportSchema, { target: 'openapi-3.0' });
export type ParticipationExplanationReport = z.infer<typeof participationExplanationReportSchema>;
export type ParticipationExplanationPlayer = z.infer<typeof participationExplanationPlayerSchema>;
export type ParticipationExplanationFamilyRow = z.infer<typeof participationExplanationFamilyRowSchema>;
export type ImportantMoment = z.infer<typeof importantMomentSchema>;
