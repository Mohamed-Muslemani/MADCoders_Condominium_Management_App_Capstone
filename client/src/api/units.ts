import { api } from './client';
import type { CreateUnitRequest, Unit } from '../types/unit';

export async function getUnits() {
  const { data } = await api.get<Unit[]>('/units');
  return data;
}

export async function createUnit(payload: CreateUnitRequest) {
  const { data } = await api.post<Unit>('/units', payload);
  return data;
}
