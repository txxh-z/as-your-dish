import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiError, apiGet } from '../services/api';
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

const EXAMPLE_LABELS: Record<string, string> = {
  'chinese-home-cooking': '中式家常菜',
  'italian-trattoria': '意式小餐馆',
  'japanese-izakaya': '日式居酒屋',
};

function displayNameFor(slug: string): string {
  return EXAMPLE_LABELS[slug] ?? slug.replace(/-/g, ' ');
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '示例菜单加载失败';
}

export function ExamplePickerDialog({
  open,
  onClose,
  onSelected,
}: ExamplePickerDialogProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const examples = useQuery({
    queryKey: ['demo-menu'],
    enabled: open,
    queryFn: () => apiGet<ExampleMenuListResponse>('/demo-menu'),
  });
  const detail = useMutation({
    mutationFn: (slug: string) =>
      apiGet<AnalyzeMenuResponse>(`/demo-menu/${encodeURIComponent(slug)}`),
    onSuccess: (data) => {
      setSelectedSlug(null);
      onSelected(data);
    },
    onError: () => setSelectedSlug(null),
  });

  if (!open) return null;

  function pickExample(slug: string) {
    setSelectedSlug(slug);
    detail.mutate(slug);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 px-4 py-4 sm:items-center sm:justify-center">
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl sm:max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">试用示例菜单</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              这是示例菜单，分析自己的菜单请在首页上传。
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {examples.isLoading && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            正在加载示例菜单
          </div>
        )}

        {examples.isError && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(examples.error)}
          </div>
        )}

        {detail.isError && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(detail.error)}
          </div>
        )}

        {examples.data?.items.length === 0 && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            暂无示例菜单。请先运行 seed 脚本生成示例数据。
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
                    alt={displayNameFor(item.slug)}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-slate-950">
                    {displayNameFor(item.slug)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.dishesCount} 道菜 · {item.languageDetected}
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                    {item.previewDishes.join(' / ') || '示例菜单'}
                  </div>
                  {selectedSlug === item.slug && detail.isPending && (
                    <div className="mt-2 text-xs font-medium text-teal-700">
                      打开中
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
