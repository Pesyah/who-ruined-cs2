import {
  scoreParticipationPreparedProfiles,
  scoreParticipationResearchProfile,
  type ResearchContextOverrides,
  type ParticipationFamily,
  type ParticipationPreparedProfile,
  type ParticipationKernelRow
} from './participation-family-kernel.js';
import { H2_PARTICIPATION_RATING_POLICY } from './participation-policy.js';

export const PARTICIPATION_RATING_SCORER_VERSION = 'm3c8-p7.2-f-rating-projector@1.0.0-experimental' as const;

export type ParticipationRatingAvailabilityStatus =
  | 'CALCULATED_RESEARCH_ONLY'
  | 'PARTICIPATION_ABSENT_GT_2_ROUNDS'
  | 'PARTICIPATION_EVIDENCE_UNKNOWN'
  | 'PARTIAL_COVERAGE_INSUFFICIENT'
  | 'WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE'
  | 'UNKNOWN_APPLICABILITY';

export type ParticipationRatingPreparedProfile = {
  profileKey: string;
  playerId: string;
  teamId: string;
  status: 'ELIGIBLE' | Exclude<ParticipationRatingAvailabilityStatus, 'CALCULATED_RESEARCH_ONLY' | 'PARTIAL_COVERAGE_INSUFFICIENT'>;
  reason: string | null;
  prepared: ParticipationPreparedProfile;
};

export type CalculatedParticipationRating = {
  profileKey: string;
  playerId: string;
  teamId: string;
  status: 'CALCULATED_RESEARCH_ONLY';
  reason: null;
  rating: number;
  rawFamilyInputs: Record<ParticipationFamily, number>;
  aggregates: {
    positiveMass: number;
    negativeMass: number;
    positiveTerm: number;
    negativeTerm: number;
    harmTerm: number;
  };
  finalAttribution: Record<ParticipationFamily, number>;
  kernel: Extract<ParticipationKernelRow, { status: 'CALCULATED_RESEARCH_ONLY' }>;
};

export type UnavailableParticipationRating = {
  profileKey: string;
  playerId: string;
  teamId: string;
  status: Exclude<ParticipationRatingAvailabilityStatus, 'CALCULATED_RESEARCH_ONLY'>;
  reason: string | null;
  rating: null;
  rawFamilyInputs: null;
  aggregates: null;
  finalAttribution: null;
  kernel: ParticipationKernelRow | null;
};

export type ParticipationRatingProjection = CalculatedParticipationRating | UnavailableParticipationRating;

const nonHarmFamilies = ['COMBAT', 'SUPPORT', 'DEATH_RELATED', 'CONTEXT', 'OBJECTIVES'] as const;
const epsilon = 1e-12;

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label}_MUST_BE_FINITE`);
  return value;
}

export function softenNegativeParticipationMass(value: number): number {
  finite(value, 'P72_NEGATIVE_INPUT');
  if (value < 0) throw new RangeError('P72_NEGATIVE_INPUT_MUST_BE_NONNEGATIVE');
  return value <= 0.25 ? value : 0.25 + 0.15 * Math.log1p((value - 0.25) / 0.15);
}

export type ParticipationProjectionFamily = ParticipationFamily | 'ROUND_IMPACT';

export function projectParticipationFamilyInputs<F extends Exclude<ParticipationProjectionFamily, 'DIRECT_HARM'>>(
  families: Record<F | 'DIRECT_HARM', number>, orderedNonHarmFamilies: readonly F[],
): { rating: number; aggregates: CalculatedParticipationRating['aggregates']; finalAttribution: Record<F | 'DIRECT_HARM', number> } {
  for (const value of Object.values<number>(families)) finite(value, 'PARTICIPATION_FAMILY');
  const positiveMass = orderedNonHarmFamilies.reduce((sum, family) => sum + Math.max(families[family], 0), 0);
  const negativeMass = orderedNonHarmFamilies.reduce((sum, family) => sum + Math.max(-families[family], 0), 0);
  const positiveTerm = 10 * positiveMass;
  const negativeTerm = -softenNegativeParticipationMass(5 * negativeMass);
  const harmTerm = H2_PARTICIPATION_RATING_POLICY.harmMultiplier * families.DIRECT_HARM;
  const finalAttribution = {} as Record<F | 'DIRECT_HARM', number>;
  for (const family of orderedNonHarmFamilies) {
    const value = families[family];
    finalAttribution[family] = value >= 0 ? 10 * value : negativeMass > 0 ? negativeTerm * (-value / negativeMass) : 0;
  }
  finalAttribution.DIRECT_HARM = harmTerm;
  const rating = finite(1 + positiveTerm + negativeTerm + harmTerm, 'P72_RATING');
  const reconstructed = 1 + Object.values<number>(finalAttribution).reduce((sum, value) => sum + value, 0);
  if (Math.abs(rating - reconstructed) > epsilon) throw new Error('P72_ATTRIBUTION_INTEGRITY_MISMATCH');
  return { rating, aggregates: { positiveMass, negativeMass, positiveTerm, negativeTerm, harmTerm }, finalAttribution };
}

function unavailable(
  profile: ParticipationRatingPreparedProfile,
  status: UnavailableParticipationRating['status'],
  reason: string | null,
  kernel: ParticipationKernelRow | null
): UnavailableParticipationRating {
  return {
    profileKey: profile.profileKey,
    playerId: profile.playerId,
    teamId: profile.teamId,
    status,
    reason,
    rating: null,
    rawFamilyInputs: null,
    aggregates: null,
    finalAttribution: null,
    kernel
  };
}

function omitsOnlyUnknownObjectives(profile: ParticipationRatingPreparedProfile): boolean {
  return profile.prepared.scenario === 'UNKNOWN'
    && profile.status === 'UNKNOWN_APPLICABILITY'
    && profile.reason === 'SCENARIO_UNKNOWN'
    && profile.prepared.p4BPlus.status === 'CALCULATED_RESEARCH_ONLY'
    && profile.prepared.p4CPlus.status === 'UNKNOWN_APPLICABILITY'
    && profile.prepared.p4CPlus.reason === 'SCENARIO_UNKNOWN';
}

function preparedForProjection(profile: ParticipationRatingPreparedProfile): ParticipationPreparedProfile {
  if (profile.prepared.scenario !== 'UNKNOWN'
    || profile.prepared.p4CPlus.status !== 'UNKNOWN_APPLICABILITY'
    || profile.prepared.p4CPlus.reason !== 'SCENARIO_UNKNOWN'
    || profile.prepared.p4BPlus.status !== 'CALCULATED_RESEARCH_ONLY') {
    return profile.prepared;
  }
  return {
    ...profile.prepared,
    p4CPlus: {
      ...profile.prepared.p4BPlus,
      reason: null,
      objectiveSignals: {}
    }
  };
}

export function projectParticipationRatings(
  profiles: ParticipationRatingPreparedProfile[]
): ParticipationRatingProjection[] {
  return projectKernelRows(profiles, scoreParticipationPreparedProfiles(profiles.map(preparedForProjection)));
}

export function projectParticipationResearchRatings(
  profiles: ParticipationRatingPreparedProfile[],
  overrides: ReadonlyMap<string, ResearchContextOverrides>,
): ParticipationRatingProjection[] {
  if (new Set(profiles.map((profile) => profile.profileKey)).size !== profiles.length) {
    throw new Error('C2S2_DUPLICATE_PROFILE_KEY');
  }
  const rows = profiles.map((profile) => scoreParticipationResearchProfile(
    preparedForProjection(profile), overrides.get(profile.profileKey) ?? new Map(),
  ));
  return projectKernelRows(profiles, rows);
}

function projectKernelRows(profiles: ParticipationRatingPreparedProfile[], rows: ParticipationKernelRow[]): ParticipationRatingProjection[] {
  const kernelRows = new Map(rows.map((row) => [row.profileKey, row]));
  return profiles.map((profile) => {
    const kernel = kernelRows.get(profile.profileKey) ?? null;
    if (profile.status !== 'ELIGIBLE' && !omitsOnlyUnknownObjectives(profile)) {
      return unavailable(profile, profile.status, profile.reason, kernel);
    }
    if (!kernel || kernel.status !== 'CALCULATED_RESEARCH_ONLY') {
      const status = kernel?.status === 'UNKNOWN_APPLICABILITY'
        ? 'UNKNOWN_APPLICABILITY'
        : 'WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE';
      return unavailable(profile, status, kernel?.reason ?? 'SCORE_UNAVAILABLE', kernel);
    }

    const families = kernel.familyContributions;
    const { rating, aggregates, finalAttribution } = projectParticipationFamilyInputs(families, nonHarmFamilies);
    return {
      profileKey: profile.profileKey,
      playerId: profile.playerId,
      teamId: profile.teamId,
      status: 'CALCULATED_RESEARCH_ONLY' as const,
      reason: null,
      rating,
      rawFamilyInputs: { ...families },
      aggregates,
      finalAttribution,
      kernel
    };
  });
}

export type ParticipationRatingAward = {
  playerId: string | null;
  awardPoolSize: number;
  tied: boolean;
  close: boolean;
  tiedPlayerIds: string[];
  scoreGap: number | null;
  reasonIfUnavailable: string | null;
};

export function selectParticipationAwards(
  rows: ReadonlyArray<Pick<ParticipationRatingProjection, 'rating' | 'playerId' | 'teamId' | 'profileKey'>>,
  teams: Array<{ teamId: string; score: number | null }>
): {
  eligiblePoolSize: number;
  incompletePool: boolean;
  losingTeamId: string | null;
  outcome: 'DECIDED' | 'DRAW' | 'UNKNOWN';
  mvp: ParticipationRatingAward;
  whoRuined: ParticipationRatingAward & { scope: 'LOSING_TEAM_ELIGIBLE' | 'DRAW_ALL_ELIGIBLE' | 'UNAVAILABLE' };
} {
  type CalculatedAwardRow = Pick<CalculatedParticipationRating, 'rating' | 'playerId' | 'teamId' | 'profileKey'>;
  const calculated = rows.filter((row): row is CalculatedAwardRow => row.rating !== null);
  const validOutcome = teams.length === 2 && teams.every((team) => team.score !== null);
  const draw = validOutcome && teams[0]!.score === teams[1]!.score;
  const losingTeamId = validOutcome && !draw
    ? [...teams].sort((left, right) => left.score! - right.score! || left.teamId.localeCompare(right.teamId))[0]!.teamId
    : null;
  const descending = [...calculated].sort((left, right) => right.rating - left.rating || left.profileKey.localeCompare(right.profileKey));
  const whoPool = draw ? calculated : losingTeamId ? calculated.filter((row) => row.teamId === losingTeamId) : [];
  const ascending = [...whoPool].sort((left, right) => left.rating - right.rating || left.profileKey.localeCompare(right.profileKey));
  const award = (ordered: CalculatedAwardRow[], reason: string | null): ParticipationRatingAward => {
    const first = ordered[0];
    if (!first) return { playerId: null, awardPoolSize: 0, tied: false, close: false, tiedPlayerIds: [], scoreGap: null, reasonIfUnavailable: reason };
    const tiedRows = ordered.filter((row) => Math.abs(row.rating - first.rating) <= epsilon);
    const scoreGap = ordered[1] ? Math.abs(first.rating - ordered[1]!.rating) : null;
    return {
      playerId: first.playerId,
      awardPoolSize: ordered.length,
      tied: tiedRows.length > 1,
      close: tiedRows.length > 1,
      tiedPlayerIds: tiedRows.map((row) => row.playerId),
      scoreGap,
      reasonIfUnavailable: null
    };
  };
  return {
    eligiblePoolSize: calculated.length,
    incompletePool: calculated.length !== rows.length,
    losingTeamId,
    outcome: !validOutcome ? 'UNKNOWN' : draw ? 'DRAW' : 'DECIDED',
    mvp: award(descending, 'NO_CALCULATED_ELIGIBLE_PLAYERS'),
    whoRuined: {
      ...award(ascending, validOutcome ? 'NO_CALCULATED_ELIGIBLE_PLAYERS_IN_SCOPE' : 'MATCH_OUTCOME_UNAVAILABLE'),
      scope: !validOutcome ? 'UNAVAILABLE' : draw ? 'DRAW_ALL_ELIGIBLE' : 'LOSING_TEAM_ELIGIBLE'
    }
  };
}


// Historical domain names retained for source compatibility.
export const P72_PARTICIPATION_SCORER_VERSION = PARTICIPATION_RATING_SCORER_VERSION;
export const p72SoftNegative = softenNegativeParticipationMass;
export const projectP72ParticipationRatings = projectParticipationRatings;
export const selectP72Awards = selectParticipationAwards;
export type P72AvailabilityStatus = ParticipationRatingAvailabilityStatus;
export type P72ParticipationPreparedProfile = ParticipationRatingPreparedProfile;
export type P72CalculatedProjection = CalculatedParticipationRating;
export type P72UnavailableProjection = UnavailableParticipationRating;
export type P72Projection = ParticipationRatingProjection;
export type P72Award = ParticipationRatingAward;
