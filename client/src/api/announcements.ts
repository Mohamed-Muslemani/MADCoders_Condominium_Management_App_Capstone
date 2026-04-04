import { api } from './client';
import { buildQueryParams } from './utils';
import type { DeleteResponse } from '../types/api';
import type {
  Announcement,
  AnnouncementListParams,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '../types/announcement';

export async function getAnnouncements(params: AnnouncementListParams = {}) {
  const { data } = await api.get<Announcement[]>('/announcements', {
    params: buildQueryParams(params),
  });
  return data;
}

export async function getAnnouncement(announcementId: string) {
  const { data } = await api.get<Announcement>(
    `/announcements/${announcementId}`,
  );
  return data;
}

export async function createAnnouncement(payload: CreateAnnouncementRequest) {
  const { data } = await api.post<Announcement>('/announcements', payload);
  return data;
}

export async function updateAnnouncement(
  announcementId: string,
  payload: UpdateAnnouncementRequest,
) {
  const { data } = await api.patch<Announcement>(
    `/announcements/${announcementId}`,
    payload,
  );
  return data;
}

export async function deleteAnnouncement(announcementId: string) {
  const { data } = await api.delete<DeleteResponse>(
    `/announcements/${announcementId}`,
  );
  return data;
}