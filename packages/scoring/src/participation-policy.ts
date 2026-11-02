export const H2_PARTICIPATION_RATING_POLICY = Object.freeze({
  selector: 'H2' as const,
  id: 'P72B_D_P10_N5_K025_A015_H2' as const,
  digest: '7ac1d2d3afcffa9d4682e2979f06f4dad8d42f270ec0e858bac93019724baf48' as const,
  harmMultiplier: 2 as const
});

/**
 * Serialized sidecars created before H2-only retain this identity in their
 * fingerprinted model metadata. It is compatibility data, not an executable
 * rating policy.
 */
export const HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY = Object.freeze({
  id: 'P72B_D_P10_N5_K025_A015_H1' as const,
  digest: '3d299d81f8e8cd336ec6288431fa83240f6a0209bfeed3b80f89930ab88f5c75' as const,
  harmMultiplier: 1 as const
});

/** Exact order and values are frozen because they participate in old sidecar fingerprints. */
export const PARTICIPATION_SIDECAR_POLICY_IDENTITIES = Object.freeze([
  Object.freeze({
    id: H2_PARTICIPATION_RATING_POLICY.id,
    digest: H2_PARTICIPATION_RATING_POLICY.digest,
    harmMultiplier: H2_PARTICIPATION_RATING_POLICY.harmMultiplier
  }),
  HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY
]);
