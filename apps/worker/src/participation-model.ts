import type { C2S2PreparedProfileDto } from '@who-ruined/contracts';

export const PARTICIPATION_SIDECAR_SCHEMA_VERSION =
  'm3c8-participation-prepared@1.0.0-experimental' as const;

export const P72_POLICY = {
  PRIMARY: {
    id: 'P72B_D_P10_N5_K025_A015_H2',
    digest: '7ac1d2d3afcffa9d4682e2979f06f4dad8d42f270ec0e858bac93019724baf48',
    harmMultiplier: 2,
  },
  FALLBACK: {
    id: 'P72B_D_P10_N5_K025_A015_H1',
    digest: '3d299d81f8e8cd336ec6288431fa83240f6a0209bfeed3b80f89930ab88f5c75',
    harmMultiplier: 1,
  },
} as const;

export type ParticipationClass =
  | 'PRESENT_VERIFIED'
  | 'ABSENT_FULL_ROUND_VERIFIED'
  | 'INTERRUPTED_PARTIAL_ROUND'
  | 'PARTICIPATION_UNKNOWN'
  | 'ROUND_GLOBAL_EVIDENCE_MISSING';

export type ParticipationRound = {
  roundId: string;
  ordinal: number;
  playerId: string;
  classification: ParticipationClass;
  reason: string;
  counted: boolean;
  side: 'T' | 'CT' | null;
  boundary: { liveStart: number; liveEnd: number; complete: boolean };
  evidence: {
    startObserved: boolean;
    startAlive: boolean | null;
    startTeamNum: number | null;
    deathTick: number | null;
    gameplayEventCount: number;
    lifecycle: Array<{ kind: string; tick: number }>;
  };
};

export type ParticipationProfile = {
  profileKey: string;
  playerId: string;
  teamId: string;
  status:
    | 'ELIGIBLE'
    | 'PARTICIPATION_ABSENT_GT_2_ROUNDS'
    | 'PARTICIPATION_EVIDENCE_UNKNOWN'
    | 'WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE'
    | 'UNKNOWN_APPLICABILITY';
  reason: string | null;
  verifiedRounds: number;
  absentRounds: number;
  partialRounds: number;
  unknownRounds: number;
  globalExcludedRounds: number;
  tRounds: number;
  ctRounds: number;
  countedRoundIds: string[];
  excludedRoundIds: string[];
  prepared: C2S2PreparedProfileDto;
};

export type ParticipationSidecar = {
  schemaVersion: typeof PARTICIPATION_SIDECAR_SCHEMA_VERSION;
  createdAt: string;
  fingerprint: string;
  binding: {
    matchId: string;
    fileSha256: string;
    parserVersion: string;
    normalizerVersion: string;
  };
  model: {
    preparedInputModel: string;
    preparedInputDigest: string;
    referenceVersion: string;
    policies: Array<{ id: string; digest: string; harmMultiplier: number }>;
  };
  scenario: 'BOMB' | 'HOSTAGE' | 'UNKNOWN';
  participation: ParticipationRound[];
  profiles: ParticipationProfile[];
  provenance: {
    source: 'RAW_DEMO_EVENTS_AND_TICKS';
    lifecycleEvents: string[];
    contextTags: string[];
    s2AppliedBy: string;
  };
};
