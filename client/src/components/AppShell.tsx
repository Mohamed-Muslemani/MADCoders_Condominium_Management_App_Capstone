import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-provider';
import { AppNav } from './AppNav';

export function AppShell() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <main className="page app-shell">
      <header className="toolbar">
        <h1>Condo API Test Pages</h1>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <AppNav />
      <Outlet />
    </main>
  );
}
