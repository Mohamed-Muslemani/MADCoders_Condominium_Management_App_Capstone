import './App.css';
import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthUser } from './api';
import DocumentAiTestPage from './pages/DocumentAiTestPage';
import Login from './pages/Login';

const AUTH_STORAGE_KEY = 'condo-manager-auth-token';

function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!savedToken) {
      setCheckingAuth(false);
      return;
    }

    void restoreSession(savedToken);
  }, []);

  async function restoreSession(savedToken: string) {
    try {
      const currentUser = await getCurrentUser(savedToken);
      setToken(savedToken);
      setUser(currentUser);
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setToken('');
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }

  function handleLogin(accessToken: string, authUser: AuthUser) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, accessToken);
    setToken(accessToken);
    setUser(authUser);
    setCheckingAuth(false);
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken('');
    setUser(null);
    setCheckingAuth(false);
  }

  if (checkingAuth) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>Checking session</h1>
          <p className="muted-text">Verifying your saved login...</p>
        </section>
      </main>
    );
  }

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return <DocumentAiTestPage token={token} user={user} onLogout={handleLogout} />;
}

export default App;
