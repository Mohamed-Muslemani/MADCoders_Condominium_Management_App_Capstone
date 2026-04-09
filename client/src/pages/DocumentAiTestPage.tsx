import { useEffect, useState } from 'react';
import {
  askDocuments,
  createDocument,
  generateDocumentEmbeddings,
  getDocuments,
  uploadDocumentVersion,
} from '../api/documents';
import { getMe } from '../api/auth';
import { useAuth } from '../context/auth-provider';
import type {
  AskDocumentsResponse,
  CreateDocumentRequest,
  DocumentSummary,
} from '../types/document';
import type { User } from '../types/user';

const documentTypes = [
  'CONDO_DOC',
  'RULES_GENERAL',
  'RULES_BOARD',
  'MEETING_MINUTES',
] as const;

const visibilityOptions = ['PUBLIC', 'OWNERS_ONLY', 'BOARD_ONLY'] as const;

const initialCreateForm: CreateDocumentRequest = {
  title: '',
  docType: 'CONDO_DOC',
  visibility: 'OWNERS_ONLY',
  isMandatory: false,
  description: '',
};

export function DocumentAiTestPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);

  const [createMessage, setCreateMessage] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [embeddingsMessage, setEmbeddingsMessage] = useState('');
  const [askError, setAskError] = useState('');
  const [adminError, setAdminError] = useState('');

  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionIdForEmbeddings, setVersionIdForEmbeddings] = useState('');

  const [question, setQuestion] = useState('');
  const [askResult, setAskResult] = useState<AskDocumentsResponse | null>(null);

  useEffect(() => {
    void refreshDocuments();
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      setCurrentUser(await getMe());
    } catch {
      setCurrentUser(null);
    }
  }

  async function refreshDocuments() {
    if (!token) {
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);
    setDocumentsError('');

    try {
      const result = await getDocuments();
      setDocuments(result);

      if (!selectedDocumentId && result[0]) {
        setSelectedDocumentId(result[0].documentId);
      }
    } catch (error) {
      setDocumentsError(getErrorMessage(error));
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handleCreateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLoading(true);
    setCreateMessage('');
    setAdminError('');

    try {
      const created = await createDocument(createForm);
      setCreateMessage(`Created "${created.title}" (${created.documentId})`);
      setCreateForm(initialCreateForm);
      setSelectedDocumentId(created.documentId);
      await refreshDocuments();
    } catch (error) {
      setAdminError(getErrorMessage(error));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUploadVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDocumentId) {
      setAdminError('Select a document before uploading a version.');
      return;
    }

    if (!selectedFile) {
      setAdminError('Choose a PDF file to upload.');
      return;
    }

    setUploadLoading(true);
    setUploadMessage('');
    setAdminError('');

    try {
      const version = await uploadDocumentVersion(
        selectedDocumentId,
        selectedFile,
      );
      const versionId =
        typeof version === 'object' &&
        version !== null &&
        'versionId' in version &&
        typeof version.versionId === 'string'
          ? version.versionId
          : '';

      if (versionId) {
        setVersionIdForEmbeddings(versionId);
      }

      setUploadMessage(
        versionId
          ? `Uploaded version ${versionId}`
          : 'Uploaded document version successfully.',
      );
      setSelectedFile(null);
      await refreshDocuments();
    } catch (error) {
      setAdminError(getErrorMessage(error));
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleGenerateEmbeddings() {
    if (!versionIdForEmbeddings.trim()) {
      setAdminError('Enter a document version ID first.');
      return;
    }

    setEmbeddingsLoading(true);
    setEmbeddingsMessage('');
    setAdminError('');

    try {
      await generateDocumentEmbeddings(versionIdForEmbeddings.trim());
      setEmbeddingsMessage(
        `Embeddings request completed for version ${versionIdForEmbeddings.trim()}.`,
      );
      await refreshDocuments();
    } catch (error) {
      setAdminError(getErrorMessage(error));
    } finally {
      setEmbeddingsLoading(false);
    }
  }

  async function handleAsk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setAskError('Enter a question first.');
      return;
    }

    setAskLoading(true);
    setAskError('');
    setAskResult(null);

    try {
      const response = await askDocuments({ query: question.trim() });
      setAskResult(response);
    } catch (error) {
      setAskError(getErrorMessage(error));
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <section className="stack">
      <header className="app-header">
        <div>
          <h1>AI Document Test</h1>
          <p>
            Signed in as {currentUser?.email ?? 'Unknown user'} (
            {currentUser?.role ?? 'unknown'})
          </p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => void refreshDocuments()}>
            Refresh documents
          </button>
        </div>
      </header>

      {currentUser?.role !== 'ADMIN' ? (
        <section className="panel">
          <h2>Access note</h2>
          <p className="error-message">
            Your current user is not an admin. The document admin endpoints are
            protected and will likely return 403 until you sign in with an
            admin account.
          </p>
        </section>
      ) : null}

      <section className="panel">
        <h2>Admin document tools</h2>
        <div className="panel-grid">
          <form className="stack" onSubmit={handleCreateDocument}>
            <h3>Create document</h3>
            <label>
              Title
              <input
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Document type
              <select
                value={createForm.docType}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    docType: event.target.value as (typeof documentTypes)[number],
                  }))
                }
              >
                {documentTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visibility
              <select
                value={createForm.visibility}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    visibility: event.target.value as (typeof visibilityOptions)[number],
                  }))
                }
              >
                {visibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={createForm.isMandatory}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    isMandatory: event.target.checked,
                  }))
                }
              />
              Mandatory document
            </label>
            <label>
              Description
              <textarea
                rows={4}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create document'}
            </button>
            {createMessage ? <p className="success-message">{createMessage}</p> : null}
          </form>

          <form className="stack" onSubmit={handleUploadVersion}>
            <h3>Upload PDF version</h3>
            <label>
              Existing document
              <select
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
              >
                <option value="">Select a document</option>
                {documents.map((document) => (
                  <option key={document.documentId} value={document.documentId}>
                    {document.title} ({document.documentId})
                  </option>
                ))}
              </select>
            </label>
            <label>
              PDF file
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <button type="submit" disabled={uploadLoading}>
              {uploadLoading ? 'Uploading...' : 'Upload version'}
            </button>
            {uploadMessage ? <p className="success-message">{uploadMessage}</p> : null}
          </form>

          <div className="stack">
            <h3>Generate embeddings</h3>
            <label>
              Version ID
              <input
                value={versionIdForEmbeddings}
                onChange={(event) => setVersionIdForEmbeddings(event.target.value)}
                placeholder="Paste a version ID"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleGenerateEmbeddings()}
              disabled={embeddingsLoading}
            >
              {embeddingsLoading ? 'Generating...' : 'Generate embeddings'}
            </button>
            {embeddingsMessage ? (
              <p className="success-message">{embeddingsMessage}</p>
            ) : null}
          </div>
        </div>

        {adminError ? <p className="error-message">{adminError}</p> : null}

        <div className="response-panel">
          <h3>Document and version status</h3>
          {documentsLoading ? <p>Loading documents...</p> : null}
          {documentsError ? <p className="error-message">{documentsError}</p> : null}
          {!documentsLoading && !documents.length ? (
            <p>No documents found yet.</p>
          ) : null}

          {documents.map((document) => (
            <article className="document-card" key={document.documentId}>
              <h4>{document.title}</h4>
              <p>
                {document.docType} | {document.visibility} | mandatory:{' '}
                {document.isMandatory ? 'yes' : 'no'}
              </p>
              <p className="muted-text">Document ID: {document.documentId}</p>
              {document.description ? <p>{document.description}</p> : null}
              {document.versions.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Version ID</th>
                      <th>Status</th>
                      <th>File</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.versions.map((version) => (
                      <tr key={version.versionId}>
                        <td>
                          v{version.versionNumber}
                          {version.isCurrent ? ' (current)' : ''}
                        </td>
                        <td>{version.versionId}</td>
                        <td>{version.indexStatus}</td>
                        <td>{version.file.originalName}</td>
                        <td>{version.indexError ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No versions uploaded yet.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Ask documents</h2>
        <form className="stack" onSubmit={handleAsk}>
          <label>
            Question
            <textarea
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What do the condo bylaws say about pets?"
            />
          </label>
          <button type="submit" disabled={askLoading}>
            {askLoading ? 'Asking...' : 'Ask documents'}
          </button>
        </form>

        {askError ? (
          <p className="error-message">
            {askError}
            {askError.toLowerCase().includes('quota') ||
            askError.toLowerCase().includes('billing') ||
            askError.toLowerCase().includes('openai')
              ? ' Check OPENAI_API_KEY, billing, and model access on the backend.'
              : ''}
          </p>
        ) : null}

        {askResult ? (
          <div className="response-panel">
            <h3>Answer</h3>
            <p>{askResult.answer}</p>
            <h3>Citations</h3>
            {askResult.citations.length ? (
              <ul className="citation-list">
                {askResult.citations.map((citation, index) => (
                  <li key={`${citation.documentTitle}-${citation.pageStart}-${index}`}>
                    {citation.documentTitle} | pages{' '}
                    {formatPageRange(citation.pageStart, citation.pageEnd)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No citations returned.</p>
            )}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function formatPageRange(
  pageStart?: number | null,
  pageEnd?: number | null,
) {
  if (pageStart === null && pageEnd === null) {
    return 'unknown';
  }

  if (pageStart !== null && pageEnd !== null) {
    return pageStart === pageEnd ? String(pageStart) : `${pageStart}-${pageEnd}`;
  }

  return String(pageStart ?? pageEnd);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}
