import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { AuthNav } from '../components/AuthNav';
import { DishCard } from '../components/DishCard';
import type { AnalyzeMenuResponse } from '../types/analyze';
import { LAST_ANALYSIS_KEY } from './HomePage';

function readStoredResult(): AnalyzeMenuResponse | null {
  const raw = sessionStorage.getItem(LAST_ANALYSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalyzeMenuResponse;
  } catch {
    return null;
  }
}

export function ResultsPage() {
  const location = useLocation();
  const result = useMemo(() => {
    return (location.state as AnalyzeMenuResponse | null) ?? readStoredResult();
  }, [location.state]);

  if (!result) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">没有可显示的结果</h1>
          <Link
            to="/"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            返回上传
          </Link>
        </div>
      </main>
    );
  }

  const dishes = result.result.dishes;
  const tokenCount =
    result.usage ? result.usage.inputTokens + result.usage.outputTokens : 0;

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {dishes.length} 道菜
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="inline-flex w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              重新上传
            </Link>
            <AuthNav />
          </div>
        </header>

        <section className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-slate-500">语言</div>
            <div className="mt-1 font-medium text-slate-900">
              {result.result.language_detected}
            </div>
          </div>
          <div>
            <div className="text-slate-500">缓存</div>
            <div className="mt-1 font-medium text-slate-900">
              {result.cached ? '命中' : '未命中'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">模型</div>
            <div className="mt-1 truncate font-medium text-slate-900">
              {result.model ?? 'cache'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Token</div>
            <div className="mt-1 font-medium text-slate-900">
              {tokenCount > 0 ? tokenCount.toLocaleString() : '0'}
            </div>
          </div>
        </section>

        {result.result.warnings.length > 0 && (
          <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {result.result.warnings.join(' / ')}
          </section>
        )}

        <section className="grid gap-4 py-5 md:grid-cols-2 xl:grid-cols-3">
          {dishes.map((dish, index) => (
            <DishCard
              key={`${dish.original_name}-${index}`}
              dish={dish}
              index={index}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
