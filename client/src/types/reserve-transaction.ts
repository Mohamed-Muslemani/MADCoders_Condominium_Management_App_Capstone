import type { User } from './user';

export type ReserveTransactionType = 'EXPENSE' | 'PROJECTION';
export type ReserveTransactionStatus = 'POSTED' | 'PLANNED' | 'CANCELLED';

export interface ExpenseCategory {
  categoryId: string;
  name: string;
  description?: string | null;
}

export interface ReserveTransaction {
  transactionId: string;
  categoryId?: string | null;
  createdByUserId: string;
  type: ReserveTransactionType;
  status: ReserveTransactionStatus;
  title: string;
  description?: string | null;
  amount: string | number;
  transactionDate?: string | null;
  expectedDate?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  category?: ExpenseCategory | null;
  createdBy: Omit<User, 'phone' | 'createdAt'>;
}

export interface ReserveTransactionListParams {
  categoryId?: string;
  type?: ReserveTransactionType;
  status?: ReserveTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateReserveTransactionRequest {
  categoryId?: string;
  type: ReserveTransactionType;
  status: ReserveTransactionStatus;
  title: string;
  description?: string;
  amount: number;
  transactionDate?: string;
  expectedDate?: string;
}

export interface UpdateReserveTransactionRequest {
  categoryId?: string | null;
  type?: ReserveTransactionType;
  status?: ReserveTransactionStatus;
  title?: string;
  description?: string;
  amount?: number;
  transactionDate?: string | null;
  expectedDate?: string | null;
}