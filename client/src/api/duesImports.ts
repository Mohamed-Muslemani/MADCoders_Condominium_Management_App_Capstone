import { api, createMultipartFormData } from './client';
import type { DuesImportBatch, DuesImportBatchListItem } from '../types/dues-import';

export async function getDuesImportBatches() {
  const { data } = await api.get<DuesImportBatchListItem[]>('/dues-imports');
  return data;
}

export async function getDuesImportBatch(batchId: string) {
  const { data } = await api.get<DuesImportBatch>(`/dues-imports/${batchId}`);
  return data;
}

export async function importUnitDuesCsv(file: File) {
  const { data } = await api.post<DuesImportBatch>(
    '/dues-imports',
    createMultipartFormData('file', file),
  );
  return data;
}
