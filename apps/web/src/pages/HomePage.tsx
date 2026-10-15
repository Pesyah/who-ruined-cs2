import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getMatches, uploadDemo } from '../api.js';

export function HomePage() {
  const input = useRef<HTMLInputElement>(null); const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const recent = useQuery({ queryKey: ['matches'], queryFn: getMatches });
  async function select(file?: File) { if (!file) return; setBusy(true); setError(null); try { const result = await uploadDemo(file); navigate(`/jobs/${result.jobId}`); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить файл'); } finally { setBusy(false); } }
  return <>
    <section className="grid gap-9 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><div><p className="eyebrow">Разбор матча без домыслов</p><h1 className="mt-4 max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">Кто просел —<br/><span className="text-acid">и почему?</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/60">Загрузите локальный CS2 demo. Мы восстановим команды, раунды и счёт. Неподтверждённые данные останутся недоступными, а не превратятся в догадки.</p></div>
    <div className="panel p-6"><button type="button" disabled={busy} onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void select(event.dataTransfer.files[0]); }} className="flex min-h-64 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-acid/50 bg-acid/[.04] p-8 text-center transition hover:bg-acid/[.08] focus:outline-none focus:ring-2 focus:ring-acid disabled:opacity-50"><span className="text-4xl">↥</span><strong className="mt-4 text-xl">{busy ? 'Загружаем…' : 'Выберите .dem'}</strong><span className="mt-2 text-sm text-white/45">или перетащите сюда · до 250 МиБ</span></button><input ref={input} className="sr-only" type="file" accept=".dem" onChange={(event) => void select(event.target.files?.[0])}/>{error && <p role="alert" className="mt-4 rounded-lg bg-ember/15 p-3 text-sm text-red-200">{error}</p>}</div></section>
    <section className="mt-20"><p className="eyebrow">Последние локальные разборы</p><div className="mt-5 grid gap-3">{recent.data?.items.length ? recent.data.items.map((item) => <Link className="panel flex items-center justify-between p-5 transition hover:border-acid/40" key={item.id} to={item.status === 'COMPLETED' || item.status === 'PARTIAL' ? `/matches/${item.id}` : '#'}><span><strong>{item.map ?? 'Карта определяется'}</strong><small className="mt-1 block text-white/40">{new Date(item.createdAt).toLocaleString('ru-RU')}</small></span><span className="text-sm text-acid">{item.status}</span></Link>) : <div className="panel p-6 text-white/45">Пока нет локальных анализов.</div>}</div></section>
  </>;
}
