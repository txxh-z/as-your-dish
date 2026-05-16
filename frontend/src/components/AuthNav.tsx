import { Link, useNavigate } from 'react-router-dom';

import { useLogout } from '../hooks/useAuth';
import { useLanguage } from '../i18n';
import { useAuthStore } from '../store/authStore';

export function AuthNav() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { copy } = useLanguage();

  if (!user) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/login"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
        >
          {copy.auth.login}
        </Link>
        <Link
          to="/register"
          className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800"
        >
          {copy.auth.register}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <Link
        to="/history"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
      >
        {copy.auth.history}
      </Link>
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
        {copy.auth.logout}
      </button>
    </nav>
  );
}
