const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type AuthUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

export type DocumentVersionSummary = {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  indexStatus: string;
  indexedAt: string | null;
  indexError: string | null;
  uploadedAt: string;
  file: {
    fileId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string | number;
  };
};

export type DocumentSummary = {
  documentId: string;
  title: string;
  docType: string;
  visibility: string;
  isMandatory: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  versions: DocumentVersionSummary[];
};

export type AskDocumentsResponse = {
  answer: string;
  citations: Array<{
    documentTitle: string;
    pageStart: number | null;
    pageEnd: number | null;
  }>;
};

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type CreateDocumentInput = {
  title: string;
  docType: string;
  visibility: string;
  isMandatory: boolean;
  description: string;
};

function buildHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers);

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  return headers;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    body: options.body,
  });

  const rawText = await response.text();
  const data = rawText ? tryParseJson(rawText) : null;

  if (!response.ok) {
    throw new Error(extractApiError(data, rawText, response.status));
  }

  return data as T;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractApiError(data: unknown, rawText: string, status: number) {
  if (typeof data === 'object' && data !== null) {
    const message = (data as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string') {
      return error;
    }
  }

  if (rawText.trim()) {
    return rawText;
  }

  return `Request failed with status ${status}`;
}

export async function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser(token: string) {
  return apiRequest<AuthUser>('/auth/me', {
    token,
  });
}

export async function listDocuments(token: string) {
  return apiRequest<DocumentSummary[]>('/documents', {
    token,
  });
}

export async function createDocument(token: string, input: CreateDocumentInput) {
  return apiRequest<DocumentSummary>('/documents', {
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      description: input.description.trim() || undefined,
    }),
  });
}

export async function uploadDocumentVersion(
  token: string,
  documentId: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest(`/documents/${documentId}/versions`, {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function generateEmbeddings(token: string, versionId: string) {
  return apiRequest(`/documents/versions/${versionId}/embeddings`, {
    method: 'POST',
    token,
  });
}

export async function askDocuments(token: string, query: string) {
  return apiRequest<AskDocumentsResponse>('/documents/ask', {
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
}
