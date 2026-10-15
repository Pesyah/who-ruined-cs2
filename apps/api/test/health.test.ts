import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health.controller.js';
import { MatchesController } from '../src/matches.controller.js';

describe('health contract', () => {
  it('returns the local API version', () => expect(new HealthController().health()).toEqual({ status: 'ok', version: '0.1.0' }));
  it('keeps the asynchronous upload contract at HTTP 202', () => {
    expect(Reflect.getMetadata('__httpCode__', MatchesController.prototype.upload)).toBe(202);
  });
});
