import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { TargetLanguage } from '@as-your-dish/shared';

import { AuthNav } from '../components/AuthNav';
import { DishCard } from '../components/DishCard';
import { EmptyState } from '../components/EmptyState';
import { LanguageSelector } from '../components/LanguageSelector';
import { ApiError, apiGet } from '../services/api';
import { useLanguage } from '../i18n';
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

function exampleSlugForLanguage(
  baseSlug: string,
  language: TargetLanguage,
): string {
  return language === 'zh' ? baseSlug : `${baseSlug}-${language}`;
}

export function ResultsPage() {
  const location = useLocation();
  const { language, copy } = useLanguage();
  const initialResult = useMemo(() => {
    return (location.state as AnalyzeMenuResponse | null) ?? readStoredResult();
  }, [location.state]);
  const [result, setResult] = useState<AnalyzeMenuResponse | null>(initialResult);
  const [exampleRefreshError, setExampleRefreshError] = useState<string | null>(null);
  const [isRefreshingExample, setIsRefreshingExample] = useState(false);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  useEffect(() => {
    if (!result?.isExample || !result.exampleSlug) return;

    const controller = new AbortController();
    const requestSlug = exampleSlugForLanguage(result.exampleSlug, language);

    setExampleRefreshError(null);
    setIsRefreshingExample(true);
    apiGet<AnalyzeMenuResponse>(`/demo-menu/${encodeURIComponent(requestSlug)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        const next = { ...data, exampleSlug: data.exampleSlug ?? result.exampleSlug };
        setResult(next);
        sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(next));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) {
          setExampleRefreshError(`${err.status} ${err.code}: ${err.message}`);
          return;
        }
        setExampleRefreshError(
          err instanceof Error ? err.message : copy.examples.loadFailed,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRefreshingExample(false);
      });

    return () => controller.abort();
  }, [copy.examples.loadFailed, language, result?.exampleSlug, result?.isExample]);

  if (!result) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            title={copy.result.emptyTitle}
            description={copy.result.emptyDescription}
            action={
              <Link
                to="/"
                className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {copy.result.backToUpload}
              </Link>
            }
          />
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
              {copy.result.dishCount(dishes.length)}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector />
            <Link
              to="/"
              className="inline-flex w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              {copy.result.reupload}
            </Link>
            <AuthNav />
          </div>
        </header>

        {result.isExample && (
          <section className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
            {copy.result.exampleNotice}
            {isRefreshingExample && (
              <span className="ml-2 font-medium">{copy.examples.opening}</span>
            )}
          </section>
        )}

        {exampleRefreshError && (
          <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {exampleRefreshError}
          </section>
        )}

        <section className="grid gap-3 border-b border-slate-200 py-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-slate-500">{copy.result.detectedLanguage}</div>
            <div className="mt-1 font-medium text-slate-900">
              {result.result.language_detected}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{copy.result.cache}</div>
            <div className="mt-1 font-medium text-slate-900">
              {result.cached ? copy.result.cacheHit : copy.result.cacheMiss}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{copy.result.model}</div>
            <div className="mt-1 truncate font-medium text-slate-900">
              {result.model ?? 'cache'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{copy.result.token}</div>
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
