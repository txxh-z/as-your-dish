import { AppRoutes } from './routes';
import { useAuth } from './hooks/useAuth';

export default function App() {
  useAuth();
  return <AppRoutes />;
}
