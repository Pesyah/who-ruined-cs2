import { describe, expect, it } from 'vitest';
import {
  isPublicApiErrorCode,
  publicApiErrorCodes,
  publicApiErrorContractVersion,
  publicApiErrorEnvelopeSchema,
} from '../src/index.js';

describe('public API error contract', () => {
  it('keeps a unique versioned catalog and the existing envelope shape', () => {
    expect(publicApiErrorContractVersion).toBe('api-error@1');
    expect(new Set(publicApiErrorCodes).size).toBe(publicApiErrorCodes.length);
    expect(publicApiErrorEnvelopeSchema.parse({
      error: { code: 'MATCH_NOT_FOUND', message: 'Матч не найден.' },
      requestId: 'request-1',
    })).toEqual({
      error: { code: 'MATCH_NOT_FOUND', message: 'Матч не найден.' },
      requestId: 'request-1',
    });
  });

  it('distinguishes unknown codes without accepting them as public API codes', () => {
    expect(isPublicApiErrorCode('MATCH_NOT_FOUND')).toBe(true);
    expect(isPublicApiErrorCode('WORKER_INTERNAL_DIAGNOSTIC')).toBe(false);
    expect(publicApiErrorEnvelopeSchema.safeParse({
      error: { code: 'WORKER_INTERNAL_DIAGNOSTIC', message: 'internal' },
      requestId: 'request-1',
    }).success).toBe(false);
  });
});
