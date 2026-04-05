import { api, createMultipartFormData } from './client';
import type { DeleteResponse } from '../types/api';
import type {
  CreateMeetingRequest,
  Meeting,
  MeetingDetails,
  MeetingMinutesEntry,
  UpdateMeetingRequest,
} from '../types/meeting';

export async function getMeetings() {
  const { data } = await api.get<Meeting[]>('/meetings');
  return data;
}

export async function getMeeting(meetingId: string) {
  const { data } = await api.get<MeetingDetails>(`/meetings/${meetingId}`);
  return data;
}

export async function getMeetingMinutes(meetingId: string) {
  const { data } = await api.get<MeetingMinutesEntry[]>(
    `/meetings/${meetingId}/minutes`,
  );
  return data;
}

export async function createMeeting(payload: CreateMeetingRequest) {
  const { data } = await api.post<Meeting>('/meetings', payload);
  return data;
}

export async function updateMeeting(
  meetingId: string,
  payload: UpdateMeetingRequest,
) {
  const { data } = await api.patch<Meeting>(`/meetings/${meetingId}`, payload);
  return data;
}

export async function deleteMeeting(meetingId: string) {
  const { data } = await api.delete<DeleteResponse>(`/meetings/${meetingId}`);
  return data;
}

export async function uploadMeetingMinutes(meetingId: string, file: File) {
  const { data } = await api.post<MeetingMinutesEntry[]>(
    `/meetings/${meetingId}/minutes`,
    createMultipartFormData('file', file),
  );
  return data;
}
