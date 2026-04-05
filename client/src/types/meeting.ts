import type { MeetingMinuteDocumentSummary } from './document';

export interface Meeting {
  meetingId: string;
  meetingDate: string;
  title: string;
  notes?: string | null;
  createdAt: string;
}

export interface MeetingMinutesEntry {
  meetingMinutesId: string;
  createdAt: string;
  document: MeetingMinuteDocumentSummary;
}

export interface MeetingDetails extends Meeting {
  minutes: MeetingMinutesEntry[];
}

export interface CreateMeetingRequest {
  meetingDate: string;
  title: string;
  notes?: string;
}

export interface UpdateMeetingRequest {
  meetingDate?: string;
  title?: string;
  notes?: string;
}
