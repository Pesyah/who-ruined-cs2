import type { MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  projectParticipationRatings,
  selectParticipationAwards,
  type ParticipationEpisodeContribution,
  type ParticipationRatingPreparedProfile,
  type ParticipationRatingProjection,
} from '../index.js';

export const H2_E6_ECONOMY_CONTRACT_VERSION = 'h2-e6-economy@1-research' as const;

export type EconomyAvailability = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
export type EconomySnapshotPhase = 'FREEZE_END' | 'ROUND_END';

export type H2E6ResearchProfile = ParticipationRatingPreparedProfile & {
  countedRoundIds: readonly string[];
};

export type EquipmentSnapshotObservation = {
  evidenceId: string;
  matchId: string;
  roundId: string;
  playerId: string;
  teamId: string;
  side: 'T' | 'CT' | null;
  tick: number;
  phase: EconomySnapshotPhase;
  equipmentValue: number | null;
  roundStartEquipmentValue: number | null;
  inventory: readonly string[] | null;
  activeWeapon: string | null;
  activeWeaponEntityId: number | null;
  armor: number | null;
  hasHelmet: boolean | null;
  hasDefuser: boolean | null;
  balance: number | null;
  cashSpentThisRound: number | null;
  totalCashSpent: number | null;
  alive: boolean | null;
  provenance: 'NORMALIZED_FREEZE_SNAPSHOT' | 'RAW_DEMOPARSER_TICK' | 'SYNTHETIC_TEST';
};

export type EquipmentSnapshot = EquipmentSnapshotObservation & {
  primaryWeapon: string | null;
  secondaryWeapon: string | null;
  grenades: string[] | null;
  availability: EconomyAvailability;
  reasons: string[];
  duplicateEvidenceIds: string[];
};

export type ItemObservation = {
  evidenceId: string;
  roundId: string;
  tick: number;
  kind: 'PURCHASE' | 'PICKUP' | 'DROP';
  playerId: string | null;
  item: string | null;
  defIndex: number | null;
  entityId: number | null;
  previousOwnerPlayerId: string | null;
  availability: EconomyAvailability;
  reasons: readonly string[];
};

export type EquipmentTransition = {
  transitionId: string;
  kind: 'PURCHASE' | 'PICKUP_ONLY' | 'DROP_ONLY' | 'CONFIRMED_TRANSFER' | 'CONFIRMED_CARRYOVER' | 'SAME_TYPE_ONLY';
  availability: EconomyAvailability;
  roundId: string;
  nextRoundId: string | null;
  item: string | null;
  entityId: number | null;
  fromPlayerId: string | null;
  toPlayerId: string | null;
  evidenceIds: string[];
  reasons: string[];
};

export type EconomyCombatCandidate = {
  candidateId: string;
  sourceEventId: string;
  h2AnchorIds: string[];
  roundId: string;
  playerId: string;
  targetId: string;
  teamId: string;
  targetTeamId: string;
  kind: 'ENEMY_KILL' | 'ENEMY_HP_DAMAGE' | 'ENEMY_ARMOR_DAMAGE';
  amount: number;
  actorEquipmentValue: number;
  targetEquipmentValue: number | null;
  actorTeamMedian: number;
  opponentTeamMedian: number;
  relativeLoadout: number;
  targetRelativeLoadout: number | null;
  existingLowEquipmentContext: boolean;
  evidenceIds: string[];
  availability: 'AVAILABLE';
};

export type EconomyRejection = {
  sourceEventIds: string[];
  roundId: string | null;
  playerId: string | null;
  reasons: string[];
};

export type EconomyAttributionLedgerRow = {
  candidateId: string;
  sourceEventId: string;
  equipmentEvidenceIds: string[];
  existingH2AnchorIds: string[];
  existingContextTags: string[];
  existingPhysicalBase: number | null;
  proposedBReplacementDelta: number;
  proposedCIncrementalDelta: number;
  overlap: 'EXISTING_LOW_EQUIP_CONTEXT' | 'EXISTING_COMBAT_ANCHOR' | 'NO_H2_ANCHOR';
  inclusion: 'INCLUDED' | 'EXCLUDED_UNAVAILABLE' | 'EXCLUDED_DUPLICATE_PHYSICAL_FACT';
  reason: string;
};

export type EconomyModelId =
  | 'E6_A_FACTS_ONLY'
  | 'E6_B_LOW_EQUIPMENT_CONTEXT_REALLOCATION'
  | 'E6_C_BOUNDED_COMBAT_EFFICIENCY'
  | 'E6_D_CONFIRMED_EQUIPMENT_CARRYOVER';

export type EconomyPlayerProjection = {
  playerId: string;
  teamId: string;
  baselineRating: number | null;
  experimentalRating: number | null;
  contribution: number | null;
  diagnosticOnly: boolean;
  capped: boolean;
  reconstructionError: number | null;
};

export type EconomyModelResult = {
  modelId: EconomyModelId;
  projections: EconomyPlayerProjection[];
  hypotheticalAwards: ReturnType<typeof selectParticipationAwards>;
};

export type EconomyResearchContract = {
  schemaVersion: typeof H2_E6_ECONOMY_CONTRACT_VERSION;
  matchId: string;
  snapshots: EquipmentSnapshot[];
  transitions: EquipmentTransition[];
  combatCandidates: EconomyCombatCandidate[];
  rejections: EconomyRejection[];
  attributionLedger: EconomyAttributionLedgerRow[];
  baseline: ParticipationRatingProjection[];
  baselineAwards: ReturnType<typeof selectParticipationAwards>;
  models: EconomyModelResult[];
  diagnostics: {
    snapshotAvailability: Record<EconomyAvailability, number>;
    rejectionReasons: Record<string, number>;
    lowEquipmentCombatActions: number;
    existingLowEquipmentOverlap: number;
    confirmedPickups: number;
    confirmedDrops: number;
    confirmedTransfers: number;
    confirmedCarryovers: number;
    cappedContributions: number;
  };
};

const EVENT_CAP = 0.012;
const ROUND_CAP = 0.03;
const MATCH_CAP = 0.12;
const CURRENT_LOW_EQUIPMENT_MODIFIER = 1.03;
const MINIMUM_COMPARISON_PLAYERS = 2;

const GRENADE_NAMES = ['flashbang', 'smoke', 'grenade', 'molotov', 'incendiary', 'decoy'];
const SECONDARY_NAMES = ['glock', 'p2000', 'usp', 'p250', 'tec-9', 'five-seven', 'cz75', 'deagle', 'revolver', 'dual berettas'];

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizedName(value: string): string {
  return value.toLowerCase().replace(/^weapon_/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isGrenade(value: string): boolean {
  const name = normalizedName(value);
  return GRENADE_NAMES.some((candidate) => name.includes(candidate));
}

function isSecondary(value: string): boolean {
  const name = normalizedName(value);
  return SECONDARY_NAMES.some((candidate) => name.includes(candidate));
}

function isUtilityOrKnife(value: string): boolean {
  const name = normalizedName(value);
  return isGrenade(name) || name.includes('knife') || name === 'c4' || name.includes('healthshot');
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function count(values: Iterable<string>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1]! + ordered[middle]!) / 2
    : ordered[middle]!;
}

function scoreInput(profile: H2E6ResearchProfile): ParticipationRatingPreparedProfile {
  return {
    profileKey: profile.profileKey,
    playerId: profile.playerId,
    teamId: profile.teamId,
    status: profile.status,
    reason: profile.reason,
    prepared: profile.prepared,
  };
}

function episodes(profile: H2E6ResearchProfile): ParticipationEpisodeContribution[] {
  return profile.prepared.p4CPlus.episodeContributions
    ?? profile.prepared.p4BPlus.episodeContributions
    ?? [];
}

function snapshotKey(row: Pick<EquipmentSnapshotObservation, 'roundId' | 'playerId' | 'phase'>): string {
  return `${row.roundId}|${row.playerId}|${row.phase}`;
}

function snapshotComparable(row: EquipmentSnapshotObservation): string {
  return JSON.stringify({
    teamId: row.teamId,
    side: row.side,
    provenance: row.provenance,
    tick: row.tick,
    equipmentValue: row.equipmentValue,
    roundStartEquipmentValue: row.roundStartEquipmentValue,
    inventory: row.inventory ? [...row.inventory].sort() : null,
    activeWeapon: row.activeWeapon,
    activeWeaponEntityId: row.activeWeaponEntityId,
    armor: row.armor,
    hasHelmet: row.hasHelmet,
    hasDefuser: row.hasDefuser,
    balance: row.balance,
    cashSpentThisRound: row.cashSpentThisRound,
    totalCashSpent: row.totalCashSpent,
    alive: row.alive,
  });
}

function enrichSnapshot(
  row: EquipmentSnapshotObservation,
  duplicateEvidenceIds: string[],
  reasons: string[] = [],
): EquipmentSnapshot {
  const inventory = row.inventory ? [...row.inventory].sort() : null;
  if (row.equipmentValue === null) reasons.push('EQUIPMENT_VALUE_MISSING');
  if (inventory === null) reasons.push('INVENTORY_MISSING');
  if (row.balance === null) reasons.push('BALANCE_MISSING');
  if (row.cashSpentThisRound === null) reasons.push('SPEND_MISSING');
  const nonUtility = inventory?.filter((item) => !isUtilityOrKnife(item)) ?? [];
  const secondary = nonUtility.find(isSecondary) ?? null;
  const primary = nonUtility.find((item) => !isSecondary(item)) ?? null;
  return {
    ...row,
    inventory,
    primaryWeapon: primary,
    secondaryWeapon: secondary,
    grenades: inventory?.filter(isGrenade) ?? null,
    availability: row.equipmentValue === null
      ? 'UNAVAILABLE'
      : reasons.length === 0 ? 'AVAILABLE' : 'PARTIAL',
    reasons: uniqueSorted(reasons),
    duplicateEvidenceIds: uniqueSorted(duplicateEvidenceIds),
  };
}

export function reconstructEquipmentSnapshots(
  observations: readonly EquipmentSnapshotObservation[],
): { snapshots: EquipmentSnapshot[]; rejections: EconomyRejection[] } {
  const grouped = new Map<string, EquipmentSnapshotObservation[]>();
  for (const row of observations) {
    const rows = grouped.get(snapshotKey(row)) ?? [];
    rows.push(row);
    grouped.set(snapshotKey(row), rows);
  }
  const snapshots: EquipmentSnapshot[] = [];
  const rejections: EconomyRejection[] = [];
  for (const rows of grouped.values()) {
    const byEvidence = new Map<string, EquipmentSnapshotObservation[]>();
    for (const row of rows) {
      const duplicates = byEvidence.get(row.evidenceId) ?? [];
      duplicates.push(row);
      byEvidence.set(row.evidenceId, duplicates);
    }
    const duplicateIds = [...byEvidence.entries()]
      .filter(([, duplicates]) => duplicates.length > 1)
      .map(([id]) => id);
    const variants = new Set(rows.map(snapshotComparable));
    const ordered = [...rows].sort((left, right) => left.tick - right.tick
      || left.evidenceId.localeCompare(right.evidenceId)
      || snapshotComparable(left).localeCompare(snapshotComparable(right)));
    if (variants.size !== 1) {
      const first = ordered[0]!;
      snapshots.push(enrichSnapshot({
        ...first,
        equipmentValue: null,
        roundStartEquipmentValue: null,
        inventory: null,
        activeWeapon: null,
        activeWeaponEntityId: null,
        balance: null,
        cashSpentThisRound: null,
        totalCashSpent: null,
        side: null,
        armor: null,
        hasHelmet: null,
        hasDefuser: null,
        alive: null,
      }, duplicateIds, ['CONFLICTING_SNAPSHOTS', 'NO_ARBITRARY_SNAPSHOT_SELECTION']));
      rejections.push({
        sourceEventIds: uniqueSorted(ordered.map((row) => row.evidenceId)),
        roundId: first.roundId,
        playerId: first.playerId,
        reasons: ['CONFLICTING_SNAPSHOTS'],
      });
      continue;
    }
    snapshots.push(enrichSnapshot(ordered[0]!, duplicateIds,
      duplicateIds.length > 0 ? ['DUPLICATE_EVIDENCE_ID_DEDUPLICATED'] : []));
  }
  snapshots.sort((left, right) => left.roundId.localeCompare(right.roundId)
    || left.playerId.localeCompare(right.playerId) || left.phase.localeCompare(right.phase));
  rejections.sort((left, right) => (left.roundId ?? '').localeCompare(right.roundId ?? '')
    || (left.playerId ?? '').localeCompare(right.playerId ?? '')
    || (left.sourceEventIds[0] ?? '').localeCompare(right.sourceEventIds[0] ?? ''));
  return { snapshots, rejections };
}

function transitionOrder(left: ItemObservation, right: ItemObservation): number {
  return left.tick - right.tick || left.evidenceId.localeCompare(right.evidenceId);
}

function itemTransitions(observations: readonly ItemObservation[]): EquipmentTransition[] {
  const ordered = [...observations].sort(transitionOrder);
  const transitions: EquipmentTransition[] = [];
  const usedPickups = new Set<string>();
  const usedDrops = new Set<string>();
  for (const row of ordered) {
    if (row.kind === 'PURCHASE') {
      transitions.push({
        transitionId: `purchase:${row.evidenceId}`,
        kind: 'PURCHASE',
        availability: row.availability,
        roundId: row.roundId,
        nextRoundId: null,
        item: row.item,
        entityId: row.entityId,
        fromPlayerId: null,
        toPlayerId: row.playerId,
        evidenceIds: [row.evidenceId],
        reasons: uniqueSorted(row.reasons),
      });
      continue;
    }
    if (row.kind !== 'DROP') continue;
    const pickup = ordered.find((candidate) => candidate.kind === 'PICKUP'
      && !usedPickups.has(candidate.evidenceId)
      && candidate.tick >= row.tick
      && candidate.entityId !== null
      && row.entityId !== null
      && candidate.entityId === row.entityId
      && candidate.playerId !== null
      && candidate.playerId !== row.playerId);
    if (!pickup) continue;
    usedDrops.add(row.evidenceId);
    usedPickups.add(pickup.evidenceId);
    transitions.push({
      transitionId: `transfer:${row.evidenceId}:${pickup.evidenceId}`,
      kind: 'CONFIRMED_TRANSFER',
      availability: row.availability === 'AVAILABLE' && pickup.availability === 'AVAILABLE'
        ? 'AVAILABLE' : 'PARTIAL',
      roundId: row.roundId,
      nextRoundId: pickup.roundId === row.roundId ? null : pickup.roundId,
      item: row.item === pickup.item ? row.item : pickup.item,
      entityId: row.entityId,
      fromPlayerId: row.playerId,
      toPlayerId: pickup.playerId,
      evidenceIds: [row.evidenceId, pickup.evidenceId],
      reasons: uniqueSorted([...row.reasons, ...pickup.reasons]),
    });
  }
  for (const row of ordered.filter((candidate) => candidate.kind === 'PICKUP')) {
    if (usedPickups.has(row.evidenceId)) continue;
    transitions.push({
      transitionId: `pickup:${row.evidenceId}`,
      kind: 'PICKUP_ONLY',
      availability: row.availability === 'AVAILABLE' && row.entityId !== null ? 'PARTIAL' : row.availability,
      roundId: row.roundId,
      nextRoundId: null,
      item: row.item,
      entityId: row.entityId,
      fromPlayerId: row.previousOwnerPlayerId,
      toPlayerId: row.playerId,
      evidenceIds: [row.evidenceId],
      reasons: uniqueSorted([...row.reasons, 'DONOR_NOT_CONFIRMED']),
    });
  }
  for (const row of ordered.filter((candidate) => candidate.kind === 'DROP')) {
    if (usedDrops.has(row.evidenceId)) continue;
    transitions.push({
      transitionId: `drop:${row.evidenceId}`,
      kind: 'DROP_ONLY',
      availability: row.availability,
      roundId: row.roundId,
      nextRoundId: null,
      item: row.item,
      entityId: row.entityId,
      fromPlayerId: row.playerId,
      toPlayerId: null,
      evidenceIds: [row.evidenceId],
      reasons: uniqueSorted([...row.reasons, 'RECIPIENT_NOT_CONFIRMED']),
    });
  }
  return transitions.sort((left, right) => left.roundId.localeCompare(right.roundId)
    || left.transitionId.localeCompare(right.transitionId));
}

function carryovers(match: MatchData, snapshots: readonly EquipmentSnapshot[]): EquipmentTransition[] {
  const rounds = [...match.rounds].sort((left, right) => left.ordinal - right.ordinal);
  const byKey = new Map(snapshots.map((snapshot) => [snapshotKey(snapshot), snapshot]));
  const result: EquipmentTransition[] = [];
  for (let index = 0; index + 1 < rounds.length; index += 1) {
    const round = rounds[index]!;
    const next = rounds[index + 1]!;
    for (const player of match.players) {
      const end = byKey.get(`${round.id}|${player.id}|ROUND_END`);
      const start = byKey.get(`${next.id}|${player.id}|FREEZE_END`);
      if (!end || !start || end.alive !== true) continue;
      const evidenceIds = [end.evidenceId, start.evidenceId];
      if (end.activeWeaponEntityId !== null && end.activeWeaponEntityId > 0
        && end.activeWeaponEntityId === start.activeWeaponEntityId
        && end.activeWeapon !== null && end.activeWeapon === start.activeWeapon) {
        result.push({
          transitionId: `carryover:${round.id}:${next.id}:${player.id}:${end.activeWeaponEntityId}`,
          kind: 'CONFIRMED_CARRYOVER',
          availability: 'AVAILABLE',
          roundId: round.id,
          nextRoundId: next.id,
          item: end.activeWeapon,
          entityId: end.activeWeaponEntityId,
          fromPlayerId: player.id,
          toPlayerId: player.id,
          evidenceIds,
          reasons: [],
        });
      } else if (end.activeWeapon !== null && end.activeWeapon === start.activeWeapon) {
        result.push({
          transitionId: `same-type:${round.id}:${next.id}:${player.id}`,
          kind: 'SAME_TYPE_ONLY',
          availability: 'PARTIAL',
          roundId: round.id,
          nextRoundId: next.id,
          item: end.activeWeapon,
          entityId: null,
          fromPlayerId: player.id,
          toPlayerId: player.id,
          evidenceIds,
          reasons: ['ITEM_IDENTITY_UNAVAILABLE'],
        });
      }
    }
  }
  return result;
}

function teamRelation(
  teamByPlayer: ReadonlyMap<string, string>,
  actorId: string | null,
  targetId: string | null,
): 'ENEMY' | 'FRIENDLY' | 'SELF' | 'UNKNOWN' {
  if (!actorId || !targetId) return 'UNKNOWN';
  if (actorId === targetId) return 'SELF';
  const actor = teamByPlayer.get(actorId);
  const target = teamByPlayer.get(targetId);
  if (!actor || !target) return 'UNKNOWN';
  return actor === target ? 'FRIENDLY' : 'ENEMY';
}

function eventOrder(left: MatchEvent, right: MatchEvent): number {
  return left.tick - right.tick
    || left.source.rowIndex - right.source.rowIndex
    || left.id.localeCompare(right.id);
}

function resolveH2Anchors(
  match: MatchData,
  event: MatchEvent,
  profile: H2E6ResearchProfile | undefined,
): string[] {
  if (!profile) return [];
  const known = new Set(episodes(profile).map((episode) => episode.anchorId));
  if (known.has(event.id)) return [event.id];
  if (event.kind !== 'PLAYER_DEATH') return [];
  const matches = match.events.filter((candidate) => candidate.kind === 'PLAYER_HURT'
    && known.has(candidate.id)
    && candidate.roundId === event.roundId
    && candidate.actorId === event.actorId
    && candidate.targetId === event.targetId
    && candidate.attrs.healthAfter === 0
    && eventOrder(candidate, event) < 0
    && event.tick - candidate.tick <= 1);
  return matches.length === 1 ? [matches[0]!.id] : [];
}

function candidateKind(event: MatchEvent): Array<{ kind: EconomyCombatCandidate['kind']; amount: number }> {
  if (event.kind === 'PLAYER_DEATH') return [{ kind: 'ENEMY_KILL', amount: 1 }];
  if (event.kind !== 'PLAYER_HURT') return [];
  const result: Array<{ kind: EconomyCombatCandidate['kind']; amount: number }> = [];
  if (finite(event.attrs.rawHealthDamage) && event.attrs.rawHealthDamage > 0) {
    result.push({ kind: 'ENEMY_HP_DAMAGE', amount: event.attrs.rawHealthDamage });
  }
  if (finite(event.attrs.rawArmorDamage) && event.attrs.rawArmorDamage > 0) {
    result.push({ kind: 'ENEMY_ARMOR_DAMAGE', amount: event.attrs.rawArmorDamage });
  }
  return result;
}

export function extractEconomyCombatEvidence(
  match: MatchData,
  snapshots: readonly EquipmentSnapshot[],
  profiles: readonly H2E6ResearchProfile[],
): { candidates: EconomyCombatCandidate[]; rejections: EconomyRejection[] } {
  const profileByPlayer = new Map(profiles.map((profile) => [profile.playerId, profile]));
  const countedByPlayer = new Map(profiles.map((profile) => [profile.playerId, new Set(profile.countedRoundIds)]));
  const teamByPlayer = new Map(match.players.map((player) => [player.id, player.teamId]));
  const snapshotByKey = new Map(snapshots.filter((row) => row.phase === 'FREEZE_END')
    .map((row) => [snapshotKey(row), row]));
  const eventIdCounts = count(match.events.map((event) => event.id));
  const candidates: EconomyCombatCandidate[] = [];
  const rejections: EconomyRejection[] = [];
  for (const event of [...match.events].sort(eventOrder)) {
    if (event.kind !== 'PLAYER_HURT' && event.kind !== 'PLAYER_DEATH') continue;
    const reasons: string[] = [];
    if ((eventIdCounts[event.id] ?? 0) !== 1) reasons.push('DUPLICATE_EVENT_ID');
    const relation = teamRelation(teamByPlayer, event.actorId, event.targetId);
    if (relation !== 'ENEMY') reasons.push(`RELATION_${relation}`);
    if (!event.actorId || !event.targetId) reasons.push('ACTOR_OR_TARGET_UNKNOWN');
    if (event.actorId && !countedByPlayer.get(event.actorId)?.has(event.roundId)) reasons.push('ROUND_NOT_COUNTED_FOR_ACTOR');
    const actorSnapshot = event.actorId
      ? snapshotByKey.get(`${event.roundId}|${event.actorId}|FREEZE_END`) : undefined;
    if (!actorSnapshot || actorSnapshot.equipmentValue === null) reasons.push('ACTOR_EQUIPMENT_UNAVAILABLE');
    const actorTeamId = event.actorId ? teamByPlayer.get(event.actorId) : undefined;
    const targetTeamId = event.targetId ? teamByPlayer.get(event.targetId) : undefined;
    const expectedActorTeam = profiles.filter((profile) => profile.teamId === actorTeamId
      && profile.countedRoundIds.includes(event.roundId));
    const expectedOpponentTeam = profiles.filter((profile) => profile.teamId === targetTeamId
      && profile.countedRoundIds.includes(event.roundId));
    const actorTeamValues = expectedActorTeam.flatMap((profile) => {
      const value = snapshotByKey.get(`${event.roundId}|${profile.playerId}|FREEZE_END`)?.equipmentValue;
      return finite(value) ? [value] : [];
    });
    const opponentValues = expectedOpponentTeam.flatMap((profile) => {
      const value = snapshotByKey.get(`${event.roundId}|${profile.playerId}|FREEZE_END`)?.equipmentValue;
      return finite(value) ? [value] : [];
    });
    if (expectedActorTeam.length < MINIMUM_COMPARISON_PLAYERS
      || actorTeamValues.length !== expectedActorTeam.length) reasons.push('ACTOR_TEAM_COMPARISON_INCOMPLETE');
    if (expectedOpponentTeam.length < MINIMUM_COMPARISON_PLAYERS
      || opponentValues.length !== expectedOpponentTeam.length) reasons.push('OPPONENT_TEAM_COMPARISON_INCOMPLETE');
    const actorTeamMedian = median(actorTeamValues);
    const opponentTeamMedian = median(opponentValues);
    if (opponentTeamMedian === null || opponentTeamMedian <= 0) reasons.push('OPPONENT_MEDIAN_NOT_POSITIVE');
    const kinds = candidateKind(event);
    if (kinds.length === 0) reasons.push(event.kind === 'PLAYER_HURT'
      ? 'DAMAGE_AMOUNT_UNAVAILABLE' : 'NO_SUPPORTED_COMBAT_FACT');
    if (reasons.length > 0 || !event.actorId || !event.targetId || !actorTeamId || !targetTeamId
      || !actorSnapshot || actorSnapshot.equipmentValue === null
      || actorTeamMedian === null || opponentTeamMedian === null || opponentTeamMedian <= 0) {
      rejections.push({
        sourceEventIds: [event.id],
        roundId: event.roundId,
        playerId: event.actorId,
        reasons: uniqueSorted(reasons),
      });
      continue;
    }
    const profile = profileByPlayer.get(event.actorId);
    const h2AnchorIds = resolveH2Anchors(match, event, profile);
    const tags = profile ? episodes(profile)
      .filter((episode) => h2AnchorIds.includes(episode.anchorId))
      .flatMap((episode) => episode.tags) : [];
    const targetEquipmentValue = snapshotByKey
      .get(`${event.roundId}|${event.targetId}|FREEZE_END`)?.equipmentValue ?? null;
    for (const fact of kinds) {
      candidates.push({
        candidateId: `${event.id}:${fact.kind}`,
        sourceEventId: event.id,
        h2AnchorIds,
        roundId: event.roundId,
        playerId: event.actorId,
        targetId: event.targetId,
        teamId: actorTeamId,
        targetTeamId,
        kind: fact.kind,
        amount: fact.amount,
        actorEquipmentValue: actorSnapshot.equipmentValue,
        targetEquipmentValue,
        actorTeamMedian,
        opponentTeamMedian,
        relativeLoadout: actorSnapshot.equipmentValue / opponentTeamMedian,
        targetRelativeLoadout: targetEquipmentValue !== null && targetEquipmentValue > 0
          ? actorSnapshot.equipmentValue / targetEquipmentValue : null,
        existingLowEquipmentContext: tags.includes('LOW_EQUIP_COMBAT'),
        evidenceIds: uniqueSorted([actorSnapshot.evidenceId, ...[...expectedActorTeam, ...expectedOpponentTeam].flatMap((participant) => {
          const snapshot = snapshotByKey.get(`${event.roundId}|${participant.playerId}|FREEZE_END`);
          return snapshot ? [snapshot.evidenceId] : [];
        })]),
        availability: 'AVAILABLE',
      });
    }
  }
  candidates.sort((left, right) => left.roundId.localeCompare(right.roundId)
    || left.sourceEventId.localeCompare(right.sourceEventId) || left.kind.localeCompare(right.kind));
  return { candidates, rejections };
}

function ledger(
  candidates: readonly EconomyCombatCandidate[],
  profiles: readonly H2E6ResearchProfile[],
): EconomyAttributionLedgerRow[] {
  const profileByPlayer = new Map(profiles.map((profile) => [profile.playerId, profile]));
  return candidates.map((candidate) => {
    const profile = profileByPlayer.get(candidate.playerId);
    const matching = profile ? episodes(profile).filter((episode) => (
      candidate.h2AnchorIds.includes(episode.anchorId) && episode.base > 0
    )) : [];
    const tags = uniqueSorted(matching.flatMap((episode) => episode.tags));
    const physicalBase = matching.length === 1 ? matching[0]!.base : null;
    const refinedLowEquipment = candidate.opponentTeamMedian >= 2_500
      && candidate.actorTeamMedian < candidate.opponentTeamMedian
      && candidate.relativeLoadout <= 0.5;
    const shortfall = Math.max(0, Math.min(0.75, 1 - candidate.relativeLoadout));
    const proposedModifier = refinedLowEquipment ? 1 + Math.min(0.05, shortfall * 0.08) : 1;
    const existingDelta = candidate.existingLowEquipmentContext && physicalBase !== null
      ? physicalBase * (CURRENT_LOW_EQUIPMENT_MODIFIER - 1) : 0;
    const proposedB = physicalBase === null ? 0 : physicalBase * (proposedModifier - 1) - existingDelta;
    const proposedC = physicalBase === null || !refinedLowEquipment
      ? 0 : Math.min(EVENT_CAP, physicalBase * Math.min(0.2, shortfall * 0.25));
    return {
      candidateId: candidate.candidateId,
      sourceEventId: candidate.sourceEventId,
      equipmentEvidenceIds: candidate.evidenceIds,
      existingH2AnchorIds: candidate.h2AnchorIds,
      existingContextTags: tags,
      existingPhysicalBase: physicalBase,
      proposedBReplacementDelta: proposedB,
      proposedCIncrementalDelta: proposedC,
      overlap: candidate.existingLowEquipmentContext
        ? 'EXISTING_LOW_EQUIP_CONTEXT'
        : physicalBase !== null ? 'EXISTING_COMBAT_ANCHOR' : 'NO_H2_ANCHOR',
      inclusion: physicalBase === null ? 'EXCLUDED_UNAVAILABLE' : 'INCLUDED',
      reason: physicalBase === null
        ? 'NO_UNIQUE_POSITIVE_H2_ANCHOR_FOR_THE_PHYSICAL_ACTION'
        : candidate.existingLowEquipmentContext
          ? 'MODEL_B_REPLACES_EXISTING_LOW_EQUIP_CONTEXT;_MODEL_C_IS_DIAGNOSTIC_OVERLAP'
          : 'CONFIRMED_H2_ACTION_WITH_COMPARABLE_EQUIPMENT_CONTEXT',
    };
  });
}

type CappedContribution = { total: number; capped: boolean };

function cappedByPlayer(
  candidates: readonly EconomyCombatCandidate[],
  values: ReadonlyMap<string, number>,
): Map<string, CappedContribution> {
  const grouped = new Map<string, Map<string, EconomyCombatCandidate[]>>();
  for (const candidate of candidates) {
    const byRound = grouped.get(candidate.playerId) ?? new Map<string, EconomyCombatCandidate[]>();
    const rows = byRound.get(candidate.roundId) ?? [];
    rows.push(candidate);
    byRound.set(candidate.roundId, rows);
    grouped.set(candidate.playerId, byRound);
  }
  const result = new Map<string, CappedContribution>();
  for (const [playerId, rounds] of grouped) {
    let total = 0;
    let capped = false;
    for (const rows of rounds.values()) {
      const bySourceEvent = new Map<string, EconomyCombatCandidate[]>();
      for (const row of rows) {
        const eventRows = bySourceEvent.get(row.sourceEventId) ?? [];
        eventRows.push(row);
        bySourceEvent.set(row.sourceEventId, eventRows);
      }
      let roundValue = 0;
      for (const eventRows of bySourceEvent.values()) {
        // One physical event can expose kill, HP and armor views. Keep only the largest
        // proposed adjustment so the physical action is never paid three times.
        const eventValue = [...eventRows].map((row) => values.get(row.candidateId) ?? 0)
          .sort((left, right) => Math.abs(right) - Math.abs(left))[0] ?? 0;
        const bounded = Math.max(-EVENT_CAP, Math.min(EVENT_CAP, eventValue));
        capped ||= bounded !== eventValue;
        roundValue += bounded;
      }
      const boundedRound = Math.max(-ROUND_CAP, Math.min(ROUND_CAP, roundValue));
      capped ||= boundedRound !== roundValue;
      total += boundedRound;
    }
    const boundedMatch = Math.max(-MATCH_CAP, Math.min(MATCH_CAP, total));
    capped ||= boundedMatch !== total;
    result.set(playerId, { total: boundedMatch, capped });
  }
  return result;
}

function teamScores(match: MatchData): Array<{ teamId: string; score: number | null }> {
  const last = [...match.rounds].filter((round) => round.isValid)
    .sort((left, right) => right.ordinal - left.ordinal)[0];
  return match.teams.map((team) => ({ teamId: team.id, score: last?.scoreAfter[team.id] ?? null }));
}

function modelResult(
  modelId: EconomyModelId,
  match: MatchData,
  profiles: readonly H2E6ResearchProfile[],
  baseline: readonly ParticipationRatingProjection[],
  contributionByPlayer: ReadonlyMap<string, CappedContribution>,
  diagnosticOnly: boolean,
): EconomyModelResult {
  const projections = profiles.map((profile, index): EconomyPlayerProjection => {
    const base = baseline[index]!;
    if (base.status !== 'CALCULATED_RESEARCH_ONLY') {
      return {
        playerId: profile.playerId,
        teamId: profile.teamId,
        baselineRating: null,
        experimentalRating: null,
        contribution: null,
        diagnosticOnly,
        capped: false,
        reconstructionError: null,
      };
    }
    const capped = contributionByPlayer.get(profile.playerId) ?? { total: 0, capped: false };
    const delta = diagnosticOnly ? 0 : capped.total;
    const experimentalRating = base.rating + delta;
    return {
      playerId: profile.playerId,
      teamId: profile.teamId,
      baselineRating: base.rating,
      experimentalRating,
      contribution: delta,
      diagnosticOnly,
      capped: capped.capped,
      reconstructionError: Math.abs(experimentalRating - (base.rating + delta)),
    };
  });
  const adjusted = baseline.map((row, index) => row.status === 'CALCULATED_RESEARCH_ONLY'
    ? { ...row, rating: projections[index]!.experimentalRating! } : row);
  return {
    modelId,
    projections,
    hypotheticalAwards: selectParticipationAwards(adjusted, teamScores(match)),
  };
}

export function evaluateH2E6Economy(
  match: MatchData,
  profiles: readonly H2E6ResearchProfile[],
  observations: readonly EquipmentSnapshotObservation[],
  itemObservations: readonly ItemObservation[],
): EconomyResearchContract {
  const foreignSnapshot = observations.find((row) => row.matchId !== match.matchId);
  if (foreignSnapshot) throw new Error('H2_E6_SNAPSHOT_MATCH_BINDING_MISMATCH');
  const reconstruction = reconstructEquipmentSnapshots(observations);
  const transitions = [
    ...itemTransitions(itemObservations),
    ...carryovers(match, reconstruction.snapshots),
  ].sort((left, right) => left.roundId.localeCompare(right.roundId)
    || left.transitionId.localeCompare(right.transitionId));
  const combat = extractEconomyCombatEvidence(match, reconstruction.snapshots, profiles);
  const attributionLedger = ledger(combat.candidates, profiles);
  const baseline = projectParticipationRatings(profiles.map(scoreInput));
  const bValues = new Map(attributionLedger.map((row) => [row.candidateId, row.proposedBReplacementDelta]));
  const cValues = new Map(attributionLedger.map((row) => [row.candidateId, row.proposedCIncrementalDelta]));
  const bCapped = cappedByPlayer(combat.candidates, bValues);
  const cCapped = cappedByPlayer(combat.candidates, cValues);
  const empty = new Map<string, CappedContribution>();
  const models = [
    modelResult('E6_A_FACTS_ONLY', match, profiles, baseline, empty, true),
    modelResult('E6_B_LOW_EQUIPMENT_CONTEXT_REALLOCATION', match, profiles, baseline, bCapped, false),
    modelResult('E6_C_BOUNDED_COMBAT_EFFICIENCY', match, profiles, baseline, cCapped, false),
    modelResult('E6_D_CONFIRMED_EQUIPMENT_CARRYOVER', match, profiles, baseline, empty, true),
  ];
  const allRejections = [...reconstruction.rejections, ...combat.rejections]
    .sort((left, right) => (left.roundId ?? '').localeCompare(right.roundId ?? '')
      || (left.sourceEventIds[0] ?? '').localeCompare(right.sourceEventIds[0] ?? ''));
  return {
    schemaVersion: H2_E6_ECONOMY_CONTRACT_VERSION,
    matchId: match.matchId,
    snapshots: reconstruction.snapshots,
    transitions,
    combatCandidates: combat.candidates,
    rejections: allRejections,
    attributionLedger,
    baseline,
    baselineAwards: selectParticipationAwards(baseline, teamScores(match)),
    models,
    diagnostics: {
      snapshotAvailability: {
        AVAILABLE: reconstruction.snapshots.filter((row) => row.availability === 'AVAILABLE').length,
        PARTIAL: reconstruction.snapshots.filter((row) => row.availability === 'PARTIAL').length,
        UNAVAILABLE: reconstruction.snapshots.filter((row) => row.availability === 'UNAVAILABLE').length,
      },
      rejectionReasons: count(allRejections.flatMap((row) => row.reasons)),
      lowEquipmentCombatActions: combat.candidates.filter((row) => row.opponentTeamMedian >= 2_500
        && row.actorTeamMedian < row.opponentTeamMedian && row.relativeLoadout <= 0.5).length,
      existingLowEquipmentOverlap: combat.candidates.filter((row) => row.existingLowEquipmentContext).length,
      confirmedPickups: itemObservations.filter((row) => row.kind === 'PICKUP' && row.availability === 'AVAILABLE').length,
      confirmedDrops: itemObservations.filter((row) => row.kind === 'DROP' && row.availability === 'AVAILABLE').length,
      confirmedTransfers: transitions.filter((row) => row.kind === 'CONFIRMED_TRANSFER'
        && row.availability === 'AVAILABLE').length,
      confirmedCarryovers: transitions.filter((row) => row.kind === 'CONFIRMED_CARRYOVER').length,
      cappedContributions: models.flatMap((model) => model.projections).filter((row) => row.capped).length,
    },
  };
}
