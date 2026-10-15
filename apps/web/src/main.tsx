import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { JobPage } from './pages/JobPage.js';
import { MatchPage } from './pages/MatchPage.js';
import './index.css';

const queryClient = new QueryClient();
function Layout() {
  return <div className="mx-auto min-h-screen max-w-6xl px-5 py-6 sm:px-8"><header className="mb-14 flex items-center justify-between"><Link to="/" className="text-lg font-black tracking-tight text-white">WHO RUINED <span className="text-acid">CS2</span></Link><span className="rounded-full border border-acid/30 px-3 py-1 text-xs text-acid">LOCAL · EXPERIMENTAL</span></header><main><Outlet /></main><footer className="mt-20 border-t border-white/10 py-8 text-sm text-white/45">Индекс описывает относительный вклад и подтверждённый friendly fire. Он не доказывает вину или намерение.</footer></div>;
}
const router = createBrowserRouter([{ element: <Layout />, children: [{ path: '/', element: <HomePage /> }, { path: '/jobs/:jobId', element: <JobPage /> }, { path: '/matches/:matchId', element: <MatchPage /> }] }]);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router}/></QueryClientProvider></React.StrictMode>);
