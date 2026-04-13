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

export async function uploadMaintenanceRequestAttachment(
  requestId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post(
    `/maintenance-requests/${requestId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

function parseFilename(headers: Record<string, unknown>) {
  const headerValue = headers['content-disposition'];
  const contentDisposition =
    typeof headerValue === 'string' ? headerValue : '';
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return decodeURIComponent(plainMatch[1]);
  }

  return 'attachment';
}

export async function downloadMaintenanceRequestAttachment(fileId: string) {
  const response = await api.get<Blob>(
    `/maintenance-requests/attachments/${fileId}/download`,
    {
      responseType: 'blob',
    },
  );

  return {
    blob: response.data,
    filename: parseFilename(response.headers),
    mimeType: response.headers['content-type'] || response.data.type,
  };
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
