import { api } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/auth';
import type { User } from '../types/user';

export async function getAuthHealth() {
  const { data } = await api.get<{ ok: boolean }>('/auth/health');
  return data;
}

export async function login(payload: LoginRequest) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterRequest) {
  const { data } = await api.post<RegisterResponse>('/auth/register', payload);
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>('/auth/me');
  return data;
}