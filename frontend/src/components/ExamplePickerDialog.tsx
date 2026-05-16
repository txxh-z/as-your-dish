import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiError, apiGet } from '../services/api';
import { EXAMPLE_LABELS_I18N, useLanguage } from '../i18n';
import type { AnalyzeMenuResponse } from '../types/analyze';

interface ExampleMenuItem {
  menuId: string;
  slug: string;
  languageDetected: string;
  dishesCount: number;
  previewDishes: string[];
  coverImagePath: string;
}

interface ExampleMenuListResponse {
  items: ExampleMenuItem[];
}

interface ExamplePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelected: (result: AnalyzeMenuResponse) => void;
}

interface ExampleDetailRequest {
  baseSlug: string;
  requestSlug: string;
}

function displayNameFor(
  slug: string,
  labels: Record<string, string>,
): string {
  return labels[slug] ?? slug.replace(/-/g, ' ');
}

function formatError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ExamplePickerDialog({
  open,
  onClose,
  onSelected,
}: ExamplePickerDialogProps) {
  const { language, copy } = useLanguage();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const examples = useQuery({
    queryKey: ['demo-menu'],
    enabled: open,
    queryFn: () => apiGet<ExampleMenuListResponse>('/demo-menu'),
  });
  const detail = useMutation({
    mutationFn: async ({ baseSlug, requestSlug }: ExampleDetailRequest) => {
      const data = await apiGet<AnalyzeMenuResponse>(
        `/demo-menu/${encodeURIComponent(requestSlug)}`,
      );
      return { ...data, exampleSlug: data.exampleSlug ?? baseSlug };
    },
    onSuccess: (data) => {
      setSelectedSlug(null);
      onSelected(data);
    },
    onError: () => setSelectedSlug(null),
  });

  if (!open) return null;

  function pickExample(slug: string) {
    setSelectedSlug(slug);
    // WHY: zh examples are stored under the bare slug; en/ko variants are
    // seeded as `${slug}-en` / `${slug}-ko`. Resolve here so the picker UI
    // can keep showing one card per cuisine while still surfacing the
    // language the user selected.
    const resolved = language === 'zh' ? slug : `${slug}-${language}`;
    detail.mutate({ baseSlug: slug, requestSlug: resolved });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 py-4 sm:items-center sm:justify-center">
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl sm:max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {copy.examples.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.examples.description}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            aria-label={copy.common.close}
          >
            ×
          </button>
        </div>

        {examples.isLoading && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {copy.examples.loading}
          </div>
        )}

        {examples.isError && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(examples.error, copy.examples.loadFailed)}
          </div>
        )}

        {detail.isError && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(detail.error, copy.examples.loadFailed)}
          </div>
        )}

        {examples.data?.items.length === 0 && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {copy.examples.empty}
          </div>
        )}

        {examples.data && examples.data.items.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {examples.data.items.map((item) => (
              <button
                key={item.menuId}
                type="button"
                className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={detail.isPending}
                onClick={() => pickExample(item.slug)}
              >
                <div className="aspect-[4/3] bg-slate-100">
                  <img
                    src={item.coverImagePath}
                    alt={displayNameFor(
                      item.slug,
                      EXAMPLE_LABELS_I18N[language],
                    )}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-slate-950">
                    {displayNameFor(item.slug, EXAMPLE_LABELS_I18N[language])}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {copy.examples.dishCount(item.dishesCount)} ·{' '}
                    {item.languageDetected}
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                    {item.previewDishes.join(' / ') || copy.examples.fallback}
                  </div>
                  {selectedSlug === item.slug && detail.isPending && (
                    <div className="mt-2 text-xs font-medium text-teal-700">
                      {copy.examples.opening}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
