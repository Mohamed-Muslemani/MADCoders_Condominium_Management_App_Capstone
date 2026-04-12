import { api, createMultipartFormData } from './client';
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import type { DeleteResponse } from '../types/api';
import type {
  AskDocumentsResponse,
  CreateDocumentRequest,
  DocumentSearchResult,
  DocumentSummary,
  DocumentVersion,
  SearchDocumentsRequest,
  UpdateDocumentRequest,
} from '../types/document';

export async function getDocuments() {
  const { data } = await api.get<DocumentSummary[]>('/documents');
  return data;
}

export async function getDocument(documentId: string) {
  const { data } = await api.get<DocumentSummary>(`/documents/${documentId}`);
  return data;
}

export async function createDocument(payload: CreateDocumentRequest) {
  const { data } = await api.post<DocumentSummary>('/documents', payload);
  return data;
}

export async function updateDocument(
  documentId: string,
  payload: UpdateDocumentRequest,
) {
  const { data } = await api.patch<DocumentSummary>(
    `/documents/${documentId}`,
    payload,
  );
  return data;
}

export async function deleteDocument(documentId: string) {
  const { data } = await api.delete<DeleteResponse>(`/documents/${documentId}`);
  return data;
}

export async function getDocumentVersion(versionId: string) {
  const { data } = await api.get<DocumentVersion>(
    `/documents/versions/${versionId}`,
  );
  return data;
}

export async function uploadDocumentVersion(documentId: string, file: File) {
  const { data } = await api.post<DocumentVersion>(
    `/documents/${documentId}/versions`,
    createMultipartFormData('file', file),
  );
  return data;
}

export async function reprocessDocumentVersion(versionId: string) {
  const { data } = await api.post<DocumentVersion>(
    `/documents/versions/${versionId}/reprocess`,
  );
  return data;
}

export async function generateDocumentEmbeddings(versionId: string) {
  const { data } = await api.post<DocumentVersion>(
    `/documents/versions/${versionId}/embeddings`,
  );
  return data;
}

export async function searchDocuments(payload: SearchDocumentsRequest) {
  const { data } = await api.post<DocumentSearchResult[]>(
    '/documents/search',
    payload,
  );
  return data;
}

export async function askDocuments(payload: SearchDocumentsRequest) {
  const { data } = await api.post<AskDocumentsResponse>(
    '/documents/ask',
    payload,
  );
  return data;
}

function parseFilename(
  headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>,
) {
  const contentDisposition = headers['content-disposition'];

  if (!contentDisposition) {
    return 'document.pdf';
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return decodeURIComponent(plainMatch[1]);
  }

  return 'document.pdf';
}

export async function downloadDocumentVersion(versionId: string) {
  const response = await api.get<Blob>(`/documents/versions/${versionId}/download`, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    filename: parseFilename(response.headers),
    mimeType: response.headers['content-type'] || response.data.type,
  };
}
