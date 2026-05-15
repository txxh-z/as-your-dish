import { Link, useNavigate } from 'react-router-dom';

import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

export function AuthNav() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  if (!user) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/login"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
        >
          登录
        </Link>
        <Link
          to="/register"
          className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800"
        >
          注册
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <Link
        to="/profile"
        className="max-w-40 truncate rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
      >
        {user.email}
      </Link>
      <button
        type="button"
        className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSuccess: () => navigate('/'),
          })
        }
      >
        退出
      </button>
    </nav>
  );
}
