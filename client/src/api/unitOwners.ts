import { api } from './client';
import type { DeleteResponse } from '../types/api';
import type {
  CreateUnitOwnerRequest,
  UnitOwner,
  UpdateUnitOwnerRequest,
} from '../types/unit-owner';

export async function getUnitOwners() {
  const { data } = await api.get<UnitOwner[]>('/unit-owners');
  return data;
}

export async function getUnitOwner(unitOwnerId: string) {
  const { data } = await api.get<UnitOwner>(`/unit-owners/${unitOwnerId}`);
  return data;
}

export async function getUnitOwnersByUnit(unitId: string) {
  const { data } = await api.get<UnitOwner[]>(`/unit-owners/unit/${unitId}`);
  return data;
}

export async function getUnitOwnersByUser(userId: string) {
  const { data } = await api.get<UnitOwner[]>(`/unit-owners/user/${userId}`);
  return data;
}

export async function createUnitOwner(payload: CreateUnitOwnerRequest) {
  const { data } = await api.post<UnitOwner>('/unit-owners', payload);
  return data;
}

export async function updateUnitOwner(
  unitOwnerId: string,
  payload: UpdateUnitOwnerRequest,
) {
  const { data } = await api.patch<UnitOwner>(
    `/unit-owners/${unitOwnerId}`,
    payload,
  );
  return data;
}

export async function deleteUnitOwner(unitOwnerId: string) {
  const { data } = await api.delete<DeleteResponse>(
    `/unit-owners/${unitOwnerId}`,
  );
  return data;
}