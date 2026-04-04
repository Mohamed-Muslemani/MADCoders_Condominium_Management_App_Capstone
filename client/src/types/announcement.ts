import type { User } from './user';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Announcement {
  announcementId: string;
  title: string;
  content: string;
  pinned: boolean;
  status: AnnouncementStatus;
  publishedAt?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: Omit<User, 'phone' | 'createdAt'> | null;
}

export interface AnnouncementListParams {
  status?: AnnouncementStatus;
  activeOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  pinned?: boolean;
  status: AnnouncementStatus;
  publishedAt?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  pinned?: boolean;
  status?: AnnouncementStatus;
  publishedAt?: string | null;
}