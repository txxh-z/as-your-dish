import { Link, useNavigate } from 'react-router-dom';

import { AuthNav } from '../components/AuthNav';
import { useHistory, useHistoryDetail } from '../hooks/useHistory';
import { ApiError } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { LAST_ANALYSIS_KEY } from './HomePage';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return '加载失败';
}

export function HistoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const history = useHistory(Boolean(user));
  const detail = useHistoryDetail();

  function openHistory(menuId: string) {
    detail.mutate(menuId, {
      onSuccess: (data) => {
        sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(data));
        navigate('/results', { state: data });
      },
    });
  }

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-2xl font-semibold text-slate-950">菜单历史</h1>
          </div>
          <AuthNav />
        </header>

        {history.isLoading && (
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            正在加载历史
          </section>
        )}

        {history.isError && (
          <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(history.error)}
          </section>
        )}

        {detail.isError && (
          <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {formatError(detail.error)}
          </section>
        )}

        {history.data?.items.length === 0 && (
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">暂无历史记录</h2>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              上传菜单
            </Link>
          </section>
        )}

        {history.data && history.data.items.length > 0 && (
          <section className="mt-5 grid gap-3">
            {history.data.items.map((item) => (
              <article
                key={item.menuId}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">
                      {formatDate(item.createdAt)} · {item.languageDetected}
                    </div>
                    <h2 className="mt-1 truncate text-base font-semibold text-slate-950">
                      {item.previewDishes.join(' / ') || '未命名菜单'}
                    </h2>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.dishesCount} 道菜
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
                    disabled={detail.isPending}
                    onClick={() => openHistory(item.menuId)}
                  >
                    {detail.isPending ? '打开中' : '查看'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
