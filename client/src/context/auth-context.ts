import type { UserRole } from '../types/user';
import { createContext } from 'react';

export interface AuthContextValue {
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setSession: (token: string, role: UserRole) => void;
  clearToken: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
