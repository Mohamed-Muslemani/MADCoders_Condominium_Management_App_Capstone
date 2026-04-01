import { api } from './client';
import type { DeleteResponse } from '../types/api';
import type { CreateUserRequest, UpdateUserRequest, User } from '../types/user';

export async function getUsers() {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export async function getUser(userId: string) {
  const { data } = await api.get<User>(`/users/${userId}`);
  return data;
}

export async function createUser(payload: CreateUserRequest) {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function updateUser(userId: string, payload: UpdateUserRequest) {
  const { data } = await api.patch<User>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: string) {
  const { data } = await api.delete<DeleteResponse>(`/users/${userId}`);
  return data;
}