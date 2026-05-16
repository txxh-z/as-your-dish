import { AppRoutes } from './routes';
import { useAuth } from './hooks/useAuth';
import { LanguageProvider } from './i18n';

export default function App() {
  useAuth();
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}
