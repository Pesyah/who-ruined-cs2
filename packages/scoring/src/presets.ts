import type { ScoringConfig } from '@who-ruined/contracts';
import v1 from '../config/v1.json' with { type: 'json' };
import successor7525 from '../config/successor-75-25.json' with { type: 'json' };
import successor5050 from '../config/successor-50-50.json' with { type: 'json' };
import successor2575 from '../config/successor-25-75.json' with { type: 'json' };
import successorSupport from '../config/successor-support.json' with { type: 'json' };
import successorHarmLow from '../config/successor-harm-low.json' with { type: 'json' };
import successorHarmHigh from '../config/successor-harm-high.json' with { type: 'json' };

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// Presets are package resources, not filesystem reads. Every public scoring
// entry point validates the selected preset as an explicit ScoringConfig input.
const preset = (input: unknown): ScoringConfig => deepFreeze(input as ScoringConfig);

export const V1_CONFIG = preset(v1);
export const SUCCESSOR_75_25_CONFIG = preset(successor7525);
export const SUCCESSOR_50_50_CONFIG = preset(successor5050);
export const SUCCESSOR_25_75_CONFIG = preset(successor2575);
export const SUCCESSOR_SUPPORT_CONFIG = preset(successorSupport);
export const SUCCESSOR_HARM_LOW_CONFIG = preset(successorHarmLow);
export const SUCCESSOR_HARM_HIGH_CONFIG = preset(successorHarmHigh);

export const SCORING_CONFIGS = Object.freeze([
  V1_CONFIG,
  SUCCESSOR_75_25_CONFIG,
  SUCCESSOR_50_50_CONFIG,
  SUCCESSOR_25_75_CONFIG,
  SUCCESSOR_HARM_LOW_CONFIG,
  SUCCESSOR_HARM_HIGH_CONFIG,
  SUCCESSOR_SUPPORT_CONFIG,
]);
