import { createHash } from 'node:crypto';

import type { MatchData, MatchEvent } from '@who-ruined/contracts';
import {
  PARTICIPATION_FAMILY_POLICY,
  projectParticipationRatings,
  type ParticipationEpisodeContribution,
  type ParticipationPhysicalFamily,
  type ParticipationRatingPreparedProfile,
  type ParticipationRatingProjection,
} from '../index.js';

export const H2_E3_UTILITY_CONTRACT_VERSION = 'h2-e3-utility-contribution@1-research' as const;

export type UtilityType = 'HE' | 'FIRE' | 'FLASH' | 'SMOKE';
export type UtilityAvailability = 'AVAILABLE' | 'UNAVAILABLE';
export type UtilityObservationState = 'DETONATED' | 'EFFECT_CONFIRMED' | 'UNKNOWN';

export type UtilityUsageEvidence = {
  eventId: string;
  roundId: string;
  playerId: string;
  utilityType: UtilityType;
  observationState: Exclude<UtilityObservationState, 'UNKNOWN'>;
  tick: number;
  entityId: number | null;
};

export type UtilityRoundEvidence = {
  playerId: string;
  roundId: string;
  utilityType: UtilityType;
  usageEventIds: string[];
  effectEventIds: string[];
  friendlyEffectEventIds: string[];
  damageAnchorIds: string[];
  blindAnchorIds: string[];
  flashAssistAnchorIds: string[];
  linkedUsageEventIds: string[];
  effectLinkage: 'EXACT_ENTITY' | 'ROUND_LEVEL_ONLY' | 'NO_EFFECT' | 'UNAVAILABLE';
  enemyDamage: number | null;
  enemyBlindSeconds: number | null;
  flashAssists: number;
  effectivenessAvailability: UtilityAvailability;
  unavailableReasons: string[];
};

export type UtilityEvidenceContract = {
  schemaVersion: typeof H2_E3_UTILITY_CONTRACT_VERSION;
  uses: UtilityUsageEvidence[];
  rounds: UtilityRoundEvidence[];
  diagnostics: {
    duplicateEventIds: string[];
    duplicateUsageEventIds: string[];
    unknownOwnerEventIds: string[];
    excludedRoundEventIds: string[];
    unsupportedUsageState: 'THROWN_UNAVAILABLE';
  };
};

export type H2E3ResearchProfile = ParticipationRatingPreparedProfile & {
  countedRoundIds: readonly string[];
};

export type UtilityResearchConfiguration = {
  id: 'U1_LINEAR' | 'U2_DIMINISHING' | 'U3_TYPE_WEIGHTED';
  usageMode: 'LINEAR' | 'DIMINISHING' | 'TYPE_WEIGHTED';
  usageWeights: Readonly<Record<UtilityType, number>>;
  diminishingFactors: readonly number[];
  usageRoundCap: number;
  effectDamagePer100: number;
  effectBlindPer5Seconds: number;
  effectFlashAssist: number;
  effectRoundCap: number;
  totalRoundCap: number;
};

export const H2_E3_CONFIGURATIONS: readonly UtilityResearchConfiguration[] = [
  {
    id: 'U1_LINEAR', usageMode: 'LINEAR',
    usageWeights: { HE: 0.008, FIRE: 0.008, FLASH: 0.008, SMOKE: 0.008 },
    diminishingFactors: [1], usageRoundCap: 0.024,
    effectDamagePer100: 0.012, effectBlindPer5Seconds: 0.01, effectFlashAssist: 0.006,
    effectRoundCap: 0.018, totalRoundCap: 0.036,
  },
  {
    id: 'U2_DIMINISHING', usageMode: 'DIMINISHING',
    usageWeights: { HE: 0.01, FIRE: 0.01, FLASH: 0.01, SMOKE: 0.01 },
    diminishingFactors: [1, 0.6, 0.35, 0.2], usageRoundCap: 0.022,
    effectDamagePer100: 0.01, effectBlindPer5Seconds: 0.009, effectFlashAssist: 0.005,
    effectRoundCap: 0.015, totalRoundCap: 0.032,
  },
  {
    id: 'U3_TYPE_WEIGHTED', usageMode: 'TYPE_WEIGHTED',
    usageWeights: { HE: 0.007, FIRE: 0.009, FLASH: 0.01, SMOKE: 0.006 },
    diminishingFactors: [1], usageRoundCap: 0.026,
    effectDamagePer100: 0.011, effectBlindPer5Seconds: 0.011, effectFlashAssist: 0.005,
    effectRoundCap: 0.017, totalRoundCap: 0.036,
  },
] as const;

type RoundDraft = {
  playerId: string;
  roundId: string;
  utilityType: UtilityType;
  usageEventIds: Set<string>;
  effectEventIds: Set<string>;
  friendlyEffectEventIds: Set<string>;
  damageAnchorIds: Set<string>;
  blindAnchorIds: Set<string>;
  flashAssistAnchorIds: Set<string>;
  linkedUsageEventIds: Set<string>;
  unlinkedFlashEffect: boolean;
  enemyDamage: number;
  flashAssists: number;
  blindRows: Array<{ eventId: string; targetId: string; tick: number; duration: number }>;
  unavailableReasons: Set<string>;
};

type HealthDamage = { actual: number | null; nextHealth: number | null };

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nonnegativeNumber(value: unknown): number | null {
  return finiteNumber(value) && value >= 0 ? value : null;
}

function eventOrder(left: MatchEvent, right: MatchEvent): number {
  return left.tick - right.tick
    || left.source.rowIndex - right.source.rowIndex
    || left.id.localeCompare(right.id);
}

function utilityTypeForUsage(event: MatchEvent): UtilityType | null {
  if (event.kind === 'HE_DETONATE') return 'HE';
  if (event.kind === 'INFERNO_START') return 'FIRE';
  if (event.kind === 'FLASH_DETONATE') return 'FLASH';
  if (event.kind === 'SMOKE_DETONATE') return 'SMOKE';
  return null;
}

function utilityTypeForDamage(event: MatchEvent): 'HE' | 'FIRE' | null {
  return event.attrs.weapon === 'hegrenade' ? 'HE'
    : event.attrs.weapon === 'inferno' ? 'FIRE'
      : null;
}

function eventEntityId(event: MatchEvent): number | null {
  const value = event.attrs.entityId;
  return finiteNumber(value) && Number.isInteger(value) ? value : null;
}

function eventCounts(events: readonly MatchEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.id, (counts.get(event.id) ?? 0) + 1);
  return counts;
}

function relation(
  teamByPlayer: ReadonlyMap<string, string>,
  actorId: string | null,
  targetId: string | null,
): 'ENEMY' | 'FRIENDLY' | 'SELF' | 'UNKNOWN' {
  if (!actorId || !targetId) return 'UNKNOWN';
  if (actorId === targetId) return 'SELF';
  const actorTeam = teamByPlayer.get(actorId);
  const targetTeam = teamByPlayer.get(targetId);
  if (!actorTeam || !targetTeam) return 'UNKNOWN';
  return actorTeam === targetTeam ? 'FRIENDLY' : 'ENEMY';
}

function healthDamage(event: MatchEvent, previousHealth: number | null): HealthDamage {
  const raw = nonnegativeNumber(event.attrs.rawHealthDamage);
  const after = nonnegativeNumber(event.attrs.healthAfter);
  const validAfter = after !== null && after <= 100 ? after : null;
  if (previousHealth === null) return { actual: null, nextHealth: validAfter };
  if (raw === null) return { actual: null, nextHealth: validAfter };
  const actual = Math.min(raw, previousHealth);
  const expectedAfter = previousHealth - actual;
  if (event.attrs.healthAfter === null || event.attrs.healthAfter === undefined) {
    return { actual, nextHealth: expectedAfter };
  }
  if (validAfter === null || Math.abs(validAfter - expectedAfter) > 1e-9) {
    return { actual: null, nextHealth: null };
  }
  return { actual, nextHealth: validAfter };
}

function draftKey(playerId: string, roundId: string, type: UtilityType): string {
  return `${playerId}\u0000${roundId}\u0000${type}`;
}

function ensureDraft(
  drafts: Map<string, RoundDraft>,
  playerId: string,
  roundId: string,
  type: UtilityType,
): RoundDraft {
  const key = draftKey(playerId, roundId, type);
  const existing = drafts.get(key);
  if (existing) return existing;
  const created: RoundDraft = {
    playerId, roundId, utilityType: type,
    usageEventIds: new Set(), effectEventIds: new Set(), friendlyEffectEventIds: new Set(),
    damageAnchorIds: new Set(), blindAnchorIds: new Set(), flashAssistAnchorIds: new Set(),
    linkedUsageEventIds: new Set(), unlinkedFlashEffect: false,
    enemyDamage: 0, flashAssists: 0, blindRows: [], unavailableReasons: new Set(),
  };
  drafts.set(key, created);
  return created;
}

function blindAnchor(playerId: string, targetId: string, roundId: string): string {
  const key = `${playerId}|${targetId}|${roundId}`;
  return `${roundId}:blind:${createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
}

function mergedBlindSeconds(
  rows: readonly RoundDraft['blindRows'][number][],
  tickRate: number,
): number {
  const byTarget = new Map<string, Array<[number, number]>>();
  for (const row of rows) {
    const intervals = byTarget.get(row.targetId) ?? [];
    const start = row.tick / tickRate;
    intervals.push([start, start + row.duration]);
    byTarget.set(row.targetId, intervals);
  }
  let total = 0;
  for (const intervals of byTarget.values()) {
    intervals.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
    let [start, end] = intervals[0]!;
    for (const [nextStart, nextEnd] of intervals.slice(1)) {
      if (nextStart <= end) end = Math.max(end, nextEnd);
      else { total += end - start; start = nextStart; end = nextEnd; }
    }
    total += end - start;
  }
  return total;
}

function sorted(values: ReadonlySet<string>): string[] {
  return [...values].sort();
}

export function extractUtilityEvidence(match: MatchData): UtilityEvidenceContract {
  const teamByPlayer = new Map(match.players.map((player) => [player.id, player.teamId]));
  const validRounds = new Set(match.rounds.filter((round) => round.isValid).map((round) => round.id));
  const counts = eventCounts(match.events);
  const duplicateEventIds = [...counts].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const duplicateIds = new Set(duplicateEventIds);
  const unknownOwnerEventIds = new Set<string>();
  const excludedRoundEventIds = new Set<string>();
  const duplicateUsageEventIds = new Set<string>();
  const uses: UtilityUsageEvidence[] = [];
  const drafts = new Map<string, RoundDraft>();
  const usageSignatures = new Set<string>();
  const ordered = [...match.events].sort(eventOrder);

  for (const event of ordered) {
    const type = utilityTypeForUsage(event);
    if (!type) continue;
    if (duplicateIds.has(event.id)) { duplicateUsageEventIds.add(event.id); continue; }
    if (event.context?.phase !== 'LIVE' || !validRounds.has(event.roundId)) {
      excludedRoundEventIds.add(event.id);
      continue;
    }
    if (!event.actorId || !teamByPlayer.has(event.actorId)) {
      unknownOwnerEventIds.add(event.id);
      continue;
    }
    const entityId = eventEntityId(event);
    const signature = `${type}|${event.roundId}|${event.actorId}|${entityId ?? `tick:${event.tick}`}`;
    if (usageSignatures.has(signature)) {
      duplicateUsageEventIds.add(event.id);
      continue;
    }
    usageSignatures.add(signature);
    const use: UtilityUsageEvidence = {
      eventId: event.id, roundId: event.roundId, playerId: event.actorId,
      utilityType: type,
      observationState: type === 'FIRE' ? 'EFFECT_CONFIRMED' : 'DETONATED',
      tick: event.tick, entityId,
    };
    uses.push(use);
    ensureDraft(drafts, use.playerId, use.roundId, use.utilityType).usageEventIds.add(use.eventId);
  }

  const hpByRoundTarget = new Map<string, number | null>();
  for (const event of ordered) {
    if (event.kind !== 'PLAYER_HURT' || event.context?.phase !== 'LIVE' || !validRounds.has(event.roundId)) continue;
    const type = utilityTypeForDamage(event);
    const actorDraft = type && event.actorId && teamByPlayer.has(event.actorId)
      ? ensureDraft(drafts, event.actorId, event.roundId, type)
      : null;
    if (duplicateIds.has(event.id)) {
      actorDraft?.unavailableReasons.add('DUPLICATE_DAMAGE_EVENT_ID');
      continue;
    }
    if (!event.targetId) {
      actorDraft?.unavailableReasons.add('DAMAGE_TARGET_UNAVAILABLE');
      continue;
    }
    const hpKey = `${event.roundId}|${event.targetId}`;
    const previous = hpByRoundTarget.has(hpKey) ? hpByRoundTarget.get(hpKey)! : 100;
    const damage = healthDamage(event, previous);
    hpByRoundTarget.set(hpKey, damage.nextHealth);
    if (!actorDraft) continue;
    const eventRelation = relation(teamByPlayer, event.actorId, event.targetId);
    if (eventRelation === 'FRIENDLY' || eventRelation === 'SELF') {
      actorDraft.friendlyEffectEventIds.add(event.id);
      continue;
    }
    if (eventRelation !== 'ENEMY') {
      actorDraft.unavailableReasons.add('DAMAGE_RELATION_UNAVAILABLE');
      continue;
    }
    actorDraft.effectEventIds.add(event.id);
    if (damage.actual === null) {
      actorDraft.unavailableReasons.add('DAMAGE_LEDGER_INCOMPLETE');
      continue;
    }
    actorDraft.enemyDamage += damage.actual;
    actorDraft.damageAnchorIds.add(event.id);
  }

  const flashUseByEntity = new Map(uses.flatMap((use) => (
    use.utilityType === 'FLASH' && use.entityId !== null
      ? [[`${use.playerId}|${use.roundId}|${use.entityId}`, use.eventId] as const]
      : []
  )));

  for (const event of ordered) {
    if (event.kind !== 'PLAYER_BLIND' || event.context?.phase !== 'LIVE' || !validRounds.has(event.roundId)) continue;
    if (!event.actorId || !teamByPlayer.has(event.actorId)) {
      unknownOwnerEventIds.add(event.id);
      continue;
    }
    const flash = ensureDraft(drafts, event.actorId, event.roundId, 'FLASH');
    if (duplicateIds.has(event.id)) {
      flash.unavailableReasons.add('DUPLICATE_BLIND_EVENT_ID');
      continue;
    }
    const eventRelation = relation(teamByPlayer, event.actorId, event.targetId);
    if (eventRelation === 'FRIENDLY' || eventRelation === 'SELF') {
      flash.friendlyEffectEventIds.add(event.id);
      continue;
    }
    if (eventRelation !== 'ENEMY' || !event.targetId) {
      flash.unavailableReasons.add('BLIND_RELATION_UNAVAILABLE');
      continue;
    }
    flash.effectEventIds.add(event.id);
    const duration = nonnegativeNumber(event.attrs.blindDuration);
    if (duration === null) {
      flash.unavailableReasons.add('BLIND_DURATION_UNAVAILABLE');
      continue;
    }
    flash.blindRows.push({ eventId: event.id, targetId: event.targetId, tick: event.tick, duration });
    flash.blindAnchorIds.add(blindAnchor(event.actorId, event.targetId, event.roundId));
    const entityId = eventEntityId(event);
    const linkedUsage = entityId === null
      ? undefined
      : flashUseByEntity.get(`${event.actorId}|${event.roundId}|${entityId}`);
    if (linkedUsage) flash.linkedUsageEventIds.add(linkedUsage);
    else flash.unlinkedFlashEffect = true;
  }

  for (const event of ordered) {
    if (event.kind !== 'PLAYER_DEATH' || event.context?.phase !== 'LIVE'
      || event.attrs.assistedFlash !== true || !event.assisterId || !validRounds.has(event.roundId)) continue;
    if (!teamByPlayer.has(event.assisterId)) continue;
    const flash = ensureDraft(drafts, event.assisterId, event.roundId, 'FLASH');
    if (duplicateIds.has(event.id)) {
      flash.unavailableReasons.add('DUPLICATE_FLASH_ASSIST_EVENT_ID');
      continue;
    }
    if (relation(teamByPlayer, event.assisterId, event.targetId) !== 'ENEMY') {
      flash.unavailableReasons.add('FLASH_ASSIST_RELATION_UNAVAILABLE');
      continue;
    }
    flash.effectEventIds.add(event.id);
    flash.flashAssistAnchorIds.add(event.id);
    flash.flashAssists += 1;
    flash.unlinkedFlashEffect = true;
  }

  const rounds = [...drafts.values()].map((draft): UtilityRoundEvidence => {
    const reasons = new Set(draft.unavailableReasons);
    let enemyBlindSeconds: number | null = 0;
    if (draft.utilityType === 'FLASH' && draft.blindRows.length > 0) {
      if (!finiteNumber(match.tickRate) || match.tickRate <= 0) {
        reasons.add('TICK_RATE_UNAVAILABLE_FOR_BLIND_INTERVALS');
        enemyBlindSeconds = null;
      } else {
        enemyBlindSeconds = mergedBlindSeconds(draft.blindRows, match.tickRate);
      }
    }
    if (draft.utilityType === 'SMOKE') reasons.add('SMOKE_SPATIAL_EFFECT_UNAVAILABLE');
    const unavailable = reasons.size > 0;
    const hasEffect = draft.effectEventIds.size > 0;
    const effectLinkage = unavailable ? 'UNAVAILABLE' as const
      : !hasEffect ? 'NO_EFFECT' as const
        : draft.utilityType === 'FLASH' && !draft.unlinkedFlashEffect
          ? 'EXACT_ENTITY' as const
          : 'ROUND_LEVEL_ONLY' as const;
    return {
      playerId: draft.playerId, roundId: draft.roundId, utilityType: draft.utilityType,
      usageEventIds: sorted(draft.usageEventIds), effectEventIds: sorted(draft.effectEventIds),
      friendlyEffectEventIds: sorted(draft.friendlyEffectEventIds),
      damageAnchorIds: sorted(draft.damageAnchorIds), blindAnchorIds: sorted(draft.blindAnchorIds),
      flashAssistAnchorIds: sorted(draft.flashAssistAnchorIds),
      linkedUsageEventIds: sorted(draft.linkedUsageEventIds), effectLinkage,
      enemyDamage: draft.utilityType === 'HE' || draft.utilityType === 'FIRE'
        ? unavailable ? null : draft.enemyDamage
        : null,
      enemyBlindSeconds: draft.utilityType === 'FLASH'
        ? unavailable ? null : enemyBlindSeconds
        : null,
      flashAssists: draft.flashAssists,
      effectivenessAvailability: unavailable ? 'UNAVAILABLE' : 'AVAILABLE',
      unavailableReasons: [...reasons].sort(),
    };
  }).sort((left, right) => left.roundId.localeCompare(right.roundId)
    || left.playerId.localeCompare(right.playerId)
    || left.utilityType.localeCompare(right.utilityType));

  return {
    schemaVersion: H2_E3_UTILITY_CONTRACT_VERSION,
    uses: uses.sort((left, right) => left.roundId.localeCompare(right.roundId)
      || left.tick - right.tick || left.eventId.localeCompare(right.eventId)),
    rounds,
    diagnostics: {
      duplicateEventIds,
      duplicateUsageEventIds: sorted(duplicateUsageEventIds),
      unknownOwnerEventIds: sorted(unknownOwnerEventIds),
      excludedRoundEventIds: sorted(excludedRoundEventIds),
      unsupportedUsageState: 'THROWN_UNAVAILABLE',
    },
  };
}

type ExactAnchor = { anchorId: string; family: ParticipationPhysicalFamily; axis: string };

function exactEpisode(
  profile: H2E3ResearchProfile,
  anchorId: string,
  family: ParticipationPhysicalFamily,
  axis: string,
): ParticipationEpisodeContribution | null {
  const matches = (profile.prepared.p4BPlus.episodeContributions ?? []).filter((episode) => (
    episode.anchorId === anchorId && episode.family === family && episode.chosenAxis === axis
    && Number.isFinite(episode.base) && episode.base > 0
  ));
  return matches.length === 1 ? matches[0]! : null;
}

function exactReallocationAnchors(
  profile: H2E3ResearchProfile,
  row: UtilityRoundEvidence,
): ExactAnchor[] | null {
  if (row.effectivenessAvailability !== 'AVAILABLE') return null;
  if (row.utilityType === 'HE' || row.utilityType === 'FIRE') {
    if ((row.enemyDamage ?? 0) === 0) return [];
    const anchors = row.damageAnchorIds.map((anchorId) => ({ anchorId, family: 'COMBAT' as const, axis: 'enemyHp' }));
    return anchors.length > 0 && anchors.every((anchor) => exactEpisode(profile, anchor.anchorId, anchor.family, anchor.axis))
      ? anchors : null;
  }
  if (row.utilityType === 'FLASH') {
    if ((row.enemyBlindSeconds ?? 0) === 0) return [];
    const anchors = row.blindAnchorIds.map((anchorId) => ({ anchorId, family: 'SUPPORT' as const, axis: 'enemyBlind' }));
    return anchors.length > 0 && anchors.every((anchor) => exactEpisode(profile, anchor.anchorId, anchor.family, anchor.axis))
      ? anchors : null;
  }
  return null;
}

function usageCredit(
  uses: readonly UtilityUsageEvidence[],
  config: UtilityResearchConfiguration,
  usageFactors?: ReadonlyMap<string, number>,
): { value: number; capped: boolean } {
  const ordered = [...uses].sort((left, right) => left.tick - right.tick || left.eventId.localeCompare(right.eventId));
  const uncapped = ordered.reduce((sum, use, index) => {
    const base = config.usageWeights[use.utilityType];
    const factor = config.usageMode === 'DIMINISHING'
      ? config.diminishingFactors[Math.min(index, config.diminishingFactors.length - 1)]!
      : 1;
    return sum + base * factor * (usageFactors?.get(use.eventId) ?? 1);
  }, 0);
  return { value: Math.min(uncapped, config.usageRoundCap), capped: uncapped > config.usageRoundCap };
}

function rawEffectCredit(row: UtilityRoundEvidence, config: UtilityResearchConfiguration): number | null {
  if (row.effectivenessAvailability !== 'AVAILABLE') return null;
  if (row.utilityType === 'HE' || row.utilityType === 'FIRE') {
    return (row.enemyDamage ?? 0) / 100 * config.effectDamagePer100;
  }
  if (row.utilityType === 'FLASH') {
    return (row.enemyBlindSeconds ?? 0) / 5 * config.effectBlindPer5Seconds
      + row.flashAssists * config.effectFlashAssist;
  }
  return null;
}

export type UtilityRoundContribution = {
  roundId: string;
  usage: number;
  effect: number;
  total: number;
  usageCapped: boolean;
  effectCapped: boolean;
  totalCapped: boolean;
  unavailableEffectTypes: UtilityType[];
};

export type UtilityContribution = {
  usage: number;
  effect: number;
  total: number;
  rounds: UtilityRoundContribution[];
  exactReallocationAnchorIds: string[];
};

export function projectUtilityContribution(
  contract: UtilityEvidenceContract,
  profile: H2E3ResearchProfile,
  config: UtilityResearchConfiguration,
  mode: 'USAGE_ONLY' | 'NAIVE_USAGE_AND_EFFECT' | 'REALLOCATED_USAGE_AND_EFFECT',
  usageFactors?: ReadonlyMap<string, number>,
): UtilityContribution {
  if (profile.status !== 'ELIGIBLE') {
    return { usage: 0, effect: 0, total: 0, rounds: [], exactReallocationAnchorIds: [] };
  }
  const counted = new Set(profile.countedRoundIds);
  const rows = contract.rounds.filter((row) => row.playerId === profile.playerId && counted.has(row.roundId));
  const uses = contract.uses.filter((use) => use.playerId === profile.playerId && counted.has(use.roundId));
  const roundIds = [...new Set([...rows.map((row) => row.roundId), ...uses.map((use) => use.roundId)])].sort();
  const exactAnchors = new Set<string>();
  const rounds = roundIds.map((roundId): UtilityRoundContribution => {
    const roundUses = uses.filter((use) => use.roundId === roundId);
    const usage = usageCredit(roundUses, config, usageFactors);
    const unavailable = new Set<UtilityType>();
    let effectUncapped = 0;
    for (const row of rows.filter((candidate) => candidate.roundId === roundId)) {
      if (mode === 'USAGE_ONLY') continue;
      const raw = rawEffectCredit(row, config);
      if (raw === null) { unavailable.add(row.utilityType); continue; }
      if (mode === 'REALLOCATED_USAGE_AND_EFFECT') {
        const anchors = exactReallocationAnchors(profile, row);
        if (anchors === null) { unavailable.add(row.utilityType); continue; }
        for (const anchor of anchors) exactAnchors.add(anchor.anchorId);
        const flashAssistPart = row.utilityType === 'FLASH'
          ? row.flashAssists * config.effectFlashAssist
          : 0;
        effectUncapped += Math.max(0, raw - flashAssistPart);
      } else {
        effectUncapped += raw;
      }
    }
    const effectBeforeTotal = Math.min(effectUncapped, config.effectRoundCap);
    const room = Math.max(0, config.totalRoundCap - usage.value);
    const effect = Math.min(effectBeforeTotal, room);
    return {
      roundId, usage: usage.value, effect, total: usage.value + effect,
      usageCapped: usage.capped,
      effectCapped: effectUncapped > config.effectRoundCap,
      totalCapped: usage.value + effectBeforeTotal > config.totalRoundCap,
      unavailableEffectTypes: [...unavailable].sort(),
    };
  });
  return {
    usage: rounds.reduce((sum, round) => sum + round.usage, 0),
    effect: rounds.reduce((sum, round) => sum + round.effect, 0),
    total: rounds.reduce((sum, round) => sum + round.total, 0),
    rounds,
    exactReallocationAnchorIds: [...exactAnchors].sort(),
  };
}

function cloneProfile(profile: H2E3ResearchProfile): H2E3ResearchProfile {
  return structuredClone(profile);
}

function removeExactAnchors(profile: H2E3ResearchProfile, anchorIds: ReadonlySet<string>): void {
  for (const row of [profile.prepared.p4BPlus, profile.prepared.p4CPlus]) {
    if (!row.episodeContributions || !row.familyContributions) continue;
    const removed = row.episodeContributions.filter((episode) => anchorIds.has(episode.anchorId));
    const families = { ...row.familyContributions };
    for (const episode of removed) {
      const current = families[episode.family];
      if (typeof current !== 'number' || !Number.isFinite(current)) continue;
      families[episode.family] = current - episode.base * PARTICIPATION_FAMILY_POLICY.scoreScale;
    }
    row.familyContributions = families;
    row.episodeContributions = row.episodeContributions.filter((episode) => !anchorIds.has(episode.anchorId));
  }
}

export type H2E3Projection = {
  playerId: string;
  teamId: string;
  status: ParticipationRatingProjection['status'];
  rating: number | null;
  baselineRating: number | null;
  h2AfterReallocation: number | null;
  usageContribution: number;
  effectContribution: number;
  totalUtilityContribution: number;
  exactReallocationAnchorIds: string[];
};

export type H2E3ConfigurationResult = {
  configurationId: UtilityResearchConfiguration['id'];
  usageOnly: H2E3Projection[];
  naiveUsageAndEffect: H2E3Projection[];
  reallocatedUsageAndEffect: H2E3Projection[];
};

export type H2E3Experiment = {
  schemaVersion: typeof H2_E3_UTILITY_CONTRACT_VERSION;
  evidence: UtilityEvidenceContract;
  baseline: ParticipationRatingProjection[];
  configurations: H2E3ConfigurationResult[];
};

function projection(
  baseline: ParticipationRatingProjection,
  h2AfterReallocation: ParticipationRatingProjection,
  contribution: UtilityContribution,
): H2E3Projection {
  const calculated = baseline.status === 'CALCULATED_RESEARCH_ONLY'
    && h2AfterReallocation.status === 'CALCULATED_RESEARCH_ONLY';
  return {
    playerId: baseline.playerId,
    teamId: baseline.teamId,
    status: baseline.status,
    rating: calculated ? h2AfterReallocation.rating + contribution.total : null,
    baselineRating: baseline.rating,
    h2AfterReallocation: h2AfterReallocation.rating,
    usageContribution: contribution.usage,
    effectContribution: contribution.effect,
    totalUtilityContribution: contribution.total,
    exactReallocationAnchorIds: contribution.exactReallocationAnchorIds,
  };
}

export function evaluateH2E3Experiment(
  match: MatchData,
  profiles: readonly H2E3ResearchProfile[],
): H2E3Experiment {
  const evidence = extractUtilityEvidence(match);
  const baseline = projectParticipationRatings(profiles.map((profile) => ({
    profileKey: profile.profileKey, playerId: profile.playerId, teamId: profile.teamId,
    status: profile.status, reason: profile.reason, prepared: profile.prepared,
  })));
  const configurations = H2_E3_CONFIGURATIONS.map((config): H2E3ConfigurationResult => {
    const reallocatedProfiles = profiles.map(cloneProfile);
    const protectedByPlayer = new Map(profiles.map((profile) => [
      profile.playerId,
      projectUtilityContribution(evidence, profile, config, 'REALLOCATED_USAGE_AND_EFFECT'),
    ]));
    for (const profile of reallocatedProfiles) {
      removeExactAnchors(profile, new Set(protectedByPlayer.get(profile.playerId)?.exactReallocationAnchorIds ?? []));
    }
    const stripped = projectParticipationRatings(reallocatedProfiles.map((profile) => ({
      profileKey: profile.profileKey, playerId: profile.playerId, teamId: profile.teamId,
      status: profile.status, reason: profile.reason, prepared: profile.prepared,
    })));
    const strippedByPlayer = new Map(stripped.map((row) => [row.playerId, row]));
    return {
      configurationId: config.id,
      usageOnly: profiles.map((profile, index) => {
        const contribution = projectUtilityContribution(evidence, profile, config, 'USAGE_ONLY');
        return projection(baseline[index]!, baseline[index]!, contribution);
      }),
      naiveUsageAndEffect: profiles.map((profile, index) => {
        const contribution = projectUtilityContribution(evidence, profile, config, 'NAIVE_USAGE_AND_EFFECT');
        return projection(baseline[index]!, baseline[index]!, contribution);
      }),
      reallocatedUsageAndEffect: profiles.map((profile, index) => projection(
        baseline[index]!,
        strippedByPlayer.get(profile.playerId) ?? baseline[index]!,
        protectedByPlayer.get(profile.playerId)!,
      )),
    };
  });
  return { schemaVersion: H2_E3_UTILITY_CONTRACT_VERSION, evidence, baseline, configurations };
}
