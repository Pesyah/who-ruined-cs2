import type { C2S2PreparedProfileDto } from '@who-ruined/contracts';
import { PARTICIPATION_SIDECAR_POLICY_IDENTITIES } from '@who-ruined/scoring';

export const PARTICIPATION_SIDECAR_SCHEMA_VERSION =
  'm3c8-participation-prepared@1.0.0-experimental' as const;

export const PARTICIPATION_SIDECAR_POLICIES = PARTICIPATION_SIDECAR_POLICY_IDENTITIES
  .map(({ id, digest, harmMultiplier }) => ({ id, digest, harmMultiplier }));

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
