import type { UnitDue, UnitDueStatus } from './unit-due';
import type { UnitSummary } from './unit';
import type { User } from './user';
import type { StoredFileSummary } from './document';

export type ImportLineStatus = 'PENDING' | 'APPLIED' | 'FAILED';

export interface DuesImportLineDue
  extends Pick<
    UnitDue,
    'dueId' | 'periodMonth' | 'amount' | 'status' | 'dueDate' | 'paidDate' | 'note' | 'updatedAt'
  > {}

export interface DuesImportLine {
  importLineId: string;
  rowNumber: number;
  sourceUnitId?: string | null;
  unitId?: string | null;
  periodMonth?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  amount?: string | number | null;
  status?: UnitDueStatus | null;
  note?: string | null;
  rowStatus: ImportLineStatus;
  errorReason?: string | null;
  unit?: UnitSummary | null;
  dues: DuesImportLineDue[];
}

export interface DuesImportBatchListItem {
  importBatchId: string;
  periodMonth: string;
  totalRows: number;
  importedAt: string;
  file: StoredFileSummary;
  importedBy: Omit<User, 'phone' | 'createdAt'>;
  lines: Array<{
    rowStatus: ImportLineStatus;
  }>;
}

export interface DuesImportBatch extends DuesImportBatchListItem {
  lines: DuesImportLine[];
}
