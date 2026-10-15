import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { getJob } from '../api.js';

const labels: Record<string,string> = { QUEUED: 'В очереди', PARSING: 'Читаем события demo', NORMALIZING: 'Нормализуем данные', VALIDATING: 'Проверяем раунды и счёт', PARTIAL: 'Частичный результат', COMPLETED: 'Готово', FAILED: 'Анализ не выполнен' };
export function JobPage() {
  const { jobId = '' } = useParams(); const query = useQuery({ queryKey: ['job', jobId], queryFn: () => getJob(jobId), refetchInterval: (state) => { const status = state.state.data?.status; return status && ['COMPLETED','PARTIAL','FAILED','CANCELLED'].includes(status) ? false : 2000; } });
  if (query.data && ['COMPLETED','PARTIAL'].includes(query.data.status)) return <Navigate replace to={`/matches/${query.data.matchId}`}/>;
  return <section className="mx-auto max-w-2xl"><p className="eyebrow">Фоновая задача</p><h1 className="mt-4 text-4xl font-black">{labels[query.data?.status ?? 'QUEUED'] ?? query.data?.stage ?? 'Загрузка…'}</h1><div className="panel mt-8 p-6" aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-acid"/></div><p className="mt-5 text-white/55">Парсер запускается последовательно. Страница обновляет статус каждые две секунды.</p>{query.data?.errorCode && <p role="alert" className="mt-4 rounded-lg bg-ember/15 p-4 text-red-200"><strong>{query.data.errorCode}</strong><br/>{query.data.message}</p>}{query.error && <p role="alert" className="mt-4 text-red-200">{query.error.message}</p>}</div></section>;
}
