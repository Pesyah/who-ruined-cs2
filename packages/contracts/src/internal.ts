import { z } from 'zod';

export const idSchema = z.string().min(1).max(160);
export const nullableCountSchema = z.number().int().nonnegative().nullable();
export const nullableMetricSchema = z.number().nonnegative().nullable();
