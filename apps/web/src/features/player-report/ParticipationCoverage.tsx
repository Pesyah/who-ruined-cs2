import { useTranslation } from 'react-i18next';
import type { PlayerMetrics } from '../../entities/match/types.js';

export function ParticipationCoverage({ metrics }: { metrics: PlayerMetrics | undefined }) {
  const { t, i18n } = useTranslation('match');
  const coverage = metrics?.participation;
  if (!coverage) return null;
  const items = [
    { label: t('metrics-excluded-rounds', 'Globally excluded rounds'), value: coverage.globalExcludedRounds },
    { label: t('metrics-opportunities', 'Counted opportunities'), value: coverage.countedOpportunities },
    { label: t('metrics-excluded-opportunities', 'Excluded opportunities'), value: coverage.excludedOpportunities },
    { label: t('metrics-t-exposure', 'T side exposure'), value: coverage.sideExposure.T },
    { label: t('metrics-ct-exposure', 'CT side exposure'), value: coverage.sideExposure.CT },
  ];
  return <div className="participation-details"><dl className="detail-stats">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{new Intl.NumberFormat(i18n.resolvedLanguage).format(item.value)}</dd></div>)}</dl></div>;
}
