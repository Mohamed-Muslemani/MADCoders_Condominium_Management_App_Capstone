import { useMemo, useState, type ReactNode } from 'react';
import { TOKEN_KEY } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      setToken: (newToken: string) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        setTokenState(newToken);
      },
      clearToken: () => {
        localStorage.removeItem(TOKEN_KEY);
        setTokenState(null);
      },
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}