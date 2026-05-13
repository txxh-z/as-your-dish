import { useEffect, useState } from 'react';
import { apiGet, ApiError, type HealthResponse } from './services/api';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string };

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    apiGet<HealthResponse>('/health')
      .then((data) => {
        if (!cancelled) setStatus({ kind: 'ok', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? `${err.status} ${err.code}: ${err.message}` : (err as Error).message;
        setStatus({ kind: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-3">🍽️</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">菜单翻译助手</h1>
        <p className="text-sm text-slate-500 mb-6">Menu Translator · phase 1 scaffold</p>

        {status.kind === 'loading' && (
          <div className="text-slate-500">Checking backend…</div>
        )}
        {status.kind === 'ok' && (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Backend OK
            </div>
            <dl className="text-xs text-slate-500 mt-4 space-y-1 text-left bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between"><dt>env</dt><dd>{status.data.env}</dd></div>
              <div className="flex justify-between"><dt>llmProvider</dt><dd>{status.data.llmProvider}</dd></div>
              <div className="flex justify-between"><dt>ts</dt><dd className="truncate ml-2">{status.data.ts}</dd></div>
            </dl>
          </div>
        )}
        {status.kind === 'error' && (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Backend DOWN
            </div>
            <p className="text-xs text-slate-500 mt-3">{status.message}</p>
            <p className="text-xs text-slate-400">Run <code className="bg-slate-100 px-1 rounded">npm run dev</code> from the repo root.</p>
          </div>
        )}
      </div>
    </main>
  );
}
