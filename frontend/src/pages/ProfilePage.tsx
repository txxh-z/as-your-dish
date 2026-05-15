import { Link } from 'react-router-dom';

import { AuthNav } from '../components/AuthNav';
import { useAuthStore } from '../store/authStore';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-sm font-semibold text-slate-500">As Your Dish</div>
            <h1 className="text-xl font-semibold text-slate-950">个人档案</h1>
          </div>
          <AuthNav />
        </header>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">当前账号</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">
            {user?.email}
          </div>
          <dl className="mt-5 grid gap-3 border-t border-slate-200 pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">过敏原</dt>
              <dd className="mt-1 font-medium text-slate-900">尚未设置</dd>
            </div>
            <div>
              <dt className="text-slate-500">饮食偏好</dt>
              <dd className="mt-1 font-medium text-slate-900">尚未设置</dd>
            </div>
            <div>
              <dt className="text-slate-500">辣度</dt>
              <dd className="mt-1 font-medium text-slate-900">尚未设置</dd>
            </div>
          </dl>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            返回上传
          </Link>
        </section>
      </div>
    </main>
  );
}
