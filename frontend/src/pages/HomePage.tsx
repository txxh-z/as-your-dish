import { useNavigate } from 'react-router-dom';

import { AuthNav } from '../components/AuthNav';
import { MenuUploader } from '../components/MenuUploader';
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

  function handleSubmit(files: File[]) {
    analyzeMenu.mutate(files, {
      onSuccess: (data: AnalyzeMenuResponse) => {
        sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
        navigate('/results', { state: data });
      },
    });
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">菜单翻译助手</h1>
          </div>
          <AuthNav />
        </header>

        <div className="grid flex-1 items-start gap-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <MenuUploader
            disabled={analyzeMenu.isPending}
            onSubmit={handleSubmit}
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
          <div className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
            正在分析菜单
          </div>
        )}

        {analyzeMenu.isError && (
          <div className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg">
            {formatError(analyzeMenu.error)}
          </div>
        )}
      </div>
    </main>
  );
}

export { LAST_ANALYSIS_KEY };
