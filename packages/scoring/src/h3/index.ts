export { buildCanonicalTradeLinks, evaluateH2E2Experiment, neutralizeDeathAnchor, type H2E2ResearchProfile } from './canonical-trades.js';
export {
  H2_E3_CONFIGURATIONS, evaluateH2E3Experiment, extractUtilityEvidence, projectUtilityContribution,
  type H2E3ResearchProfile, type UtilityType,
} from './utility-evidence.js';
export { H2_E4_TIMELINE_CONTRACT_VERSION, reconstructRoundTimelines, roundStartEvidenceFromSidecars, type RoundStartEvidence } from './round-timeline.js';
export { H2_E5_ROUND_IMPACT_CONTRACT_VERSION, evaluateH2E5Experiment, type H2E5ResearchProfile, type ImpactModelId, type RoundImpactResearchContract } from './state-context.js';
export {
  H2_E6_ECONOMY_CONTRACT_VERSION, evaluateH2E6Economy, reconstructEquipmentSnapshots,
  type EquipmentSnapshotObservation, type H2E6ResearchProfile, type ItemObservation,
} from './economy-evidence.js';
export { prepareJointEvidence, projectJointPolicy, type JointEvidence } from './comparison-policy.js';
export { H3_FAMILIES, H3_POLICY, H3_POLICY_DIGEST, H3_VERSION, H3_PARTICIPATION_RATING_POLICY, projectH3 } from './policy.js';
export { buildH3MatchResult, rebuildH3MatchResult } from './match-result.js';
export { evaluateRoundImpact } from './round-impact.js';
export { COVERAGE, COVERAGE_VERSION, H2_FAMILY_COVERAGE, NORMALIZED_FACT_MAP } from './coverage.js';
export { CANDIDATES, NOMINAL, researchDigest, type CandidateId } from './comparison-config.js';
