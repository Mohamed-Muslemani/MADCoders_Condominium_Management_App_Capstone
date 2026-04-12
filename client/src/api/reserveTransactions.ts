import { api } from './client';
import { buildQueryParams } from './utils';
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import type { DeleteResponse } from '../types/api';
import type {
  CreateReserveTransactionRequest,
  ReserveTransaction,
  ReserveTransactionListParams,
  UpdateReserveTransactionRequest,
} from '../types/reserve-transaction';

export async function getReserveTransactions(
  params: ReserveTransactionListParams = {},
) {
  const { data } = await api.get<ReserveTransaction[]>(
    '/reserve-transactions',
    {
      params: buildQueryParams(params),
    },
  );
  return data;
}

export async function getReserveTransaction(transactionId: string) {
  const { data } = await api.get<ReserveTransaction>(
    `/reserve-transactions/${transactionId}`,
  );
  return data;
}

export async function getReserveExpenses() {
  const { data } = await api.get<ReserveTransaction[]>(
    '/reserve-transactions/expenses',
  );
  return data;
}

export async function getReserveProjections() {
  const { data } = await api.get<ReserveTransaction[]>(
    '/reserve-transactions/projections',
  );
  return data;
}

export async function getReserveTransactionsByCategory(categoryId: string) {
  const { data } = await api.get<ReserveTransaction[]>(
    `/reserve-transactions/category/${categoryId}`,
  );
  return data;
}

export async function getReserveTransactionsByDateRange(
  dateFrom: string,
  dateTo: string,
) {
  const { data } = await api.get<ReserveTransaction[]>(
    '/reserve-transactions/date-range',
    {
      params: buildQueryParams({ dateFrom, dateTo }),
    },
  );
  return data;
}

export async function createReserveTransaction(
  payload: CreateReserveTransactionRequest,
) {
  const { data } = await api.post<ReserveTransaction>(
    '/reserve-transactions',
    payload,
  );
  return data;
}

export async function updateReserveTransaction(
  transactionId: string,
  payload: UpdateReserveTransactionRequest,
) {
  const { data } = await api.patch<ReserveTransaction>(
    `/reserve-transactions/${transactionId}`,
    payload,
  );
  return data;
}

export async function deleteReserveTransaction(transactionId: string) {
  const { data } = await api.delete<DeleteResponse>(
    `/reserve-transactions/${transactionId}`,
  );
  return data;
}

export async function deleteReserveTransactionReceipt(transactionId: string) {
  const { data } = await api.delete<ReserveTransaction>(
    `/reserve-transactions/${transactionId}/receipt`,
  );
  return data;
}

export async function uploadReserveTransactionReceipt(
  transactionId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<ReserveTransaction>(
    `/reserve-transactions/${transactionId}/receipt`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

function parseFilename(
  headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>,
) {
  const contentDisposition = headers['content-disposition'];

  if (!contentDisposition) {
    return 'receipt';
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return decodeURIComponent(plainMatch[1]);
  }

  return 'receipt';
}

export async function downloadReserveTransactionReceipt(transactionId: string) {
  const response = await api.get<Blob>(
    `/reserve-transactions/${transactionId}/receipt/download`,
    {
      responseType: 'blob',
    },
  );

  return {
    blob: response.data,
    filename: parseFilename(response.headers),
    mimeType: response.headers['content-type'] || response.data.type,
  };
}
