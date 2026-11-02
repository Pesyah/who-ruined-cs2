import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { publicApiErrorCodes } from '@who-ruined/contracts';
import { errorCodeMessage } from './messages.js';

const translate = ((_key: string, fallback: string) => fallback) as unknown as TFunction;

describe('API error messages', () => {
  it('maps every public backend code and preserves an unknown-code fallback', () => {
    for (const code of publicApiErrorCodes) {
      expect(errorCodeMessage(code, translate)).not.toHaveLength(0);
    }
    expect(errorCodeMessage('FUTURE_UNKNOWN_CODE', translate)).toBe('Something went wrong. Please try again.');
  });
});
