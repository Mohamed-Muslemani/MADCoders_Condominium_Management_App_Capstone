import type { ReactNode } from 'react';
import type { Announcement } from './announcement';
import type { DocumentSummary } from './document';
import type { MaintenanceRequest, MaintenanceRequestListParams } from './maintenance-request';
import type { UnitDue, UnitDueStatus } from './unit-due';
import type { User } from './user';

export const ownerRoutePaths = {
  dashboard: '/owner',
  dues: '/owner/dues',
  maintenance: '/owner/maintenance',
  documents: '/owner/documents',
  profile: '/owner/profile',
} as const;

export type OwnerRouteKey = keyof typeof ownerRoutePaths;

export interface OwnerNavBadgeMap {
  dashboard?: string;
  dues?: string;
  maintenance?: string;
  documents?: string;
  profile?: string;
}

export interface OwnerLayoutUser
  extends Pick<User, 'userId' | 'firstName' | 'lastName' | 'email' | 'role'> {}

export interface OwnerStatusBadge {
  label: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}

export interface OwnerHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'primary';
}

export interface OwnerLayoutProps {
  activeRoute: OwnerRouteKey;
  title: string;
  subtitle: ReactNode;
  user?: OwnerLayoutUser | null;
  unitLabel?: string;
  navBadges?: OwnerNavBadgeMap;
  statusBadge?: OwnerStatusBadge;
  topbarActions?: OwnerHeaderAction[];
  headerActions?: OwnerHeaderAction[];
  showPageHeader?: boolean;
  contentClassName?: string;
  children: ReactNode;
}

export interface OwnerCardProps {
  title: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
}

export interface OwnerPageHeaderProps {
  title: string;
  subtitle: ReactNode;
  badge?: OwnerStatusBadge;
  actions?: ReactNode;
}

export interface OwnerStatCardProps {
  label: string;
  value: ReactNode;
}

export interface OwnerEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export interface OwnerTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export interface OwnerTableProps<T> {
  columns: OwnerTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
}

export interface OwnerViewStateProps {
  title: string;
  description: string;
  tone?: 'error' | 'loading' | 'empty';
  action?: ReactNode;
}

export interface OwnerPageServicePlan {
  profile: User;
  announcements: Announcement[];
  maintenance: MaintenanceRequest[];
  dues: UnitDue[];
  documents?: DocumentSummary[];
}

export interface OwnerDuesQuery {
  unitId: string;
  statuses?: UnitDueStatus[];
}

export type OwnerMaintenanceQuery = MaintenanceRequestListParams;

export interface OwnerDomainMismatch {
  area: 'payments' | 'maintenance' | 'documents' | 'dashboard';
  label: string;
  actualBackendModel: string;
  impact: string;
}

export interface OwnerDashboardUnit {
  unitId: string;
  unitNumber: string;
  unitType?: string | null;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: string | number | null;
  squareFeet?: number | null;
  parkingSpots?: number | null;
  monthlyFee: string | number;
  status: string;
  notes?: string | null;
}

export interface OwnerDashboardActiveOwnership {
  unitOwnerId: string;
  startDate: string;
  endDate?: string | null;
  unit: OwnerDashboardUnit;
}

export interface OwnerDuesSummary {
  currentBalance: number;
  currentStatus: 'PAID' | 'UNPAID';
  monthlyFee: number | null;
  nextDueDate?: string | null;
  unpaidCount: number;
}

export interface OwnerDocumentsSummary {
  availableCount: number;
}

export interface OwnerDashboardResponse {
  profile: User;
  activeOwnership?: OwnerDashboardActiveOwnership | null;
  dues: UnitDue[];
  duesSummary: OwnerDuesSummary;
  documentsSummary: OwnerDocumentsSummary;
  announcements: Announcement[];
  maintenance: MaintenanceRequest[];
}
