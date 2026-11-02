import { z } from 'zod';

export const publicApiErrorContractVersion = 'api-error@1' as const;

export const publicApiErrorCodes = [
  'EXPERIMENTAL_PARTICIPATION_RATING_DISABLED',
  'INCOMPLETE_MATCH',
  'INGESTION_PERSISTENCE_FAILED',
  'INTERNAL_ERROR',
  'INVALID_DEMO',
  'INVALID_POLICY_SELECTOR',
  'INVALID_QUERY',
  'INVALID_REQUEST',
  'JOB_NOT_FOUND',
  'MATCH_ACTIVE',
  'MATCH_NOT_FOUND',
  'PARTICIPATION_SIDECAR_BACKFILL_REQUIRED',
  'PARTICIPATION_SIDECAR_FINGERPRINT_MISMATCH',
  'PARTICIPATION_SIDECAR_INVALID',
  'PARTICIPATION_SIDECAR_POLICY_MISMATCH',
  'PARTICIPATION_SIDECAR_ROSTER_MISMATCH',
  'PARTICIPATION_SIDECAR_SCHEMA_MISMATCH',
  'PARTICIPATION_SIDECAR_STALE',
  'PARTICIPATION_SIDECAR_UNAVAILABLE_REQUIRES_ORIGINAL_DEMO',
  'PLAYER_NOT_FOUND',
  'QUEUE_SATURATED',
  'REPLAY_CORRUPT',
  'REPLAY_ROUND_NOT_FOUND',
  'REPLAY_UNAVAILABLE',
  'REPORT_CORRUPT',
  'REPORT_NOT_READY',
  'REPORT_POLICY_MISMATCH',
  'REQUEST_REJECTED',
  'SIZE_LIMIT',
  'SOURCE_DEMO_UNAVAILABLE',
  'STORAGE_FAILURE',
  'STORAGE_UNAVAILABLE',
  'UNSUPPORTED_MODE',
  'UNSUPPORTED_ROSTER_SIZE',
  'UPLOAD_BUSY',
  'UPLOAD_STORAGE_INVALID',
] as const;

export const publicApiErrorCodeSchema = z.enum(publicApiErrorCodes);
export type PublicApiErrorCode = z.infer<typeof publicApiErrorCodeSchema>;

export const publicApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: publicApiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  requestId: z.string(),
});
export type PublicApiErrorEnvelope = z.infer<typeof publicApiErrorEnvelopeSchema>;

export function isPublicApiErrorCode(value: string): value is PublicApiErrorCode {
  return publicApiErrorCodeSchema.safeParse(value).success;
}
