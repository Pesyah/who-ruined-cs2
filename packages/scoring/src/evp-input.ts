import type { MatchArtifact, MatchEvent, PlayerAnalytics } from '@who-ruined/contracts';
import {
  EVP_POLICY_V1,
  type EvpEvidence,
  type EvpMatchInput,
  type EvpPlayerInput,
  type EvpPlayerMetrics,
  type EvpScenario,
  type EvpSpecializationId,
} from './evp.js';

export interface EvpParticipationSource {
  playerId: string;
  eligible: boolean;
  verifiedRounds: number;
  unknownRounds: number;
  reasonCodes: readonly string[];
}

export interface PrepareEvpMatchInput {
  artifact: MatchArtifact;
  participation: readonly EvpParticipationSource[];
  mvpPlayerId: string | null;
  scenario: EvpScenario;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function evidence(eventIds: readonly string[], roundIds: readonly string[], aggregateOnly = false): EvpEvidence {
  const sortedEvents = sortedUnique(eventIds);
  const sortedRounds = sortedUnique(roundIds);
  return {
    eventIds: sortedEvents,
    roundIds: sortedRounds,
    quality: aggregateOnly ? 'AGGREGATE_ONLY' : sortedEvents.length > 0 ? 'VERIFIED_EVENTS' : 'VERIFIED_ROUNDS',
  };
}

function eventOrder(left: MatchEvent, right: MatchEvent): number {
  return left.tick - right.tick || left.source.rowIndex - right.source.rowIndex || left.id.localeCompare(right.id);
}

function isLive(event: MatchEvent): boolean {
  return event.context?.phase === 'LIVE' && event.kind !== 'PLAYER_DEATH_NONLIVE';
}

function eventWeapon(event: MatchEvent): string | null {
  return typeof event.attrs.weapon === 'string' ? event.attrs.weapon : null;
}

function teamRelation(teamByPlayer: ReadonlyMap<string, string>, actorId: string, targetId: string): 'ENEMY' | 'FRIENDLY' | 'UNKNOWN' {
  const actorTeam = teamByPlayer.get(actorId);
  const targetTeam = teamByPlayer.get(targetId);
  if (actorTeam === undefined || targetTeam === undefined) return 'UNKNOWN';
  return actorTeam === targetTeam ? 'FRIENDLY' : 'ENEMY';
}

function enemyDeath(event: MatchEvent, teamByPlayer: ReadonlyMap<string, string>): boolean {
  return event.kind === 'PLAYER_DEATH'
    && event.actorId !== null
    && event.targetId !== null
    && event.actorId !== event.targetId
    && teamRelation(teamByPlayer, event.actorId, event.targetId) === 'ENEMY';
}

function facts(analytics: PlayerAnalytics, kind: string): PlayerAnalytics['facts'] {
  return analytics.facts.filter((fact) => fact.kind === kind);
}

function factEvidence(analytics: PlayerAnalytics, kinds: readonly string[]): EvpEvidence {
  const matching = analytics.facts.filter((fact) => kinds.includes(fact.kind));
  return evidence(matching.flatMap((fact) => fact.eventId ? [fact.eventId] : []), matching.map((fact) => fact.roundId));
}

function openingEvidenceByPlayer(artifact: MatchArtifact): Map<string, EvpEvidence> {
  const teamByPlayer = new Map(artifact.match.players.map((player) => [player.id, player.teamId]));
  const deaths = artifact.match.events.filter((event) => isLive(event) && enemyDeath(event, teamByPlayer)).sort(eventOrder);
  const eventsByPlayer = new Map<string, MatchEvent[]>();
  for (const round of artifact.match.rounds) {
    const opening = deaths.find((event) => event.roundId === round.id);
    if (!opening?.actorId) continue;
    eventsByPlayer.set(opening.actorId, [...(eventsByPlayer.get(opening.actorId) ?? []), opening]);
  }
  return new Map([...eventsByPlayer].map(([playerId, events]) => [
    playerId,
    evidence(events.map((event) => event.id), events.map((event) => event.roundId)),
  ]));
}

function clutchEvidenceByPlayer(artifact: MatchArtifact): Map<string, EvpEvidence> {
  const teamByPlayer = new Map(artifact.match.players.map((player) => [player.id, player.teamId]));
  const deaths = artifact.match.events.filter((event) => isLive(event) && event.kind === 'PLAYER_DEATH').sort(eventOrder);
  const roundsByPlayer = new Map<string, string[]>();
  for (const round of artifact.match.rounds) {
    const alive = new Map(artifact.match.teams.map((team) => [team.id, new Set(team.playerIds)]));
    const candidates = new Map<string, number>();
    for (const death of deaths.filter((event) => event.roundId === round.id)) {
      if (death.targetId) alive.get(teamByPlayer.get(death.targetId) ?? '')?.delete(death.targetId);
      for (const team of artifact.match.teams) {
        const survivors = alive.get(team.id);
        const enemy = artifact.match.teams.find((candidate) => candidate.id !== team.id);
        const enemyCount = enemy ? alive.get(enemy.id)?.size ?? 0 : 0;
        if (survivors?.size === 1 && enemyCount > 0) {
          const playerId = [...survivors][0]!;
          candidates.set(playerId, Math.max(candidates.get(playerId) ?? 0, enemyCount));
        }
      }
    }
    for (const playerId of candidates.keys()) {
      const teamId = teamByPlayer.get(playerId);
      if (teamId && round.winnerTeamId === teamId && alive.get(teamId)?.has(playerId)) {
        roundsByPlayer.set(playerId, [...(roundsByPlayer.get(playerId) ?? []), round.id]);
      }
    }
  }
  return new Map([...roundsByPlayer].map(([playerId, roundIds]) => [playerId, evidence([], roundIds)]));
}

function blindEvidence(artifact: MatchArtifact, playerId: string): EvpEvidence {
  const teamByPlayer = new Map(artifact.match.players.map((player) => [player.id, player.teamId]));
  const blinds = artifact.match.events.filter((event) => isLive(event)
    && event.kind === 'PLAYER_BLIND'
    && event.actorId === playerId
    && event.targetId !== null
    && teamRelation(teamByPlayer, playerId, event.targetId) === 'ENEMY');
  return evidence(blinds.map((event) => event.id), blinds.map((event) => event.roundId));
}

function multikillEvidence(analytics: PlayerAnalytics): EvpEvidence {
  const killsByRound = new Map<string, PlayerAnalytics['facts']>();
  for (const fact of facts(analytics, 'KILL')) {
    killsByRound.set(fact.roundId, [...(killsByRound.get(fact.roundId) ?? []), fact]);
  }
  const multikillFacts = [...killsByRound.values()].filter((roundFacts) => roundFacts.length >= 2).flat();
  return evidence(multikillFacts.flatMap((fact) => fact.eventId ? [fact.eventId] : []), multikillFacts.map((fact) => fact.roundId));
}

function utilityEvidence(artifact: MatchArtifact, playerId: string): EvpEvidence {
  const teamByPlayer = new Map(artifact.match.players.map((player) => [player.id, player.teamId]));
  const hurts = artifact.match.events.filter((event) => isLive(event)
    && event.kind === 'PLAYER_HURT'
    && event.actorId === playerId
    && event.targetId !== null
    && teamRelation(teamByPlayer, playerId, event.targetId) === 'ENEMY'
    && (eventWeapon(event) === 'hegrenade' || eventWeapon(event) === 'inferno'));
  return evidence(hurts.map((event) => event.id), hurts.map((event) => event.roundId));
}

function mergeEvidence(left: EvpEvidence, right: EvpEvidence): EvpEvidence {
  return evidence([...left.eventIds, ...right.eventIds], [...left.roundIds, ...right.roundIds]);
}

function clutchMetrics(analytics: PlayerAnalytics): { points: number | null; wins: number | null } {
  const weights: Readonly<Record<string, number>> = EVP_POLICY_V1.specializations.clutchSpecialist.pointWeights;
  let points = 0;
  let wins = 0;
  for (const [label, count] of Object.entries(analytics.clutches)) {
    const weight = weights[label];
    if (weight === undefined && count > 0) return { points: null, wins: null };
    points += (weight ?? 0) * count;
    wins += count;
  }
  return { points, wins };
}

function sumNullable(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left + right;
}

function playerMetrics(analytics: PlayerAnalytics | undefined): EvpPlayerMetrics {
  if (!analytics) {
    return {
      flashAssists: null, nonFlashAssists: null, enemyBlindSeconds: null, teamBlindSeconds: null,
      tradeKills: null, clutchPoints: null, clutchWins: null,
      multiKills: { two: null, three: null, four: null, five: null },
      openingKills: null, openingDeaths: null, utilityEnemyDamage: null, utilityTeamDamage: null,
      bombPlants: null, bombDefuses: null, teamDamage: null, teamKills: null,
    };
  }
  const flashAssists = facts(analytics, 'FLASH_ASSIST').length;
  const nonFlashAssists = analytics.assists === null || flashAssists > analytics.assists ? null : analytics.assists - flashAssists;
  const clutch = clutchMetrics(analytics);
  return {
    flashAssists,
    nonFlashAssists,
    enemyBlindSeconds: analytics.grenades.enemyBlindSeconds,
    teamBlindSeconds: analytics.grenades.teamBlindSeconds,
    tradeKills: analytics.tradeKills,
    clutchPoints: clutch.points,
    clutchWins: clutch.wins,
    multiKills: { ...analytics.multiKills },
    openingKills: analytics.openingKills,
    openingDeaths: analytics.openingDeaths,
    utilityEnemyDamage: sumNullable(analytics.grenades.heEnemyDamage, analytics.grenades.infernoEnemyDamage),
    utilityTeamDamage: sumNullable(analytics.grenades.heTeamDamage, analytics.grenades.infernoTeamDamage),
    bombPlants: analytics.bomb.plants,
    bombDefuses: analytics.bomb.defuses,
    teamDamage: analytics.teamDamage,
    teamKills: analytics.teamKills,
  };
}

function playerEvidence(
  artifact: MatchArtifact,
  analytics: PlayerAnalytics | undefined,
  playerId: string,
  openings: ReadonlyMap<string, EvpEvidence>,
  clutches: ReadonlyMap<string, EvpEvidence>,
): Partial<Record<EvpSpecializationId, EvpEvidence>> {
  if (!analytics) return {};
  const flashAssists = factEvidence(analytics, ['FLASH_ASSIST']);
  return {
    FLASH_SUPPORT: mergeEvidence(flashAssists, blindEvidence(artifact, playerId)),
    NON_FLASH_ASSIST_SUPPORT: factEvidence(analytics, ['ASSIST']),
    TRADE_SPECIALIST: factEvidence(analytics, ['TRADE_KILL']),
    CLUTCH_SPECIALIST: clutches.get(playerId) ?? evidence([], [], true),
    MULTIKILL_SPECIALIST: multikillEvidence(analytics),
    ENTRY_SPECIALIST: openings.get(playerId) ?? evidence([], [], true),
    UTILITY_DAMAGE_SPECIALIST: utilityEvidence(artifact, playerId),
    OBJECTIVE_SPECIALIST: factEvidence(analytics, ['BOMB_PLANT', 'BOMB_DEFUSE']),
  };
}

/** Pure projection from current canonical facts and participation coverage into EVP policy input. */
export function prepareEvpMatchInput(source: PrepareEvpMatchInput): EvpMatchInput {
  const analyticsByPlayer = new Map(source.artifact.analytics.players.map((player) => [player.playerId, player]));
  const participationByPlayer = new Map(source.participation.map((profile) => [profile.playerId, profile]));
  const openings = openingEvidenceByPlayer(source.artifact);
  const clutches = clutchEvidenceByPlayer(source.artifact);
  const players = source.artifact.match.players.map((identity): EvpPlayerInput => {
    const analytics = analyticsByPlayer.get(identity.id);
    const participation = participationByPlayer.get(identity.id);
    return {
      playerId: identity.id,
      teamId: identity.teamId,
      participation: participation ? {
        eligible: participation.eligible,
        verifiedRounds: participation.verifiedRounds,
        unknownRounds: participation.unknownRounds,
        reasonCodes: [...participation.reasonCodes],
      } : {
        eligible: false,
        verifiedRounds: 0,
        unknownRounds: source.artifact.match.rounds.length,
        reasonCodes: ['PARTICIPATION_EVIDENCE_MISSING'],
      },
      metrics: playerMetrics(analytics),
      evidence: playerEvidence(source.artifact, analytics, identity.id, openings, clutches),
    };
  });
  return {
    matchId: source.artifact.match.matchId,
    scenario: source.scenario,
    mvpPlayerId: source.mvpPlayerId,
    availability: {
      damage: source.artifact.analytics.availability.damage,
      flashes: source.artifact.analytics.availability.flashes,
      aliveContext: source.artifact.analytics.availability.aliveContext,
    },
    players,
  };
}
