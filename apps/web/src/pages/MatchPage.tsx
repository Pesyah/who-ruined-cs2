import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getMatch } from '../api.js';

export function MatchPage() {
  const { matchId = '' } = useParams(); const query = useQuery({ queryKey: ['match', matchId], queryFn: () => getMatch(matchId) }); const match = query.data;
  if (query.isLoading) return <p aria-live="polite">Загружаем результат…</p>; if (!match) return <p role="alert">{query.error?.message ?? 'Матч не найден'}</p>;
  const final = match.rounds.at(-1)?.scoreAfter ?? {};
  return <><section><p className="eyebrow">{match.quality === 'VALID' ? 'Проверенный матч' : 'Частичный результат · без рейтинга'}</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><h1 className="text-5xl font-black tracking-tight">{match.map ?? 'Карта неизвестна'}</h1><div className="text-4xl font-black">{match.teams.map((team) => final[team.id] ?? 0).join(' : ')}</div></div>{match.quality !== 'VALID' && <div role="alert" className="panel mt-7 border-amber-300/30 p-5 text-amber-100"><strong>Рейтинг отключён.</strong> Не все инварианты состава, сторон, раундов и счёта подтверждены.</div>}</section>
  <section className="mt-12 grid gap-5 lg:grid-cols-2">{match.teams.map((team) => <article className="panel overflow-hidden" key={team.id}><header className="flex justify-between border-b border-white/10 p-5"><strong>{team.label}</strong><span className="text-acid">{final[team.id] ?? 0}</span></header><div className="divide-y divide-white/5">{team.playerIds.map((id) => { const player = match.players.find((item) => item.id === id); return <div className="flex justify-between p-4" key={id}><span>{player?.displayName ?? 'Игрок'}</span><span className="text-xs text-white/35">stable roster ID</span></div>; })}</div></article>)}</section>
  <section className="mt-12"><p className="eyebrow">Раунды</p><div className="mt-4 flex flex-wrap gap-2">{match.rounds.map((round) => <div title={round.issues.join(', ') || 'Проверен'} className={`grid h-12 w-12 place-items-center rounded-lg border text-sm font-bold ${round.isValid ? 'border-white/10 bg-white/5' : 'border-ember/50 bg-ember/10'}`} key={round.id}>{round.ordinal}</div>)}</div></section>
  {match.qualityIssues.length > 0 && <section className="mt-12"><p className="eyebrow">Что не подтверждено</p><ul className="panel mt-4 divide-y divide-white/5">{match.qualityIssues.map((issue, index) => <li className="p-4 text-white/65" key={`${issue.code}-${index}`}><strong className="text-white">{issue.code}</strong> — {issue.message}</li>)}</ul></section>}</>;
}
