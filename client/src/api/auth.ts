import { api } from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';

export async function login(payload: LoginRequest) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}
