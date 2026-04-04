
import type { UnitSummary } from './unit';
import type { User } from './user';

export type MaintenanceScope = 'UNIT' | 'BUILDING';
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MaintenanceRequest {
  requestId: string;
  scope: MaintenanceScope;
  unitId?: string | null;
  submittedByUserId: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  submittedBy: Omit<User, 'phone' | 'createdAt'>;
  unit?: UnitSummary | null;
}

export interface MaintenanceRequestListParams {
  scope?: MaintenanceScope;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  unitId?: string;
  submittedByUserId?: string;
  skip?: number;
  take?: number;
}

export interface CreateMaintenanceRequestRequest {
  scope?: MaintenanceScope;
  unitId?: string;
  title: string;
  description: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}

export interface UpdateMaintenanceRequestRequest {
  scope?: MaintenanceScope;
  unitId?: string | null;
  title?: string;
  description?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}
