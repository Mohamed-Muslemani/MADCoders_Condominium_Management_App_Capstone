
import type { UnitSummary } from './unit';
import type { User } from './user';

export interface UnitOwner {
  unitOwnerId: string;
  unitId: string;
  userId: string;
  startDate: string;
  endDate?: string | null;
  unit: UnitSummary;
  user: Omit<User, 'createdAt'>;
}

export interface CreateUnitOwnerRequest {
  unitId: string;
  userId: string;
  startDate: string;
  endDate?: string | null;
}

export interface UpdateUnitOwnerRequest {
  unitId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string | null;
}
