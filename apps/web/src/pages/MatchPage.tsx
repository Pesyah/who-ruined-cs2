import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getMatch } from '../api.js';

export function MatchPage() {
  const { matchId = '' } = useParams(); const query = useQuery({ queryKey: ['match', matchId], queryFn: () => getMatch(matchId) }); const match = query.data;
  if (query.isLoading) return <p aria-live="polite">Загружаем результат…</p>; if (!match) return <p role="alert">{query.error?.message ?? 'Матч не найден'}</p>;
  const final = match.rounds.at(-1)?.scoreAfter ?? {};
  const deaths = match.events.filter((event) => event.kind === 'PLAYER_DEATH');
  const stats = new Map(match.players.map((player) => [player.id, {
    kills: deaths.filter((event) => event.actorId === player.id && event.targetId !== player.id && event.attrs.friendlyFire !== true).length,
    deaths: deaths.filter((event) => event.targetId === player.id).length,
    assists: deaths.filter((event) => event.assisterId === player.id).length,
    teamKills: deaths.filter((event) => event.actorId === player.id && event.attrs.friendlyFire === true).length
  }]));
  return <><section><p className="eyebrow">{match.quality === 'VALID' ? 'Проверенный матч' : 'Частичный результат · без рейтинга'}</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><h1 className="text-5xl font-black tracking-tight">{match.map ?? 'Карта неизвестна'}</h1><div className="text-4xl font-black">{match.teams.map((team) => final[team.id] ?? 0).join(' : ')}</div></div>{match.quality !== 'VALID' && <div role="alert" className="panel mt-7 border-amber-300/30 p-5 text-amber-100"><strong>Рейтинг отключён.</strong> Не все инварианты состава, сторон, раундов и счёта подтверждены.</div>}</section>
  <section className="mt-12 grid gap-5 lg:grid-cols-2">{match.teams.map((team) => <article className="panel overflow-hidden" key={team.id}><header className="flex justify-between border-b border-white/10 p-5"><strong>{team.label}</strong><span className="text-acid">{final[team.id] ?? 0}</span></header><div className="grid grid-cols-[1fr_repeat(4,2.5rem)] gap-2 border-b border-white/10 px-4 py-2 text-right text-xs uppercase text-white/35"><span className="text-left">Игрок</span><span>K</span><span>D</span><span>A</span><span>TK</span></div><div className="divide-y divide-white/5">{team.playerIds.map((id) => { const player = match.players.find((item) => item.id === id); const row = stats.get(id); return <div className="grid grid-cols-[1fr_repeat(4,2.5rem)] gap-2 p-4 text-right" key={id}><span className="truncate text-left">{player?.displayName ?? 'Игрок'}</span><span>{row?.kills ?? 0}</span><span>{row?.deaths ?? 0}</span><span>{row?.assists ?? 0}</span><span>{row?.teamKills ?? 0}</span></div>; })}</div></article>)}</section>
  <section className="mt-12"><p className="eyebrow">Раунды</p><div className="mt-4 flex flex-wrap gap-2">{match.rounds.map((round) => <div title={round.issues.join(', ') || 'Проверен'} className={`grid h-12 w-12 place-items-center rounded-lg border text-sm font-bold ${round.isValid ? 'border-white/10 bg-white/5' : 'border-ember/50 bg-ember/10'}`} key={round.id}>{round.ordinal}</div>)}</div></section>
  {match.qualityIssues.length > 0 && <section className="mt-12"><p className="eyebrow">Что не подтверждено</p><ul className="panel mt-4 divide-y divide-white/5">{match.qualityIssues.map((issue, index) => <li className="p-4 text-white/65" key={`${issue.code}-${index}`}><strong className="text-white">{issue.code}</strong> — {issue.message}</li>)}</ul></section>}</>;
}
