import {
  evpPolicyId,
  evpSpecializationIds,
  type EvpReasonCode as ContractEvpReasonCode,
  type EvpSpecializationId as ContractEvpSpecializationId,
} from '@who-ruined/contracts';

export const EVP_POLICY_ID = evpPolicyId;

export const EVP_SPECIALIZATION_IDS = evpSpecializationIds;

export type EvpSpecializationId = ContractEvpSpecializationId;
export type EvpScenario = 'BOMB' | 'HOSTAGE' | 'UNKNOWN';
export type EvpAvailability = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
export type EvpEvidenceQuality = 'VERIFIED_EVENTS' | 'VERIFIED_ROUNDS' | 'AGGREGATE_ONLY';
export type EvpEvidenceGroup = 'KILL_EVENTS' | 'FLASH_SUPPORT' | 'NON_FLASH_ASSIST' | 'UTILITY_DAMAGE' | 'OBJECTIVE_EVENTS';

export type EvpReasonCode = ContractEvpReasonCode;

export interface EvpEvidence {
  eventIds: readonly string[];
  roundIds: readonly string[];
  quality: EvpEvidenceQuality;
}

export interface EvpPlayerMetrics {
  flashAssists: number | null;
  nonFlashAssists: number | null;
  enemyBlindSeconds: number | null;
  teamBlindSeconds: number | null;
  tradeKills: number | null;
  clutchPoints: number | null;
  clutchWins: number | null;
  multiKills: { two: number | null; three: number | null; four: number | null; five: number | null };
  openingKills: number | null;
  openingDeaths: number | null;
  utilityEnemyDamage: number | null;
  utilityTeamDamage: number | null;
  bombPlants: number | null;
  bombDefuses: number | null;
  teamDamage: number | null;
  teamKills: number | null;
}

export interface EvpPlayerInput {
  playerId: string;
  teamId: string;
  participation: {
    eligible: boolean;
    verifiedRounds: number;
    unknownRounds: number;
    reasonCodes: readonly string[];
  };
  metrics: EvpPlayerMetrics;
  evidence: Partial<Record<EvpSpecializationId, EvpEvidence>>;
}

export interface EvpMatchInput {
  matchId: string;
  scenario: EvpScenario;
  mvpPlayerId: string | null;
  availability: {
    damage: EvpAvailability;
    flashes: EvpAvailability;
    aliveContext: EvpAvailability;
  };
  players: readonly EvpPlayerInput[];
}

export interface EvpThresholdCheck {
  metric: string;
  actual: number | null;
  minimum: number;
  passed: boolean;
}

export interface EvpRelativeComparison {
  comparisonPoolSize: number;
  averageRank: number;
  median: number;
  rankSignal: number;
  medianGap: number;
  dominance: number;
}

export interface EvpSpecializationResult {
  specializationId: EvpSpecializationId;
  evidenceGroup: EvpEvidenceGroup;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  reasonCodes: EvpReasonCode[];
  sourceMetrics: Record<string, number | null>;
  thresholds: EvpThresholdCheck[];
  verifiedRounds: number;
  comparisonScalar: number | null;
  absoluteGatePassed: boolean;
  absoluteStrength: number | null;
  evidencePenalty: number | null;
  relative: EvpRelativeComparison | null;
  achievementStrength: number | null;
  qualified: boolean;
  evidence: EvpEvidence;
}

export type EvpPlayerStatus =
  | 'AWARDED'
  | 'QUALIFIED_NOT_SELECTED'
  | 'NOT_QUALIFIED'
  | 'MVP_EXCLUDED'
  | 'TEAM_HARM_DISQUALIFIED'
  | 'NOT_APPLICABLE';

export interface EvpTeamHarmResult {
  available: boolean;
  teamKillsAvailable: boolean;
  teamDamageAvailable: boolean;
  teamDamagePerVerifiedRoundAvailable: boolean;
  teamKills: number | null;
  teamDamage: number | null;
  teamDamagePerVerifiedRound: number | null;
  disqualified: boolean;
}

export interface EvpPlayerResult {
  playerId: string;
  teamId: string;
  status: EvpPlayerStatus;
  reasonCodes: EvpReasonCode[];
  candidateStrength: number | null;
  primarySpecializationId: EvpSpecializationId | null;
  secondarySpecializationId: EvpSpecializationId | null;
  secondaryBonus: number;
  teamHarm: EvpTeamHarmResult;
  specializations: EvpSpecializationResult[];
}

export interface EvpAward {
  position: 1 | 2;
  playerId: string;
  specializationId: EvpSpecializationId;
  achievementStrength: number;
  candidateStrength: number;
}

export interface EvpCalculationResult {
  policyId: typeof EVP_POLICY_ID;
  experimental: true;
  calibrated: false;
  matchId: string;
  applicable: boolean;
  reasonCodes: EvpReasonCode[];
  awards: EvpAward[];
  players: EvpPlayerResult[];
}

export const EVP_POLICY_V1 = Object.freeze({
  id: EVP_POLICY_ID,
  maxAwards: 2,
  exposure: { minimumVerifiedRounds: 8, minimumMatchRatio: 0.6 },
  comparison: { minimumPoolSize: 2, rankWeight: 0.6, medianGapWeight: 0.4 },
  qualification: { minimumScore: 0.6, absoluteWeight: 0.7, dominanceWeight: 0.3 },
  secondaryBonusWeight: 0.08,
  channelPenalty: { maximum: 0.3 },
  teamHarm: { severeTeamKills: 3, combinedTeamKills: 2, combinedTeamDamagePerRound: 8 },
  specializations: {
    flashSupport: {
      minimumAssists: 2,
      minimumEnemyBlindSecondsPerRound: 2,
      targetAssists: 4,
      targetEnemyBlindSecondsPerRound: 3,
      assistWeight: 0.6,
      blindWeight: 0.4,
      comparisonBlindRateWeight: 0.35,
      friendlyRatioGrace: 0.2,
      friendlyRatioSpan: 0.5,
    },
    nonFlashAssistSupport: {
      minimumAssists: 8,
      minimumAssistsPerRound: 0.35,
      targetAssists: 12,
      targetAssistsPerRound: 0.5,
      countWeight: 0.65,
      rateWeight: 0.35,
    },
    tradeSpecialist: {
      minimumTradeKills: 4,
      minimumTradeKillsPerRound: 0.16,
      targetTradeKills: 7,
      targetTradeKillsPerRound: 0.3,
      countWeight: 0.65,
      rateWeight: 0.35,
    },
    clutchSpecialist: {
      minimumPoints: 6,
      alternativeMinimumWins: 2,
      alternativeMinimumPoints: 4,
      targetPoints: 10,
      pointWeights: { '1v1': 1, '1v2': 3, '1v3': 6, '1v4': 10, '1v5': 15 },
    },
    multikillSpecialist: {
      minimumFiveKillRounds: 1,
      minimumFourKillRounds: 1,
      minimumThreeKillRounds: 3,
      alternativeMinimumPoints: 8,
      alternativeMinimumPointsPerRound: 0.4,
      targetPoints: 14,
      pointWeights: { two: 1, three: 2, four: 4, five: 7 },
    },
    entrySpecialist: {
      minimumOpeningKills: 4,
      minimumOpeningBalance: 2,
      minimumOpeningKillsPerRound: 0.18,
      targetOpeningBalance: 5,
      targetOpeningKillsPerRound: 0.25,
      balanceWeight: 0.7,
      rateWeight: 0.3,
    },
    utilityDamageSpecialist: {
      minimumEnemyDamage: 250,
      minimumEnemyDamagePerRound: 12,
      targetEnemyDamage: 400,
      targetEnemyDamagePerRound: 17,
      countWeight: 0.65,
      rateWeight: 0.35,
      friendlyRatioGrace: 0.1,
      friendlyRatioSpan: 0.4,
    },
    objectiveSpecialist: {
      minimumPoints: 6,
      minimumDefuses: 1,
      alternativeMinimumPlants: 6,
      targetPoints: 9,
      defuseWeight: 3,
    },
  },
} as const);

const EMPTY_EVIDENCE: EvpEvidence = Object.freeze({ eventIds: [], roundIds: [], quality: 'AGGREGATE_ONLY' });

const EVIDENCE_GROUPS: Readonly<Record<EvpSpecializationId, EvpEvidenceGroup>> = Object.freeze({
  FLASH_SUPPORT: 'FLASH_SUPPORT',
  NON_FLASH_ASSIST_SUPPORT: 'NON_FLASH_ASSIST',
  TRADE_SPECIALIST: 'KILL_EVENTS',
  CLUTCH_SPECIALIST: 'KILL_EVENTS',
  MULTIKILL_SPECIALIST: 'KILL_EVENTS',
  ENTRY_SPECIALIST: 'KILL_EVENTS',
  UTILITY_DAMAGE_SPECIALIST: 'UTILITY_DAMAGE',
  OBJECTIVE_SPECIALIST: 'OBJECTIVE_EVENTS',
});

interface SpecializationMeasurement {
  specializationId: EvpSpecializationId;
  evidenceGroup: EvpEvidenceGroup;
  availabilityReasons: EvpReasonCode[];
  sourceMetrics: Record<string, number | null>;
  thresholds: EvpThresholdCheck[];
  comparisonScalar: number | null;
  absoluteGatePassed: boolean;
  absoluteStrength: number | null;
  evidencePenalty: number | null;
  evidence: EvpEvidence;
  relative: EvpRelativeComparison | null;
  achievementStrength: number | null;
  qualified: boolean;
}

interface PlayerEvaluation {
  input: EvpPlayerInput;
  participationReasons: EvpReasonCode[];
  measurements: Map<EvpSpecializationId, SpecializationMeasurement>;
  harm: EvpTeamHarmResult;
  primary: SpecializationMeasurement | null;
  secondary: SpecializationMeasurement | null;
  secondaryBonus: number;
  candidateStrength: number | null;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function isNonnegativeFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

function safeValue(value: number | null): number | null {
  return isNonnegativeFinite(value) ? value : null;
}

function safeFinite(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

function safeRate(value: number | null, rounds: number): number | null {
  return isNonnegativeFinite(value) && rounds > 0 ? value / rounds : null;
}

function minimumThreshold(metric: string, actual: number | null, minimum: number): EvpThresholdCheck {
  const finiteActual = safeFinite(actual);
  return { metric, actual: finiteActual, minimum, passed: finiteActual !== null && finiteActual >= minimum };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizedEvidence(evidence: EvpEvidence | undefined): EvpEvidence {
  if (!evidence) return EMPTY_EVIDENCE;
  return {
    eventIds: sortedUnique(evidence.eventIds),
    roundIds: sortedUnique(evidence.roundIds),
    quality: evidence.quality,
  };
}

function unavailableMeasurement(
  specializationId: EvpSpecializationId,
  reasons: readonly EvpReasonCode[],
  sourceMetrics: Record<string, number | null>,
  evidence: EvpEvidence | undefined,
): SpecializationMeasurement {
  return {
    specializationId,
    evidenceGroup: EVIDENCE_GROUPS[specializationId],
    availabilityReasons: [...reasons],
    sourceMetrics,
    thresholds: [],
    comparisonScalar: null,
    absoluteGatePassed: false,
    absoluteStrength: null,
    evidencePenalty: null,
    evidence: normalizedEvidence(evidence),
    relative: null,
    achievementStrength: null,
    qualified: false,
  };
}

function participationReasons(player: EvpPlayerInput, minimumExposure: number): EvpReasonCode[] {
  const reasons: EvpReasonCode[] = [];
  if (!player.participation.eligible) reasons.push('PARTICIPATION_INELIGIBLE');
  if (player.participation.unknownRounds > 0) reasons.push('UNKNOWN_ROUND_COVERAGE');
  if (player.participation.verifiedRounds < minimumExposure) reasons.push('INSUFFICIENT_EXPOSURE');
  return reasons;
}

function flashMeasurement(player: EvpPlayerInput, match: EvpMatchInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.flashSupport;
  const rounds = player.participation.verifiedRounds;
  const flashAssists = safeValue(player.metrics.flashAssists);
  const enemyBlindSeconds = safeValue(player.metrics.enemyBlindSeconds);
  const teamBlindSeconds = safeValue(player.metrics.teamBlindSeconds);
  const enemyBlindRate = safeRate(enemyBlindSeconds, rounds);
  const metrics = { flashAssists, enemyBlindSeconds, teamBlindSeconds, enemyBlindSecondsPerRound: enemyBlindRate };
  if (match.availability.flashes !== 'AVAILABLE') {
    return unavailableMeasurement('FLASH_SUPPORT', ['FLASH_DATA_UNAVAILABLE'], metrics, player.evidence.FLASH_SUPPORT);
  }
  if (flashAssists === null || enemyBlindSeconds === null || teamBlindSeconds === null || enemyBlindRate === null) {
    return unavailableMeasurement('FLASH_SUPPORT', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.FLASH_SUPPORT);
  }
  const thresholds = [
    minimumThreshold('flashAssists', flashAssists, policy.minimumAssists),
    minimumThreshold('enemyBlindSecondsPerRound', enemyBlindRate, policy.minimumEnemyBlindSecondsPerRound),
  ];
  const penalty = enemyBlindSeconds > 0 && teamBlindSeconds > 0
    ? clamp((teamBlindSeconds / enemyBlindSeconds - policy.friendlyRatioGrace) / policy.friendlyRatioSpan, 0, EVP_POLICY_V1.channelPenalty.maximum)
    : 0;
  return availableMeasurement('FLASH_SUPPORT', metrics, thresholds, flashAssists + policy.comparisonBlindRateWeight * enemyBlindRate,
    policy.assistWeight * clamp(flashAssists / policy.targetAssists)
      + policy.blindWeight * clamp(enemyBlindRate / policy.targetEnemyBlindSecondsPerRound),
    penalty, player.evidence.FLASH_SUPPORT);
}

function assistMeasurement(player: EvpPlayerInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.nonFlashAssistSupport;
  const rounds = player.participation.verifiedRounds;
  const assists = safeValue(player.metrics.nonFlashAssists);
  const rate = safeRate(assists, rounds);
  const metrics = { nonFlashAssists: assists, nonFlashAssistsPerRound: rate };
  if (assists === null || rate === null) {
    return unavailableMeasurement('NON_FLASH_ASSIST_SUPPORT', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.NON_FLASH_ASSIST_SUPPORT);
  }
  const thresholds = [
    minimumThreshold('nonFlashAssists', assists, policy.minimumAssists),
    minimumThreshold('nonFlashAssistsPerRound', rate, policy.minimumAssistsPerRound),
  ];
  return availableMeasurement('NON_FLASH_ASSIST_SUPPORT', metrics, thresholds, rate,
    policy.countWeight * clamp(assists / policy.targetAssists)
      + policy.rateWeight * clamp(rate / policy.targetAssistsPerRound),
    0, player.evidence.NON_FLASH_ASSIST_SUPPORT);
}

function tradeMeasurement(player: EvpPlayerInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.tradeSpecialist;
  const rounds = player.participation.verifiedRounds;
  const tradeKills = safeValue(player.metrics.tradeKills);
  const rate = safeRate(tradeKills, rounds);
  const metrics = { tradeKills, tradeKillsPerRound: rate };
  if (tradeKills === null || rate === null) {
    return unavailableMeasurement('TRADE_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.TRADE_SPECIALIST);
  }
  const thresholds = [
    minimumThreshold('tradeKills', tradeKills, policy.minimumTradeKills),
    minimumThreshold('tradeKillsPerRound', rate, policy.minimumTradeKillsPerRound),
  ];
  return availableMeasurement('TRADE_SPECIALIST', metrics, thresholds, rate,
    policy.countWeight * clamp(tradeKills / policy.targetTradeKills)
      + policy.rateWeight * clamp(rate / policy.targetTradeKillsPerRound),
    0, player.evidence.TRADE_SPECIALIST);
}

function clutchMeasurement(player: EvpPlayerInput, match: EvpMatchInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.clutchSpecialist;
  const points = safeValue(player.metrics.clutchPoints);
  const wins = safeValue(player.metrics.clutchWins);
  const metrics = { clutchPoints: points, clutchWins: wins };
  if (match.availability.aliveContext !== 'AVAILABLE') {
    return unavailableMeasurement('CLUTCH_SPECIALIST', ['ALIVE_CONTEXT_UNAVAILABLE'], metrics, player.evidence.CLUTCH_SPECIALIST);
  }
  if (points === null || wins === null) {
    return unavailableMeasurement('CLUTCH_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.CLUTCH_SPECIALIST);
  }
  const thresholds = [
    minimumThreshold('clutchPoints', points, policy.minimumPoints),
    minimumThreshold('clutchWins', wins, policy.alternativeMinimumWins),
    minimumThreshold('multiClutchPoints', points, policy.alternativeMinimumPoints),
  ];
  const gatePassed = points >= policy.minimumPoints
    || (wins >= policy.alternativeMinimumWins && points >= policy.alternativeMinimumPoints);
  return availableMeasurement('CLUTCH_SPECIALIST', metrics, thresholds, points,
    clamp(points / policy.targetPoints), 0, player.evidence.CLUTCH_SPECIALIST, gatePassed);
}

function multikillMeasurement(player: EvpPlayerInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.multikillSpecialist;
  const rounds = player.participation.verifiedRounds;
  const two = safeValue(player.metrics.multiKills.two);
  const three = safeValue(player.metrics.multiKills.three);
  const four = safeValue(player.metrics.multiKills.four);
  const five = safeValue(player.metrics.multiKills.five);
  if (two === null || three === null || four === null || five === null) {
    return unavailableMeasurement('MULTIKILL_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], { two, three, four, five }, player.evidence.MULTIKILL_SPECIALIST);
  }
  const points = policy.pointWeights.two * two
    + policy.pointWeights.three * three
    + policy.pointWeights.four * four
    + policy.pointWeights.five * five;
  const rate = safeRate(points, rounds);
  const metrics = { twoKillRounds: two, threeKillRounds: three, fourKillRounds: four, fiveKillRounds: five, multiKillPoints: points, multiKillPointsPerRound: rate };
  if (rate === null) return unavailableMeasurement('MULTIKILL_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.MULTIKILL_SPECIALIST);
  const thresholds = [
    minimumThreshold('fiveKillRounds', five, policy.minimumFiveKillRounds),
    minimumThreshold('fourKillRounds', four, policy.minimumFourKillRounds),
    minimumThreshold('threeKillRounds', three, policy.minimumThreeKillRounds),
    minimumThreshold('multiKillPoints', points, policy.alternativeMinimumPoints),
    minimumThreshold('multiKillPointsPerRound', rate, policy.alternativeMinimumPointsPerRound),
  ];
  const gatePassed = five >= policy.minimumFiveKillRounds
    || four >= policy.minimumFourKillRounds
    || three >= policy.minimumThreeKillRounds
    || (points >= policy.alternativeMinimumPoints && rate >= policy.alternativeMinimumPointsPerRound);
  return availableMeasurement('MULTIKILL_SPECIALIST', metrics, thresholds, rate,
    clamp(points / policy.targetPoints), 0, player.evidence.MULTIKILL_SPECIALIST, gatePassed);
}

function entryMeasurement(player: EvpPlayerInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.entrySpecialist;
  const rounds = player.participation.verifiedRounds;
  const openingKills = safeValue(player.metrics.openingKills);
  const openingDeaths = safeValue(player.metrics.openingDeaths);
  const rate = safeRate(openingKills, rounds);
  const balance = openingKills === null || openingDeaths === null ? null : openingKills - openingDeaths;
  const metrics = { openingKills, openingDeaths, openingBalance: balance, openingKillsPerRound: rate };
  if (openingKills === null || openingDeaths === null || rate === null || balance === null || !Number.isFinite(balance)) {
    return unavailableMeasurement('ENTRY_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.ENTRY_SPECIALIST);
  }
  const thresholds = [
    minimumThreshold('openingKills', openingKills, policy.minimumOpeningKills),
    minimumThreshold('openingBalance', balance, policy.minimumOpeningBalance),
    minimumThreshold('openingKillsPerRound', rate, policy.minimumOpeningKillsPerRound),
  ];
  return availableMeasurement('ENTRY_SPECIALIST', metrics, thresholds, balance / rounds,
    policy.balanceWeight * clamp(balance / policy.targetOpeningBalance)
      + policy.rateWeight * clamp(rate / policy.targetOpeningKillsPerRound),
    0, player.evidence.ENTRY_SPECIALIST);
}

function utilityMeasurement(player: EvpPlayerInput, match: EvpMatchInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.utilityDamageSpecialist;
  const rounds = player.participation.verifiedRounds;
  const enemyDamage = safeValue(player.metrics.utilityEnemyDamage);
  const teamDamage = safeValue(player.metrics.utilityTeamDamage);
  const rate = safeRate(enemyDamage, rounds);
  const metrics = { utilityEnemyDamage: enemyDamage, utilityTeamDamage: teamDamage, utilityEnemyDamagePerRound: rate };
  if (match.availability.damage !== 'AVAILABLE') {
    return unavailableMeasurement('UTILITY_DAMAGE_SPECIALIST', ['DAMAGE_DATA_UNAVAILABLE'], metrics, player.evidence.UTILITY_DAMAGE_SPECIALIST);
  }
  if (enemyDamage === null || teamDamage === null || rate === null) {
    return unavailableMeasurement('UTILITY_DAMAGE_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.UTILITY_DAMAGE_SPECIALIST);
  }
  const thresholds = [
    minimumThreshold('utilityEnemyDamage', enemyDamage, policy.minimumEnemyDamage),
    minimumThreshold('utilityEnemyDamagePerRound', rate, policy.minimumEnemyDamagePerRound),
  ];
  const penalty = enemyDamage > 0
    ? clamp((teamDamage / enemyDamage - policy.friendlyRatioGrace) / policy.friendlyRatioSpan, 0, EVP_POLICY_V1.channelPenalty.maximum)
    : 0;
  return availableMeasurement('UTILITY_DAMAGE_SPECIALIST', metrics, thresholds, rate,
    policy.countWeight * clamp(enemyDamage / policy.targetEnemyDamage)
      + policy.rateWeight * clamp(rate / policy.targetEnemyDamagePerRound),
    penalty, player.evidence.UTILITY_DAMAGE_SPECIALIST);
}

function objectiveMeasurement(player: EvpPlayerInput, match: EvpMatchInput): SpecializationMeasurement {
  const policy = EVP_POLICY_V1.specializations.objectiveSpecialist;
  const rounds = player.participation.verifiedRounds;
  const plants = safeValue(player.metrics.bombPlants);
  const defuses = safeValue(player.metrics.bombDefuses);
  const objectivePoints = plants === null || defuses === null ? null : plants + policy.defuseWeight * defuses;
  const rate = safeRate(objectivePoints, rounds);
  const metrics = { bombPlants: plants, bombDefuses: defuses, objectivePoints, objectivePointsPerRound: rate };
  if (match.scenario !== 'BOMB') {
    return unavailableMeasurement('OBJECTIVE_SPECIALIST', ['BOMB_SCENARIO_REQUIRED'], metrics, player.evidence.OBJECTIVE_SPECIALIST);
  }
  if (plants === null || defuses === null || objectivePoints === null || rate === null) {
    return unavailableMeasurement('OBJECTIVE_SPECIALIST', ['ANALYTICS_VALUE_UNAVAILABLE'], metrics, player.evidence.OBJECTIVE_SPECIALIST);
  }
  const thresholds = [
    minimumThreshold('objectivePoints', objectivePoints, policy.minimumPoints),
    minimumThreshold('bombDefuses', defuses, policy.minimumDefuses),
    minimumThreshold('bombPlantsAlternative', plants, policy.alternativeMinimumPlants),
  ];
  const gatePassed = objectivePoints >= policy.minimumPoints
    && (defuses >= policy.minimumDefuses || plants >= policy.alternativeMinimumPlants);
  return availableMeasurement('OBJECTIVE_SPECIALIST', metrics, thresholds, rate,
    clamp(objectivePoints / policy.targetPoints), 0, player.evidence.OBJECTIVE_SPECIALIST, gatePassed);
}

function availableMeasurement(
  specializationId: EvpSpecializationId,
  sourceMetrics: Record<string, number | null>,
  thresholds: EvpThresholdCheck[],
  comparisonScalar: number,
  absoluteStrength: number,
  evidencePenalty: number,
  evidence: EvpEvidence | undefined,
  gatePassed = thresholds.every((threshold) => threshold.passed),
): SpecializationMeasurement {
  return {
    specializationId,
    evidenceGroup: EVIDENCE_GROUPS[specializationId],
    availabilityReasons: [],
    sourceMetrics,
    thresholds,
    comparisonScalar,
    absoluteGatePassed: gatePassed,
    absoluteStrength,
    evidencePenalty,
    evidence: normalizedEvidence(evidence),
    relative: null,
    achievementStrength: null,
    qualified: false,
  };
}

function measureSpecialization(specializationId: EvpSpecializationId, player: EvpPlayerInput, match: EvpMatchInput): SpecializationMeasurement {
  switch (specializationId) {
    case 'FLASH_SUPPORT': return flashMeasurement(player, match);
    case 'NON_FLASH_ASSIST_SUPPORT': return assistMeasurement(player);
    case 'TRADE_SPECIALIST': return tradeMeasurement(player);
    case 'CLUTCH_SPECIALIST': return clutchMeasurement(player, match);
    case 'MULTIKILL_SPECIALIST': return multikillMeasurement(player);
    case 'ENTRY_SPECIALIST': return entryMeasurement(player);
    case 'UTILITY_DAMAGE_SPECIALIST': return utilityMeasurement(player, match);
    case 'OBJECTIVE_SPECIALIST': return objectiveMeasurement(player, match);
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function applyRelativeComparison(measurements: readonly SpecializationMeasurement[]): void {
  const valid = measurements.filter((measurement) => measurement.comparisonScalar !== null && measurement.availabilityReasons.length === 0);
  if (valid.length < EVP_POLICY_V1.comparison.minimumPoolSize) {
    for (const measurement of valid) measurement.availabilityReasons.push('INSUFFICIENT_COMPARISON_POOL');
    return;
  }
  const values = valid.map((measurement) => measurement.comparisonScalar!);
  const center = median(values);
  for (const measurement of valid) {
    const scalar = measurement.comparisonScalar!;
    const higher = values.filter((value) => value > scalar).length;
    const equal = values.filter((value) => value === scalar).length;
    const averageRank = higher + (equal + 1) / 2;
    const rankSignal = 1 - (averageRank - 1) / (valid.length - 1);
    const medianGap = clamp((scalar - center) / Math.max(Math.abs(scalar), Number.EPSILON));
    const dominance = EVP_POLICY_V1.comparison.rankWeight * rankSignal
      + EVP_POLICY_V1.comparison.medianGapWeight * medianGap;
    const strength = clamp(
      EVP_POLICY_V1.qualification.absoluteWeight * measurement.absoluteStrength!
        + EVP_POLICY_V1.qualification.dominanceWeight * dominance
        - measurement.evidencePenalty!,
    );
    measurement.relative = { comparisonPoolSize: valid.length, averageRank, median: center, rankSignal, medianGap, dominance };
    measurement.achievementStrength = strength;
    measurement.qualified = measurement.absoluteGatePassed && strength >= EVP_POLICY_V1.qualification.minimumScore;
  }
}

function evaluateTeamHarm(player: EvpPlayerInput): EvpTeamHarmResult {
  const teamKills = safeValue(player.metrics.teamKills);
  const teamDamage = safeValue(player.metrics.teamDamage);
  const damageRate = safeRate(teamDamage, player.participation.verifiedRounds);
  const teamKillsAvailable = teamKills !== null;
  const teamDamageAvailable = teamDamage !== null;
  const teamDamagePerVerifiedRoundAvailable = damageRate !== null;
  const severeTeamKills = teamKillsAvailable && teamKills >= EVP_POLICY_V1.teamHarm.severeTeamKills;
  const combinedTeamHarm = teamKillsAvailable
    && teamDamagePerVerifiedRoundAvailable
    && teamKills >= EVP_POLICY_V1.teamHarm.combinedTeamKills
    && damageRate >= EVP_POLICY_V1.teamHarm.combinedTeamDamagePerRound;
  return {
    available: teamKillsAvailable && teamDamagePerVerifiedRoundAvailable,
    teamKillsAvailable,
    teamDamageAvailable,
    teamDamagePerVerifiedRoundAvailable,
    teamKills,
    teamDamage,
    teamDamagePerVerifiedRound: damageRate,
    disqualified: severeTeamKills || combinedTeamHarm,
  };
}

function evidenceCount(measurement: SpecializationMeasurement): number {
  return measurement.evidence.eventIds.length + measurement.evidence.roundIds.length;
}

function compareSpecializations(left: SpecializationMeasurement, right: SpecializationMeasurement): number {
  return (right.achievementStrength ?? 0) - (left.achievementStrength ?? 0)
    || (right.absoluteStrength ?? 0) - (left.absoluteStrength ?? 0)
    || evidenceCount(right) - evidenceCount(left)
    || left.specializationId.localeCompare(right.specializationId);
}

function hasIndependentEventEvidence(primary: SpecializationMeasurement, candidate: SpecializationMeasurement): boolean {
  if (primary.evidenceGroup === candidate.evidenceGroup) return false;
  if (primary.evidence.quality !== 'VERIFIED_EVENTS' || candidate.evidence.quality !== 'VERIFIED_EVENTS') return false;
  if (primary.evidence.eventIds.length === 0 || candidate.evidence.eventIds.length === 0) return false;
  const primaryEvents = new Set(primary.evidence.eventIds);
  return candidate.evidence.eventIds.every((eventId) => !primaryEvents.has(eventId));
}

function evaluatePlayerCandidate(evaluation: PlayerEvaluation): void {
  const qualified = [...evaluation.measurements.values()].filter((measurement) => measurement.qualified).sort(compareSpecializations);
  evaluation.primary = qualified[0] ?? null;
  if (!evaluation.primary) return;
  evaluation.secondary = qualified.find((measurement) => hasIndependentEventEvidence(evaluation.primary!, measurement)) ?? null;
  evaluation.secondaryBonus = evaluation.secondary
    ? EVP_POLICY_V1.secondaryBonusWeight * evaluation.secondary.achievementStrength!
    : 0;
  evaluation.candidateStrength = evaluation.primary.achievementStrength! + evaluation.secondaryBonus;
}

function toSpecializationResult(measurement: SpecializationMeasurement, verifiedRounds: number): EvpSpecializationResult {
  const reasons = [...measurement.availabilityReasons];
  if (reasons.length === 0 && !measurement.absoluteGatePassed) reasons.push('BELOW_ABSOLUTE_GATE');
  if (reasons.length === 0 && !measurement.qualified) reasons.push('BELOW_QUALIFICATION_SCORE');
  return {
    specializationId: measurement.specializationId,
    evidenceGroup: measurement.evidenceGroup,
    availability: measurement.availabilityReasons.length === 0 ? 'AVAILABLE' : 'UNAVAILABLE',
    reasonCodes: reasons,
    sourceMetrics: measurement.sourceMetrics,
    thresholds: measurement.thresholds,
    verifiedRounds,
    comparisonScalar: measurement.comparisonScalar,
    absoluteGatePassed: measurement.absoluteGatePassed,
    absoluteStrength: measurement.absoluteStrength,
    evidencePenalty: measurement.evidencePenalty,
    relative: measurement.relative,
    achievementStrength: measurement.achievementStrength,
    qualified: measurement.qualified,
    evidence: measurement.evidence,
  };
}

function compareCandidates(left: PlayerEvaluation, right: PlayerEvaluation): number {
  return right.candidateStrength! - left.candidateStrength!
    || right.primary!.achievementStrength! - left.primary!.achievementStrength!
    || right.primary!.absoluteStrength! - left.primary!.absoluteStrength!
    || evidenceCount(right.primary!) - evidenceCount(left.primary!)
    || left.input.playerId.localeCompare(right.input.playerId);
}

function matchApplicability(input: EvpMatchInput): EvpReasonCode[] {
  if (input.players.length === 0) return ['NO_PLAYERS'];
  if (input.mvpPlayerId === null) return ['MVP_UNAVAILABLE'];
  if (!input.players.some((player) => player.playerId === input.mvpPlayerId)) return ['MVP_NOT_IN_PLAYER_POOL'];
  return [];
}

function playerStatus(
  evaluation: PlayerEvaluation,
  applicable: boolean,
  selectedIds: ReadonlySet<string>,
  mvpPlayerId: string | null,
): { status: EvpPlayerStatus; reasons: EvpReasonCode[] } {
  if (!applicable || evaluation.participationReasons.length > 0) return { status: 'NOT_APPLICABLE', reasons: [...evaluation.participationReasons] };
  if (!evaluation.primary) return { status: 'NOT_QUALIFIED', reasons: ['NO_QUALIFYING_SPECIALIZATION'] };
  if (evaluation.input.playerId === mvpPlayerId) return { status: 'MVP_EXCLUDED', reasons: ['MVP_EXCLUDED'] };
  if (evaluation.harm.disqualified) return { status: 'TEAM_HARM_DISQUALIFIED', reasons: ['SEVERE_CONFIRMED_TEAM_HARM'] };
  if (selectedIds.has(evaluation.input.playerId)) return { status: 'AWARDED', reasons: [] };
  return { status: 'QUALIFIED_NOT_SELECTED', reasons: ['NOT_SELECTED_TOP_TWO'] };
}

/** Pure experimental EVP calculation. It does not read H2 rank/value or perform I/O. */
export function calculateEvpAwards(input: EvpMatchInput): EvpCalculationResult {
  const uniqueIds = new Set(input.players.map((player) => player.playerId));
  if (uniqueIds.size !== input.players.length) throw new Error('EVP input contains duplicate player IDs');

  const maximumVerifiedRounds = input.players.reduce((maximum, player) => Math.max(maximum, player.participation.verifiedRounds), 0);
  const minimumExposure = Math.max(
    EVP_POLICY_V1.exposure.minimumVerifiedRounds,
    Math.ceil(EVP_POLICY_V1.exposure.minimumMatchRatio * maximumVerifiedRounds),
  );
  const evaluations: PlayerEvaluation[] = input.players.map((player) => {
    const reasons = participationReasons(player, minimumExposure);
    const measurements = new Map<EvpSpecializationId, SpecializationMeasurement>();
    for (const specializationId of EVP_SPECIALIZATION_IDS) {
      const measurement = reasons.length === 0
        ? measureSpecialization(specializationId, player, input)
        : unavailableMeasurement(specializationId, reasons, {}, player.evidence[specializationId]);
      measurements.set(specializationId, measurement);
    }
    return {
      input: player,
      participationReasons: reasons,
      measurements,
      harm: evaluateTeamHarm(player),
      primary: null,
      secondary: null,
      secondaryBonus: 0,
      candidateStrength: null,
    };
  });

  for (const specializationId of EVP_SPECIALIZATION_IDS) {
    applyRelativeComparison(evaluations.map((evaluation) => evaluation.measurements.get(specializationId)!));
  }
  for (const evaluation of evaluations) evaluatePlayerCandidate(evaluation);

  const applicabilityReasons = matchApplicability(input);
  const applicable = applicabilityReasons.length === 0;
  const candidates = applicable
    ? evaluations.filter((evaluation) => evaluation.primary !== null
      && evaluation.input.playerId !== input.mvpPlayerId
      && !evaluation.harm.disqualified
      && evaluation.participationReasons.length === 0).sort(compareCandidates)
    : [];
  const selected = candidates.slice(0, EVP_POLICY_V1.maxAwards);
  const selectedIds = new Set(selected.map((evaluation) => evaluation.input.playerId));
  const awards = selected.map((evaluation, index): EvpAward => ({
    position: (index + 1) as 1 | 2,
    playerId: evaluation.input.playerId,
    specializationId: evaluation.primary!.specializationId,
    achievementStrength: evaluation.primary!.achievementStrength!,
    candidateStrength: evaluation.candidateStrength!,
  }));
  const players = evaluations.map((evaluation): EvpPlayerResult => {
    const status = playerStatus(evaluation, applicable, selectedIds, input.mvpPlayerId);
    return {
      playerId: evaluation.input.playerId,
      teamId: evaluation.input.teamId,
      status: status.status,
      reasonCodes: status.reasons,
      candidateStrength: evaluation.candidateStrength,
      primarySpecializationId: evaluation.primary?.specializationId ?? null,
      secondarySpecializationId: evaluation.secondary?.specializationId ?? null,
      secondaryBonus: evaluation.secondaryBonus,
      teamHarm: evaluation.harm,
      specializations: EVP_SPECIALIZATION_IDS.map((specializationId) => toSpecializationResult(
        evaluation.measurements.get(specializationId)!,
        evaluation.input.participation.verifiedRounds,
      )),
    };
  }).sort((left, right) => left.playerId.localeCompare(right.playerId));

  return {
    policyId: EVP_POLICY_ID,
    experimental: true,
    calibrated: false,
    matchId: input.matchId,
    applicable,
    reasonCodes: applicabilityReasons,
    awards,
    players,
  };
}
