import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ResultsPage } from './pages/ResultsPage';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './i18n';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { copy } = useLanguage();

  if (isLoading) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          {copy.auth.checking}
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/history"
        element={
          <RequireAuth>
            <HistoryPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
