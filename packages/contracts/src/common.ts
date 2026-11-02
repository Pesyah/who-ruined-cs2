import { z } from 'zod';

export const qualitySchema = z.enum(['VALID', 'PARTIAL', 'UNSUPPORTED']);
export type Quality = z.infer<typeof qualitySchema>;
export const sideSchema = z.enum(['T', 'CT']);
export type Side = z.infer<typeof sideSchema>;
export const eventPhaseSchema = z.enum(['PRE_FREEZE', 'LIVE', 'POST_ROUND', 'UNKNOWN']);
export type EventPhase = z.infer<typeof eventPhaseSchema>;
