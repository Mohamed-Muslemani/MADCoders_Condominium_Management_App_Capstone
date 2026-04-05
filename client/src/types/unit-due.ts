
import type { UnitSummary } from './unit';

export type UnitDueStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface UnitDue {
  dueId: string;
  unitId: string;
  periodMonth: string;
  dueDate: string;
  paidDate?: string | null;
  amount: string | number;
  status: UnitDueStatus;
  note?: string | null;
  emailNotifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  unit: UnitSummary;
}

export interface CreateUnitDueRequest {
  unitId: string;
  periodMonth: string;
  dueDate: string;
  amount: number;
  status?: UnitDueStatus;
  note?: string;
  notes?: string;
  emailNotifiedAt?: string;
  paidDate?: string;
}

export interface UpdateUnitDueRequest {
  unitId?: string;
  periodMonth?: string;
  dueDate?: string;
  amount?: number;
  status?: UnitDueStatus;
  note?: string;
  notes?: string;
  emailNotifiedAt?: string | null;
  paidDate?: string | null;
}

export interface ReminderRecipient {
  userId: string;
  email: string;
  name: string;
}

export interface SendUnitDueReminderResponse {
  message: string;
  recipients: ReminderRecipient[];
  due: UnitDue;
}
