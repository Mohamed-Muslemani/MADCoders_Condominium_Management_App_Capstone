import { useContext, useMemo, useState, type ReactNode } from 'react';
import { TOKEN_KEY } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { UserRole } from '../types/user';

export const ROLE_KEY = 'condo_role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [role, setRoleState] = useState<UserRole | null>(() => {
    const storedRole = localStorage.getItem(ROLE_KEY);
    return storedRole === 'ADMIN' || storedRole === 'OWNER'
      ? storedRole
      : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
      setSession: (newToken: string, newRole: UserRole) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(ROLE_KEY, newRole);
        setTokenState(newToken);
        setRoleState(newRole);
      },
      clearToken: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        setTokenState(null);
        setRoleState(null);
      },
    }),
    [role, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
