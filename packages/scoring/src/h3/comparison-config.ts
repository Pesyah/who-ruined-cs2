import { createHash } from 'node:crypto';

import { H2_E3_CONFIGURATIONS, type UtilityResearchConfiguration } from './utility-evidence.js';

export const JOINT_POLICY_VERSION = 'h2-e7-joint-policy@1-research';
export const CANDIDATES = {
  C0: [],
  C1: ['E2'],
  C2: ['E3'],
  C3: ['E5'],
  C4: ['E6'],
  C5: ['E2', 'E3'],
  C6: ['E2', 'E3', 'E5'],
  C7: ['E2', 'E3', 'E5', 'E6'],
  C8: ['E3', 'E5', 'E6'],
  C9: ['E2', 'E5', 'E6'],
  C10: ['E2', 'E3', 'E6'],
  C11: ['E2', 'E3', 'E5'],
} as const;
export type CandidateId = keyof typeof CANDIDATES;
export type Mechanism = typeof CANDIDATES.C7[number];

const u2 = H2_E3_CONFIGURATIONS.find((config) => config.id === 'U2_DIMINISHING')!;
export type JointConfig = {
  utility: UtilityResearchConfiguration;
  impact: { strength: number; roundCap: number; eventCap: number; matchCap: number; diminishing: readonly number[] };
  economy: { strength: number };
};

// Frozen before corpus evaluation.
export const NOMINAL: JointConfig = {
  utility: u2,
  impact: { strength: 1, roundCap: 0.05, eventCap: 0.02, matchCap: 0.18, diminishing: [1, 0.7, 0.5, 0.35] },
  economy: { strength: 1 },
};

export function researchDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
