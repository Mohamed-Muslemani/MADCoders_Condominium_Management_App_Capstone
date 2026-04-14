import { useEffect, useMemo, useState } from 'react';
import {
  askOwnerDocuments,
  getSelectedOwnerUnitId,
  getOwnerDashboard,
  getOwnerDocuments,
  setSelectedOwnerUnitId,
} from '../../api/owner';
import { downloadDocumentVersion } from '../../api/documents';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerCard,
  OwnerEmptyState,
  OwnerStatusPill,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import type { DocumentSummary } from '../../types/document';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import './OwnerDocumentsPage.css';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDocType(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function OwnerDocumentsPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState('');
  const [askResult, setAskResult] = useState<{
    answer: string;
    citations: Array<{
      documentTitle: string;
      pageStart?: number | null;
      pageEnd?: number | null;
    }>;
  } | null>(null);
  const [selectedUnitId, setSelectedUnitIdState] = useState(() => getSelectedOwnerUnitId());

  async function loadPage(unitId = selectedUnitId) {
    try {
      setLoading(true);
      setError('');

      const [dashboardData, documentsData] = await Promise.all([
        getOwnerDashboard(unitId || undefined),
        getOwnerDocuments(),
      ]);

      setDashboard(dashboardData);
      const resolvedUnitId = dashboardData.activeOwnership?.unit.unitId ?? '';
      setSelectedOwnerUnitId(resolvedUnitId);
      setSelectedUnitIdState(resolvedUnitId);
      setDocuments(documentsData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load your documents page.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  async function handleFileAction(
    versionId: string,
    mode: 'open' | 'download',
  ) {
    try {
      setActiveVersionId(versionId);
      const { blob, filename, mimeType } = await downloadDocumentVersion(versionId);
      const objectUrl = URL.createObjectURL(blob);

      if (mode === 'open' && mimeType.includes('pdf')) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not access this document.',
      );
    } finally {
      setActiveVersionId(null);
    }
  }

  async function handleAsk() {
    if (!question.trim()) {
      return;
    }

    try {
      setAskLoading(true);
      setAskError('');
      setAskResult(null);

      const result = await askOwnerDocuments({ query: question.trim() });
      setAskResult(result);
    } catch (requestError) {
      setAskError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not search your indexed documents right now.',
      );
    } finally {
      setAskLoading(false);
    }
  }

  const user = dashboard?.profile ?? null;
  const activeUnit = dashboard?.activeOwnership?.unit ?? null;

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : 'Up to date',
      transactions: 'View all',
      maintenance: dashboard?.maintenance.length
        ? `${dashboard.maintenance.length} total`
        : '0 total',
      documents: `${documents.length} docs`,
      profile: 'Account',
    }),
    [dashboard, documents.length],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading documents"
            description="We’re gathering the owner documents available to your account."
          />
        </div>
      </main>
    );
  }

  if (error || !dashboard || !user) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load documents"
            description={error || 'Your documents could not be loaded.'}
            action={<OwnerActionButton onClick={() => void loadPage()}>Try again</OwnerActionButton>}
          />
        </div>
      </main>
    );
  }

  return (
    <OwnerLayout
      activeRoute="documents"
      title="Documents"
      subtitle="Review the documents made available to owners."
      user={user}
      unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
      navBadges={navBadges}
      topbarActions={[
        {
          label: 'Refresh',
          onClick: () => void loadPage(),
        },
      ]}
      showPageHeader={false}
      contentClassName="p-0"
    >
      <div className="owner-documents-page">
        <section className="owner-documents-hero">
          <div>
            <h2>Documents</h2>
            <p>Your document library with files shared for owner access.</p>
          </div>

          <OwnerStatusPill
            label={`${documents.length} available`}
            tone="good"
          />
        </section>

        {error ? (
          <div className="owner-documents-error">
            {error}
          </div>
        ) : null}

        <div className="owner-documents-content">
          <OwnerCard
            title="Ask AI"
            badge="Indexed owner docs"
            action={
              <OwnerStatusPill
                label="Owner-safe search"
                tone="good"
              />
            }
          >
            <div className="owner-documents-ai-copy">
              Ask a question about the indexed documents available to your owner account.
            </div>

            <div className="owner-documents-ai-row">
              <textarea
                className="owner-documents-ai-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What do the condo documents say about pets, parking, or move-ins?"
                rows={3}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleAsk();
                  }
                }}
              />

              <OwnerActionButton
                variant="primary"
                onClick={() => void handleAsk()}
              >
                {askLoading ? 'Searching...' : 'Ask AI'}
              </OwnerActionButton>
            </div>

            {askError ? (
              <div className="owner-documents-ai-error">{askError}</div>
            ) : null}

            {askResult ? (
              <div className="owner-documents-ai-result">
                <div className="owner-documents-ai-answer">{askResult.answer}</div>

                {askResult.citations.length > 0 ? (
                  <div className="owner-documents-ai-citations">
                    <div className="owner-documents-ai-citation-label">Sources</div>
                    {askResult.citations.map((citation, index) => (
                      <div
                        key={`${citation.documentTitle}-${citation.pageStart ?? 'na'}-${index}`}
                        className="owner-documents-ai-citation"
                      >
                        {citation.documentTitle}
                        {citation.pageStart != null
                          ? ` • p.${citation.pageStart}${citation.pageEnd && citation.pageEnd !== citation.pageStart ? `-${citation.pageEnd}` : ''}`
                          : ''}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </OwnerCard>

          <OwnerCard title="Owner Library">
            {documents.length === 0 ? (
              <OwnerEmptyState
                title="No documents available"
                description="Owner-visible documents will appear here once admins publish them with a public or owners-only visibility."
              />
            ) : (
              <>
                <div className="owner-documents-list">
                  {documents.map((document) => {
                    const currentVersion = document.versions.find((version) => version.isCurrent) ?? document.versions[0];

                    return (
                      <article
                        key={document.documentId}
                        className="owner-documents-item"
                      >
                        <div className="min-w-0">
                          <div className="owner-documents-item-title">{document.title}</div>
                          <div className="owner-documents-item-copy">
                            {document.description?.trim() ||
                              'No description has been added for this document yet.'}
                          </div>
                          <div className="owner-documents-meta">
                            <span className="owner-shell-nav-pill">
                              {formatDocType(document.docType)}
                            </span>
                            <span className="owner-shell-nav-pill">
                              {document.visibility === 'OWNERS_ONLY' ? 'Owners only' : 'Public'}
                            </span>
                            {document.isMandatory ? (
                              <span className="owner-shell-nav-pill">Mandatory</span>
                            ) : null}
                            <span className="owner-shell-nav-pill">
                              Updated {formatDate(document.updatedAt ?? document.createdAt)}
                            </span>
                            {currentVersion?.file?.originalName ? (
                              <span className="owner-shell-nav-pill">
                                {currentVersion.file.originalName}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="owner-documents-actions">
                          <OwnerStatusPill
                            label={currentVersion ? 'Ready' : 'No file yet'}
                            tone={currentVersion ? 'good' : 'warn'}
                          />
                          {currentVersion ? (
                            <div className="owner-documents-action-row">
                              <OwnerActionButton
                                onClick={() => void handleFileAction(currentVersion.versionId, 'open')}
                              >
                                {activeVersionId === currentVersion.versionId ? 'Opening...' : 'Open'}
                              </OwnerActionButton>
                              <OwnerActionButton
                                variant="primary"
                                onClick={() => void handleFileAction(currentVersion.versionId, 'download')}
                              >
                                {activeVersionId === currentVersion.versionId ? 'Preparing...' : 'Download'}
                              </OwnerActionButton>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </OwnerCard>
        </div>
      </div>
    </OwnerLayout>
  );
}
