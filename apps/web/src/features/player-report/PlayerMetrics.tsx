import { useTranslation } from 'react-i18next';
import type { PlayerMetrics as Metrics } from '../../entities/match/types.js';
import { metricGroups } from '../../entities/match/metric-groups.js';
import { Skeleton } from '../../shared/ui/Skeleton.js';
import { Disclosure } from '../../shared/ui/Disclosure.js';

export function PlayerMetrics({ metrics, loading }: { metrics: Metrics | undefined; loading: boolean }) {
  const { t, i18n } = useTranslation('match');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });
  return <section className="player-metrics" aria-label={t('statistics', 'Statistics')}>
    <h2>{t('statistics', 'Statistics')}</h2>
    <div className="metric-blocks">{metricGroups(t).map(group => <article className="metric-block" key={group.id}>
      <h3>{group.label}</h3>
      {group.note && <p className="data-note">{group.note}</p>}
      <dl className="detail-stats">{group.columns.map(column => {
        const value = column.value(metrics);
        return <div key={column.id}><dt>{column.label}</dt><dd>{loading ? <Skeleton className="skeleton-metric"/> : value == null ? '—' : number.format(value)}</dd></div>;
      })}</dl>
      {group.id === 'objectives' && <p className="data-note">{t('source-economy', 'Economy')}: {metrics?.analytics?.economy.availability === 'AVAILABLE' ? t('source-available', 'Available') : metrics?.analytics?.economy.availability === 'PARTIAL' ? t('source-partial', 'Partial') : t('source-unavailable', 'Unavailable')}</p>}
    </article>)}</div>
    <Disclosure className="metric-guide" variant="quiet" level={3} title={t('metric-guide', 'What do these metrics mean?')}><p>{t('metric-definitions-rating', 'ADR is average damage per verified round. KAST is the percentage of rounds with a kill, assist, survival or trade. The dimensionless rating is experimental, uncalibrated and not a claim of intentional harm.')}</p></Disclosure>
  </section>;
}
