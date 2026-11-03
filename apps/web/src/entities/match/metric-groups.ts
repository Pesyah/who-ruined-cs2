import type { TFunction } from 'i18next';
import type { PlayerMetrics } from './types.js';

export interface MetricColumn {
  id: string;
  label: string;
  value: (player: PlayerMetrics | undefined) => number | null | undefined;
}
export interface MetricGroup { id: string; label: string; note?: string; columns: MetricColumn[] }

/** Labels and accessors only: every value is supplied by the server. */
export function metricGroups(t: TFunction<'match'>): MetricGroup[] {
  return [
    { id: 'combat', label: t('metrics-combat', 'Combat & survival'), columns: [
      { id: 'adr', label: 'ADR', value: p => p?.adr },
      { id: 'kast', label: 'KAST %', value: p => p?.kast },
      { id: 'damage', label: t('source-damage', 'Damage'), value: p => p?.damage },
      { id: 'kda', label: t('metrics-kda', 'KDA ratio'), value: p => p?.analytics?.kdaRatio },
      { id: 'rounds', label: t('metrics-rounds', 'Counted rounds'), value: p => p?.analytics?.roundsPlayed },
      { id: 'kastRounds', label: t('metrics-kast-rounds', 'KAST rounds'), value: p => p?.analytics?.kastRounds },
      { id: 'survived', label: t('metrics-survived', 'Rounds without a recorded death'), value: p => p?.analytics?.survivedRounds },
    ] },
    { id: 'trades', label: t('metrics-trades', 'Opening duels & trades'), columns: [
      { id: 'openingKills', label: t('opening-kills', 'Opening K'), value: p => p?.openingKills },
      { id: 'openingDeaths', label: t('opening-deaths', 'Opening D'), value: p => p?.openingDeaths },
      { id: 'trades', label: t('trades', 'Trades'), value: p => p?.trades },
      { id: 'deathsTraded', label: t('metrics-deaths-traded', 'Deaths traded'), value: p => p?.analytics?.deathsTraded },
      { id: 'untradedDeaths', label: t('metrics-untraded', 'Untraded deaths'), value: p => p?.analytics?.untradedDeaths },
      { id: 'participation', label: t('metrics-trade-participation', 'Trade participation'), value: p => p?.analytics?.tradeParticipation },
      { id: 'advantage', label: t('metrics-advantage', 'Kills with numerical advantage'), value: p => p?.analytics?.killsWithAdvantage },
      { id: 'disadvantage', label: t('metrics-disadvantage', 'Kills at numerical disadvantage'), value: p => p?.analytics?.killsAtDisadvantage },
    ] },
    { id: 'grenades', label: t('metrics-grenades', 'Grenades'), columns: [
      { id: 'heThrown', label: t('metrics-he-thrown', 'HE detonations'), value: p => p?.analytics?.grenades.heThrown },
      { id: 'heDamage', label: t('he-damage', 'HE damage'), value: p => p?.heDamage },
      { id: 'infernos', label: t('metrics-infernos', 'Fire zones started'), value: p => p?.analytics?.grenades.infernosStarted },
      { id: 'fireDamage', label: t('fire-damage', 'Fire damage'), value: p => p?.fireDamage },
      { id: 'smokes', label: t('metrics-smokes', 'Smoke detonations'), value: p => p?.analytics?.grenades.smokesThrown },
    ] },
    { id: 'flashes', label: t('source-flashes', 'Flashes'), columns: [
      { id: 'flashes', label: t('metrics-flashes', 'Flashes thrown'), value: p => p?.analytics?.grenades.flashesThrown },
      { id: 'enemiesFlashed', label: t('metrics-enemies-flashed', 'Enemies flashed'), value: p => p?.enemiesFlashed },
      { id: 'enemyBlind', label: t('metrics-enemy-blind', 'Enemy blind time (seconds)'), value: p => p?.enemyBlindSeconds },
      { id: 'teammatesFlashed', label: t('metrics-teammates-flashed', 'Teammates flashed'), value: p => p?.analytics?.grenades.teammatesFlashed },
      { id: 'teamBlind', label: t('metrics-team-blind', 'Team blind time (seconds)'), value: p => p?.analytics?.grenades.teamBlindSeconds },
    ] },
    { id: 'clutches', label: t('metrics-clutches', 'Clutch wins & multi-kills'),
      note: t('metrics-clutch-note', 'Clutch wins are derived from recorded deaths and round wins. Survival and clutch coverage depend on the available participation data. A dash means unavailable, not zero.'), columns: [
      ...(['1v1', '1v2', '1v3', '1v4', '1v5'] as const).map(id => ({ id, label: id, value: (p: PlayerMetrics | undefined) => p?.analytics?.clutches[id] })),
      { id: '2k', label: '2K', value: p => p?.analytics?.multiKills.two },
      { id: '3k', label: '3K', value: p => p?.analytics?.multiKills.three },
      { id: '4k', label: '4K', value: p => p?.analytics?.multiKills.four },
      { id: '5k', label: '5K', value: p => p?.analytics?.multiKills.five },
    ] },
    { id: 'objectives', label: t('metrics-objectives', 'Bomb & equipment'), columns: [
      { id: 'plants', label: t('metrics-plants', 'Bomb plants'), value: p => p?.analytics?.bomb.plants },
      { id: 'defuses', label: t('metrics-defuses', 'Bomb defuses'), value: p => p?.analytics?.bomb.defuses },
      { id: 'explosions', label: t('metrics-explosions', 'Bomb explosions'), value: p => p?.analytics?.bomb.explosions },
      { id: 'equipment', label: t('metrics-equipment', 'Equipment value across freeze snapshots'), value: p => p?.analytics?.economy.freezeEquipmentValueTotal },
      { id: 'equipmentRounds', label: t('metrics-equipment-rounds', 'Rounds with equipment snapshots'), value: p => p?.analytics?.economy.freezeRoundsObserved },
    ] },
    { id: 'harm', label: t('metrics-team-harm', 'Recorded team harm'),
      note: t('metrics-harm-note', 'Recorded actions do not establish intent. Ordinary deaths and untraded deaths are facts, not automatic mistakes.'), columns: [
      { id: 'teamKills', label: t('metrics-team-kills', 'Team kills'), value: p => p?.analytics?.teamKills },
      { id: 'suicides', label: t('metrics-suicides', 'Suicides'), value: p => p?.analytics?.suicides },
      { id: 'teamDamage', label: t('metrics-team-damage', 'Team damage'), value: p => p?.analytics?.teamDamage },
      { id: 'heTeamDamage', label: t('metrics-he-team', 'HE team damage'), value: p => p?.analytics?.grenades.heTeamDamage },
      { id: 'fireTeamDamage', label: t('metrics-fire-team', 'Fire team damage'), value: p => p?.analytics?.grenades.infernoTeamDamage },
    ] },
  ];
}

/** Unknown values always sort last; ties retain the original roster order. */
export function compareMetricValues(a: number | string | null | undefined, b: number | string | null | undefined, direction: 'asc' | 'desc', collator: Intl.Collator): number {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  const difference = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
  return difference === 0 ? 0 : direction === 'asc' ? difference : -difference;
}
