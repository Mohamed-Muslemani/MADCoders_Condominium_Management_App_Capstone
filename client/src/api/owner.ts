import { getAnnouncements } from './announcements';
import { getCurrentUserProfile } from './users';
import {
  createMaintenanceRequest,
  getMyMaintenanceRequests,
  uploadMaintenanceRequestAttachment,
} from './maintenanceRequests';
import { getUnitDuesByUnit } from './unitDues';
import type { AnnouncementListParams } from '../types/announcement';
import type { SearchDocumentsRequest, AskDocumentsResponse } from '../types/document';
import type {
  CreateMaintenanceRequestRequest,
  MaintenanceRequestListParams,
} from '../types/maintenance-request';
import type { DocumentSummary } from '../types/document';
import type { OwnerDashboardResponse, OwnerDuesQuery } from '../types/owner';
import { api } from './client';

export const OWNER_SELECTED_UNIT_KEY = 'owner_selected_unit_id';

export function getSelectedOwnerUnitId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(OWNER_SELECTED_UNIT_KEY) ?? '';
}

export function setSelectedOwnerUnitId(unitId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!unitId) {
    window.localStorage.removeItem(OWNER_SELECTED_UNIT_KEY);
    return;
  }

  window.localStorage.setItem(OWNER_SELECTED_UNIT_KEY, unitId);
}

export async function getOwnerProfile() {
  return getCurrentUserProfile();
}

export async function getOwnerAnnouncements(
  params: AnnouncementListParams = { activeOnly: true },
) {
  return getAnnouncements(params);
}

export async function getOwnerMaintenanceRequests(
  params: MaintenanceRequestListParams = {},
) {
  return getMyMaintenanceRequests(params);
}

export async function submitOwnerMaintenanceRequest(
  payload: CreateMaintenanceRequestRequest,
) {
  return createMaintenanceRequest(payload);
}

export async function uploadOwnerMaintenanceAttachment(
  requestId: string,
  file: File,
) {
  return uploadMaintenanceRequestAttachment(requestId, file);
}

export async function getOwnerUnitDues({ unitId }: OwnerDuesQuery) {
  return getUnitDuesByUnit(unitId);
}

export async function getOwnerDashboard(unitId?: string) {
  const { data } = await api.get<OwnerDashboardResponse>('/owner/dashboard', {
    params: unitId ? { unitId } : undefined,
  });
  return data;
}

export async function getOwnerDocuments() {
  const { data } = await api.get<DocumentSummary[]>('/owner/documents');
  return data;
}

export async function askOwnerDocuments(payload: SearchDocumentsRequest) {
  const { data } = await api.post<AskDocumentsResponse>(
    '/owner/documents/ask',
    payload,
  );
  return data;
}
