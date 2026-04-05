import { api } from './client';
import type { DeleteResponse } from '../types/api';
import type {
  CreateUnitDueRequest,
  SendUnitDueReminderResponse,
  UnitDue,
  UpdateUnitDueRequest,
} from '../types/unit-due';

export async function getUnitDues() {
  const { data } = await api.get<UnitDue[]>('/unit-dues');
  return data;
}

export async function getUnitDue(dueId: string) {
  const { data } = await api.get<UnitDue>(`/unit-dues/${dueId}`);
  return data;
}

export async function getUnitDuesByUnit(unitId: string) {
  const { data } = await api.get<UnitDue[]>(`/unit-dues/unit/${unitId}`);
  return data;
}

export async function createUnitDue(payload: CreateUnitDueRequest) {
  const { data } = await api.post<UnitDue>('/unit-dues', payload);
  return data;
}

export async function updateUnitDue(dueId: string, payload: UpdateUnitDueRequest) {
  const { data } = await api.patch<UnitDue>(`/unit-dues/${dueId}`, payload);
  return data;
}

export async function sendUnitDueReminder(dueId: string) {
  const { data } = await api.post<SendUnitDueReminderResponse>(
    `/unit-dues/${dueId}/send-reminder`,
  );
  return data;
}

export async function deleteUnitDue(dueId: string) {
  const { data } = await api.delete<DeleteResponse>(`/unit-dues/${dueId}`);
  return data;
}
