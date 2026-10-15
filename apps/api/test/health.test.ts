import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health.controller.js';

describe('health contract', () => {
  it('returns the local API version', () => expect(new HealthController().health()).toEqual({ status: 'ok', version: '0.1.0' }));
});
