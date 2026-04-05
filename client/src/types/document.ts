import type { User } from './user';

export type DocumentType =
  | 'CONDO_DOC'
  | 'RULES_GENERAL'
  | 'RULES_BOARD'
  | 'MEETING_MINUTES';

export type DocumentVisibility = 'PUBLIC' | 'OWNERS_ONLY' | 'BOARD_ONLY';

export type DocumentIndexStatus = 'PENDING' | 'INDEXED' | 'FAILED';

export type FileRelatedType =
  | 'RESERVE_TRANSACTION'
  | 'MAINTENANCE_REQUEST'
  | 'UNIT_DUE'
  | 'DUES_IMPORT_BATCH'
  | 'DOCUMENT'
  | 'DOCUMENT_VERSION'
  | 'MEETING'
  | 'MEETING_MINUTES';

export interface FileLink {
  fileLinkId: string;
  relatedType: FileRelatedType;
  relatedId: string;
  createdAt: string;
}

export interface StoredFileSummary {
  fileId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string | number;
  uploadedAt?: string;
  storagePath?: string;
  sha256Hash?: string | null;
  links?: FileLink[];
}

export interface DocumentChunkEmbedding {
  embeddingId: string;
  modelName: string;
  createdAt: string;
}

export interface DocumentChunk {
  chunkId: string;
  chunkIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  text: string;
  createdAt: string;
  embedding?: DocumentChunkEmbedding | null;
}

export interface DocumentVersionSummary {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  indexStatus: DocumentIndexStatus;
  indexedAt?: string | null;
  indexError?: string | null;
  uploadedAt: string;
  file: StoredFileSummary;
}

export interface DocumentVersion extends DocumentVersionSummary {
  documentId: string;
  uploadedByUserId: string;
  chunks: DocumentChunk[];
}

export interface DocumentSummary {
  documentId: string;
  title: string;
  docType: DocumentType;
  visibility: DocumentVisibility;
  isMandatory: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  versions: DocumentVersionSummary[];
}

export interface DocumentSearchResult {
  chunkId: string;
  chunkIndex: number;
  text: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  versionId: string;
  versionNumber: number;
  documentId: string;
  documentTitle: string;
  similarityScore: number;
}

export interface AskDocumentsCitation {
  documentTitle: string;
  pageStart?: number | null;
  pageEnd?: number | null;
}

export interface AskDocumentsResponse {
  answer: string;
  citations: AskDocumentsCitation[];
}

export interface CreateDocumentRequest {
  title: string;
  docType: DocumentType;
  visibility: DocumentVisibility;
  isMandatory?: boolean;
  description?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  docType?: DocumentType;
  visibility?: DocumentVisibility;
  isMandatory?: boolean;
  description?: string;
}

export interface SearchDocumentsRequest {
  query: string;
}

export interface MeetingMinuteDocumentSummary {
  documentId: string;
  title: string;
  docType: DocumentType;
  visibility: DocumentVisibility;
  description?: string | null;
  versions: DocumentVersionSummary[];
}

export interface UploadedBySummary extends Omit<User, 'phone' | 'createdAt'> {}
