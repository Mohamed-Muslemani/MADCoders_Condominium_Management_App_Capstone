import { api } from './client';

export async function sendTestEmail() {
  const { data } = await api.post<{ message: string }>('/email/test');
  return data;
}
