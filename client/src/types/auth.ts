
import type { User } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'OWNER';
}

export type AuthUser = User;

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type RegisterResponse = LoginResponse;
