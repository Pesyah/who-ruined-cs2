export interface NormalizationPlayerInput {
  sourceRowIndex: number;
  candidateSteamId: string | null;
  displayName: string | null;
  initialSideNumber: number | null;
}

export interface NormalizationEventInput {
  sourceRowIndex: number;
  name: string | null;
  tick: number | null;
  attackerPlayerId: string | null;
  actorPlayerId: string | null;
  subjectPlayerId: string | null;
  targetPlayerId: string | null;
  assisterPlayerId: string | null;
  weapon: string | null;
  headshot: boolean | null;
  assistedFlash: boolean | null;
  healthAfter: number | null;
  armorAfter: number | null;
  rawHealthDamage: number | null;
  rawArmorDamage: number | null;
  hitgroup: number | null;
  blindDuration: number | null;
  entityId: number | null;
  site: string | null;
  hasKit: boolean | null;
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface NormalizationTickInput {
  sourceRowIndex: number;
  tick: number | null;
  gameTime: number | null;
  playerId: string | null;
  sideNumber: number | null;
  teamScore: number | null;
  isAlive: boolean | null;
  equipmentValue: number | null;
  inventory: string[];
  armorValue: number | null;
  hasHelmet: boolean | null;
  hasDefuser: boolean | null;
  cash: number | null;
}

export interface NormalizationInput {
  matchId: string;
  fileSha256: string;
  map: string | null;
  players: NormalizationPlayerInput[];
  events: NormalizationEventInput[];
  ticks: NormalizationTickInput[];
  provenance: {
    parser: string;
    parserVersion: string;
  };
  normalizedAt?: string;
}

export type NormalizeInput = NormalizationInput;
