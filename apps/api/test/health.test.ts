import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health.controller.js';
import { MatchesController } from '../src/matches.controller.js';

describe('health contract', () => {
  it('returns the local API version', () => expect(new HealthController().health()).toEqual({ status: 'ok', version: '0.1.0' }));
  it('keeps the asynchronous upload contract at HTTP 202', () => {
    expect(Reflect.getMetadata('__httpCode__', MatchesController.prototype.upload)).toBe(202);
  });
  it('exposes match and per-player M2 analytics handlers without changing the upload route', () => {
    expect(typeof MatchesController.prototype.analytics).toBe('function');
    expect(typeof MatchesController.prototype.playerAnalytics).toBe('function');
  });
  it('exposes versioned report, player evidence, and asynchronous artifact-only rescore handlers', () => {
    expect(typeof MatchesController.prototype.report).toBe('function');
    expect(typeof MatchesController.prototype.playerReport).toBe('function');
    expect(typeof MatchesController.prototype.rescore).toBe('function');
    expect(Reflect.getMetadata('__httpCode__', MatchesController.prototype.rescore)).toBe(202);
  });
});
