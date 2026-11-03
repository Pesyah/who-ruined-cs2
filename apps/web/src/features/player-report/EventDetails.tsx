import { useTranslation } from 'react-i18next';
import type { MatchEvent } from '@who-ruined/contracts';

export function EventDetails({ event }: { event: MatchEvent }) {
  const { t, i18n } = useTranslation('match');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });
  const attrs = event.attrs;
  return <dl className="event-attributes">
    {typeof attrs.weapon === 'string' && <div><dt>{t('metrics-weapon', 'Weapon')}</dt><dd>{attrs.weapon}</dd></div>}
    {typeof attrs.rawHealthDamage === 'number' && <div><dt>{t('metrics-raw-damage', 'Recorded raw health damage')}</dt><dd>{number.format(attrs.rawHealthDamage)}</dd></div>}
    {typeof attrs.blindDuration === 'number' && <div><dt>{t('metrics-blind-duration', 'Blind duration (seconds)')}</dt><dd>{number.format(attrs.blindDuration)}</dd></div>}
    {event.context && <div><dt>{t('metrics-phase', 'Round phase')}</dt><dd>{event.context.phase === 'LIVE' ? t('metrics-live', 'Live') : event.context.phase === 'PRE_FREEZE' ? t('metrics-freeze', 'Before live play') : event.context.phase === 'POST_ROUND' ? t('metrics-post-round', 'After the round') : t('unknown', 'Unknown')}</dd></div>}
  </dl>;
}
