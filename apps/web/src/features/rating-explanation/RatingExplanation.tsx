import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MatchData, ParticipationExplanationFamilyRow, ParticipationExplanationPlayer } from '@who-ruined/contracts';
import { ApiClientError } from '../../shared/api/transport.js';
import { errorMessage } from '../../shared/messages.js';
import { Icon } from '../../shared/ui/Icon.js';
import { Disclosure } from '../../shared/ui/Disclosure.js';
import { DetailsSkeleton, Skeleton } from '../../shared/ui/Skeleton.js';

type ExplanationSource = ParticipationExplanationFamilyRow['sources'][number];

function sourceEvents(match: MatchData, source: ExplanationSource) {
  const evidenceIds = new Set(source.evidenceEventIds);
  return match.events.filter((event) => evidenceIds.has(event.id));
}

function eventSourceLabel(match: MatchData, source: ExplanationSource, playerId: string, t: ReturnType<typeof useTranslation>['t']): string | null {
  const events = sourceEvents(match, source);
  if (events.length === 0) return null;
  const deaths = events.filter((event) => event.kind === 'PLAYER_DEATH' || event.kind === 'PLAYER_DEATH_NONLIVE');
  if (deaths.some((event) => event.targetId === playerId)) return t('recorded-death', 'Recorded death');
  if (deaths.some((event) => event.assisterId === playerId)) return t('recorded-assist', 'Recorded assist');
  if (deaths.some((event) => event.actorId === playerId)) return t('recorded-kill', 'Recorded elimination');
  if (events.some((event) => event.kind === 'PLAYER_HURT')) return t('recorded-damage', 'Recorded damage');
  if (events.some((event) => event.kind === 'PLAYER_BLIND')) return t('recorded-flash', 'Recorded flash');
  if (events.some((event) => event.kind === 'BOMB_PLANTED')) return t('recorded-plant', 'Bomb planted');
  if (events.some((event) => event.kind === 'BOMB_DEFUSED')) return t('recorded-defuse', 'Bomb defused');
  if (events.some((event) => event.kind === 'HOSTAGE_RESCUED' || event.kind === 'HOSTAGE_HURT')) {
    return t('family-objectives', { ns: 'player', defaultValue: 'Objectives' });
  }
  return t('recorded-event', 'Recorded event');
}

function eventParticipantNames(match: MatchData, source: ExplanationSource, playerId: string): string[] {
  const namesById = new Map(match.players.map((item) => [item.id, item.displayName]));
  const participants = sourceEvents(match, source).flatMap((event) => {
    if (event.actorId === playerId) return event.targetId ? [event.targetId] : [];
    if (event.targetId === playerId) return event.actorId ? [event.actorId] : [];
    if (event.assisterId === playerId) return event.targetId ? [event.targetId] : [];
    return [event.actorId, event.targetId].filter((id): id is string => id !== null && id !== playerId);
  });
  return [...new Set(participants)].map((id) => namesById.get(id)).filter((name): name is string => Boolean(name));
}

export function RatingExplanation({ match, player, base, loading = false, error, retry }: {
  match: MatchData;
  player?: ParticipationExplanationPlayer;
  base: string;
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
}) {
  const { t, i18n } = useTranslation('player');
  const [selectedFamily, setSelectedFamily] = useState<ParticipationExplanationFamilyRow['family']>('COMBAT');
  const [visibleSources, setVisibleSources] = useState(5);
  const detailId = useId();
  const eventColumnLabel = t('evidence-event-round', 'Event / round');
  const participantsColumnLabel = t('evidence-participants', 'Participants');
  const family = player?.rating?.families.find(row => row.family === selectedFamily) ?? player?.rating?.families[0];
  const familyLabels: Record<ParticipationExplanationFamilyRow['family'], string> = {
    COMBAT: t('family-combat', { ns: 'player', defaultValue: 'Combat' }),
    SUPPORT: t('family-support', { ns: 'player', defaultValue: 'Support' }),
    DEATH_RELATED: t('family-death-related', { ns: 'player', defaultValue: 'Death-related' }),
    OBJECTIVES: t('family-objectives', { ns: 'player', defaultValue: 'Objectives' }),
    CONTEXT: t('family-context', { ns: 'player', defaultValue: 'Context' }),
    DIRECT_HARM: t('family-direct-harm', { ns: 'player', defaultValue: 'Direct harm' })
  };
  const familyDescriptions: Record<ParticipationExplanationFamilyRow['family'], string> = {
    COMBAT: t('explain-combat', { ns: 'player', defaultValue: 'Verified combat outcomes, including eliminations and their recorded match context.' }),
    SUPPORT: t('explain-support', { ns: 'player', defaultValue: 'Verified assists, flashes and other recorded support for teammates.' }),
    DEATH_RELATED: t('explain-death-related', { ns: 'player', defaultValue: 'Recorded death exposure. A death is a fact, not an automatic tactical mistake.' }),
    OBJECTIVES: t('explain-objectives', { ns: 'player', defaultValue: 'Verified bomb or hostage objective actions, with model limits applied when needed.' }),
    CONTEXT: t('explain-context', { ns: 'player', defaultValue: 'Match-context modifiers and model centering. A negative value may come from centering, not a bad action.' }),
    DIRECT_HARM: t('explain-direct-harm', { ns: 'player', defaultValue: 'Verified harm to teammates, softened before the active H2 influence is applied.' })
  };
  const sourceLabels: Record<ParticipationExplanationFamilyRow['sources'][number]['kind'], string> = {
    EVENT: t('explain-source-event', { ns: 'player', defaultValue: 'Confirmed event evidence' }),
    AGGREGATE: family ? familyLabels[family.family] : t('explain-source-event', { ns: 'player', defaultValue: 'Confirmed event evidence' }),
    BASELINE: t('explain-source-baseline', { ns: 'player', defaultValue: 'Baseline or centering adjustment' })
  };
  const transformLabels: Record<ParticipationExplanationFamilyRow['transformations'][number]['code'], string> = {
    POSITIVE_LINEAR_SCALE: t('final-attribution', 'Final attribution'),
    NEGATIVE_MASS_SOFTENING: t('explain-transform-negative', { ns: 'player', defaultValue: 'Shared nonlinear normalization of negative families' }),
    DIRECT_HARM_SOFTENING: t('explain-transform-harm-soft', { ns: 'player', defaultValue: 'Soft limit for direct harm' }),
    DIRECT_HARM_MULTIPLIER: t('final-attribution', 'Final attribution'),
    CONTEXT_CENTERING: t('explain-transform-context-center', { ns: 'player', defaultValue: 'Context centering against the model baseline' }),
    CONTEXT_SATURATION: t('explain-transform-limit', 'Model contribution limit'),
    OBJECTIVE_CAP: t('explain-transform-limit', 'Model contribution limit')
  };
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 6, signDisplay: 'exceptZero' }).format(value);
  const unsigned = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 6 }).format(value);
  const roundOrdinal = new Map(match.rounds.map((round) => [round.id, round.ordinal]));
  // Only sources linked to a round or event belong in the match evidence table.
  // Unlinked factors and baselines remain available in calculation details, even at zero.
  const isLinkedEvidence = (source: ExplanationSource) => source.kind !== 'BASELINE' && (source.roundIds.length > 0 || source.evidenceEventIds.length > 0);
  const calculationSources = (family?.sources ?? []).filter(source => !isLinkedEvidence(source));
  const sources = (family?.sources ?? []).filter(isLinkedEvidence).sort((a, b) => {
    const firstRound = (source: ExplanationSource) => Math.min(...source.roundIds.map(id => roundOrdinal.get(id) ?? Infinity));
    return firstRound(a) - firstRound(b) || 0;
  });
  return <section className="panel rating-explanation"><div className="section-heading"><h2>{t('rating-explanation-title', 'How the rating was formed')}</h2></div>
    {!player && loading ? <DetailsSkeleton/> :
      !player && error instanceof ApiClientError && error.code === 'REPORT_NOT_READY' ? <div className="analytics-notice" role="status"><Skeleton className="skeleton-metric"/><span>{t('error-incomplete', 'The match analysis is not complete yet.')}</span></div> :
      !player && error ? <div className="inline-alert" role="status"><Icon name="warning"/><p>{errorMessage(error, t)}</p>{retry && <button className="button secondary" onClick={retry}>{t('retry', 'Try again')}</button>}</div> :
      !player?.rating ? <p className="data-note">{t('rating-unavailable', 'The active rating is unavailable.')}</p> : <>
        {family && <>
          <div className="family-selector" role="group" aria-label={t('six-families', 'Six rating families')}>
            {player.rating.families.map(row => <button type="button" id={`${detailId}-${row.family}`} key={row.family} data-contribution={row.finalAttribution < 0 ? 'negative' : row.finalAttribution > 0 ? 'positive' : 'neutral'} aria-pressed={family.family === row.family} aria-controls={detailId} onClick={() => { if (row.family !== family.family) { setSelectedFamily(row.family); setVisibleSources(5); } }}>
              <span>{familyLabels[row.family]}</span><strong className={row.finalAttribution < 0 ? 'negative-value' : row.finalAttribution > 0 ? 'positive-value' : ''}>{number(row.finalAttribution)}</strong>
            </button>)}
          </div>
          <section className="family-detail content-reveal" key={family.family} id={detailId} role="region" aria-labelledby={`${detailId}-${family.family}`}>
            <div className="family-detail-heading"><div><h3>{familyLabels[family.family]}</h3><p>{familyDescriptions[family.family]}</p></div><dl className="family-total"><dt>{t('final-attribution', 'Final attribution')}</dt><dd className={family.finalAttribution < 0 ? 'negative-value' : family.finalAttribution > 0 ? 'positive-value' : ''}><bdi>{number(family.finalAttribution)}</bdi></dd></dl></div>
            <div className="family-evidence">
              {sources.length === 0 && <p className="data-note">{t('no-events', 'No recorded events match this selection.')}</p>}
              {sources.length > 0 && <table className="evidence-table" role="table">
                <caption className="sr-only">{t('rating-explanation-evidence', 'Evidence and base adjustments')}</caption>
                <colgroup><col className="evidence-event-column"/><col className="evidence-participants-column"/><col/><col/></colgroup>
                <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">{eventColumnLabel}</th><th scope="col" role="columnheader">{participantsColumnLabel}</th><th scope="col" role="columnheader">{t('raw-input', 'Raw input')}</th><th scope="col" role="columnheader">{t('final-attribution', 'Final attribution')}</th></tr></thead>
                <tbody role="rowgroup">{sources.slice(0, visibleSources).map((source, index) => {
                const eventLabel = eventSourceLabel(match, source, player.playerId, t);
                const participantNames = eventParticipantNames(match, source, player.playerId);
                return <tr role="row" key={`${source.kind}-${index}`}>
                  <th scope="row" role="rowheader"><span className="evidence-mobile-label" aria-hidden="true">{eventColumnLabel}</span><strong>{eventLabel ?? sourceLabels[source.kind]}</strong>{source.roundIds.length > 0 && <div className="evidence-rounds">{source.roundIds.map(roundId => <Link key={roundId} to={`${base}#rounds`}>{t('moment-round', 'Round {{round}}', { round: roundOrdinal.get(roundId) ?? '—' })}</Link>)}</div>}</th>
                  <td role="cell" className="evidence-participants"><span className="evidence-mobile-label" aria-hidden="true">{participantsColumnLabel}</span>{participantNames.join(', ') || '—'}</td>
                  <td role="cell" className="evidence-value"><span className="evidence-mobile-label" aria-hidden="true">{t('raw-input', 'Raw input')}</span><bdi>{number(source.rawContribution)}</bdi></td>
                  <td role="cell" className="evidence-value"><span className="evidence-mobile-label" aria-hidden="true">{t('final-attribution', 'Final attribution')}</span><bdi>{source.finalContribution === null ? '—' : number(source.finalContribution)}</bdi></td>
                </tr>;
              })}</tbody></table>}
              {sources.length > 5 && <div className="evidence-pagination"><button type="button" className="button secondary" onClick={() => setVisibleSources(count => count >= sources.length ? 5 : count + 5)}>{visibleSources >= sources.length ? t('less-evidence', 'Show fewer entries') : t('more-evidence', 'Show more entries')}</button><span aria-live="polite">{new Intl.NumberFormat(i18n.resolvedLanguage).format(Math.min(visibleSources, sources.length))} / {new Intl.NumberFormat(i18n.resolvedLanguage).format(sources.length)}</span></div>}
            </div>
            <Disclosure className="family-calculation" variant="quiet" level={3} title={t('calculation-details', 'How this is calculated')}>
              <dl className="explanation-values"><div><dt>{t('raw-input', 'Raw input')}</dt><dd>{number(family.rawInput)}</dd></div><div><dt>{t('final-attribution', 'Final attribution')}</dt><dd>{number(family.finalAttribution)}</dd></div></dl>
              {family.sources.some(source => source.finalContribution === null) && <p className="data-note">{t('explain-final-family-only', 'Final influence is available only at family level.')}</p>}
              {calculationSources.length > 0 && <div className="explanation-block calculation-sources"><h3>{t('rating-explanation-evidence', 'Evidence and base adjustments')}</h3><p className="data-note">{t('raw-input', 'Raw input')} → {t('final-attribution', 'Final attribution')}</p><ul>{calculationSources.map((source, index) => <li key={`${source.kind}-${index}`}><strong>{sourceLabels[source.kind]}</strong><span><bdi>{number(source.rawContribution)}</bdi> → <bdi>{source.finalContribution === null ? '—' : number(source.finalContribution)}</bdi></span></li>)}</ul></div>}
              <div className="explanation-block"><h3>{t('rating-explanation-transformations', 'Model transformations')}</h3><ul>{family.transformations.map(transform => <li key={transform.code}><span><strong>{transformLabels[transform.code]}</strong>{transform.scope === 'CROSS_FAMILY' && <small>{t('explain-cross-family', 'Applied jointly across negative families; not assigned to individual events.')}</small>}</span><span>{transform.input === null ? '—' : number(transform.input)} → {transform.output === null ? '—' : number(transform.output)}</span></li>)}</ul></div>
              <p className="explanation-equation">{t('rating-explanation-equation', 'Base 1 + six final family contributions = {{value}}.', { value: unsigned(player.rating.arithmetic.reconstructed) })}</p>
              <p className="data-note">{t('rating-explanation-note', 'Confirmed events explain only the evidence that can be linked safely. Baselines and nonlinear transformations remain separate and are not redistributed across events.')}</p>
            </Disclosure>
          </section>
        </>}
      </>}
  </section>;
}

