import { api } from './client';
import type {
  CreateUnitRequest,
  Unit,
  UpdateUnitRequest,
} from '../types/unit';
import type { DeleteResponse } from '../types/api';

export async function getUnits() {
  const { data } = await api.get<Unit[]>('/units');
  return data;
}

export async function getUnit(unitId: string) {
  const { data } = await api.get<Unit>(`/units/${unitId}`);
  return data;
}

export async function createUnit(payload: CreateUnitRequest) {
  const { data } = await api.post<Unit>('/units', payload);
  return data;
}

export async function updateUnit(unitId: string, payload: UpdateUnitRequest) {
  const { data } = await api.patch<Unit>(`/units/${unitId}`, payload);
  return data;
}

export async function deleteUnit(unitId: string) {
  const { data } = await api.delete<DeleteResponse>(`/units/${unitId}`);
  return data;
} 