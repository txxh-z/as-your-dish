import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiKeyDialog } from '../components/ApiKeyDialog';
import { AuthNav } from '../components/AuthNav';
import { DishCardSkeleton } from '../components/DishCardSkeleton';
import { ExamplePickerDialog } from '../components/ExamplePickerDialog';
import { MenuUploader } from '../components/MenuUploader';
import { useToast } from '../components/Toast';
import { ApiError } from '../services/api';
import { useAnalyzeMenu } from '../hooks/useAnalyzeMenu';
import type { AnalyzeMenuResponse } from '../types/analyze';

const LAST_ANALYSIS_KEY = 'as-your-dish:last-analysis';

function formatError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status} ${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return '分析失败';
}

export function HomePage() {
  const navigate = useNavigate();
  const analyzeMenu = useAnalyzeMenu();
  const { showToast } = useToast();
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  function startAnalyze(files: File[]) {
    setPendingFiles(files);
    analyzeMenu.mutate(files, {
      onSuccess: (data: AnalyzeMenuResponse) => {
        setPendingFiles(null);
        sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
        navigate('/results', { state: data });
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 402) {
          setQuotaDialogOpen(true);
          return;
        }
        showToast('error', formatError(err));
      },
    });
  }

  function openExample(data: AnalyzeMenuResponse) {
    sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
    setExampleDialogOpen(false);
    navigate('/results', { state: data });
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col items-start gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">菜单翻译助手</h1>
          </div>
          <AuthNav />
        </header>

        <div className="grid flex-1 items-start gap-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <MenuUploader
            disabled={analyzeMenu.isPending}
            onTryExample={() => setExampleDialogOpen(true)}
            onSubmit={startAnalyze}
          />

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">本次输出</div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">图片上限</dt>
                <dd className="font-medium text-slate-800">5 张</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">结果字段</dt>
                <dd className="font-medium text-slate-800">菜名 / 描述 / 用料</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">缓存</dt>
                <dd className="font-medium text-slate-800">同图秒返</dd>
              </div>
            </dl>
          </aside>
        </div>

        {analyzeMenu.isPending && (
          <section className="grid gap-4 pb-5 md:grid-cols-2 xl:grid-cols-3">
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
          </section>
        )}

        <ApiKeyDialog
          open={quotaDialogOpen}
          onClose={() => setQuotaDialogOpen(false)}
          onSaved={() => {
            if (pendingFiles) startAnalyze(pendingFiles);
          }}
        />
        <ExamplePickerDialog
          open={exampleDialogOpen}
          onClose={() => setExampleDialogOpen(false)}
          onSelected={openExample}
        />
      </div>
    </main>
  );
}

export { LAST_ANALYSIS_KEY };
