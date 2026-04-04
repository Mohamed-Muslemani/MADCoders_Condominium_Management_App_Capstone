import { api } from './client';
import { buildQueryParams } from './utils';
import type { DeleteResponse } from '../types/api';
import type {
  CreateMaintenanceRequestRequest,
  MaintenanceRequest,
  MaintenanceRequestListParams,
  UpdateMaintenanceRequestRequest,
} from '../types/maintenance-request';

export async function getMaintenanceRequests(
  params: MaintenanceRequestListParams = {},
) {
  const { data } = await api.get<MaintenanceRequest[]>('/maintenance-requests', {
    params: buildQueryParams(params),
  });
  return data;
}

export async function getMyMaintenanceRequests(
  params: MaintenanceRequestListParams = {},
) {
  const { data } = await api.get<MaintenanceRequest[]>(
    '/maintenance-requests/my',
    {
      params: buildQueryParams(params),
    },
  );
  return data;
}

export async function getMaintenanceRequestsByUnit(unitId: string) {
  const { data } = await api.get<MaintenanceRequest[]>(
    `/maintenance-requests/unit/${unitId}`,
  );
  return data;
}

export async function getMaintenanceRequest(requestId: string) {
  const { data } = await api.get<MaintenanceRequest>(
    `/maintenance-requests/${requestId}`,
  );
  return data;
}

export async function createMaintenanceRequest(
  payload: CreateMaintenanceRequestRequest,
) {
  const { data } = await api.post<MaintenanceRequest>(
    '/maintenance-requests',
    payload,
  );
  return data;
}

export async function updateMaintenanceRequest(
  requestId: string,
  payload: UpdateMaintenanceRequestRequest,
) {
  const { data } = await api.patch<MaintenanceRequest>(
    `/maintenance-requests/${requestId}`,
    payload,
  );
  return data;
}

export async function deleteMaintenanceRequest(requestId: string) {
  const { data } = await api.delete<DeleteResponse>(
    `/maintenance-requests/${requestId}`,
  );
  return data;
}