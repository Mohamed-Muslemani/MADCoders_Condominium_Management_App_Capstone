export interface ExpenseCategory {
  categoryId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  _count: {
    transactions: number;
  };
}

export interface CreateExpenseCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateExpenseCategoryRequest {
  name?: string;
  description?: string;
}
