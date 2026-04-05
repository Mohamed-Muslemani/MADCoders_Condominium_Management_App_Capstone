import { api } from './client';
import type { DeleteResponse } from '../types/api';
import type {
  CreateExpenseCategoryRequest,
  ExpenseCategory,
  UpdateExpenseCategoryRequest,
} from '../types/expense-category';

export async function getExpenseCategories() {
  const { data } = await api.get<ExpenseCategory[]>('/expense-categories');
  return data;
}

export async function getExpenseCategory(categoryId: string) {
  const { data } = await api.get<ExpenseCategory>(
    `/expense-categories/${categoryId}`,
  );
  return data;
}

export async function createExpenseCategory(
  payload: CreateExpenseCategoryRequest,
) {
  const { data } = await api.post<ExpenseCategory>(
    '/expense-categories',
    payload,
  );
  return data;
}

export async function updateExpenseCategory(
  categoryId: string,
  payload: UpdateExpenseCategoryRequest,
) {
  const { data } = await api.patch<ExpenseCategory>(
    `/expense-categories/${categoryId}`,
    payload,
  );
  return data;
}

export async function deleteExpenseCategory(categoryId: string) {
  const { data } = await api.delete<DeleteResponse>(
    `/expense-categories/${categoryId}`,
  );
  return data;
}
