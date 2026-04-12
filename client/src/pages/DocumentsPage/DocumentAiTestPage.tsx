import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './DocumentsPage.css';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentVersion,
  downloadDocumentVersion,
  generateDocumentEmbeddings,
  askDocuments,
} from '../../api/documents';
import type {
  DocumentSummary,
  DocumentType,
  DocumentVisibility,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from '../../types/document';

/* ── helpers ── */
const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  CONDO_DOC:       'Condo Documents',
  RULES_GENERAL:   'Rules & Regulations',
  RULES_BOARD:     'Board Rules',
  MEETING_MINUTES: 'Meeting Minutes',
};

const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  PUBLIC:      'Public',
  OWNERS_ONLY: 'Owners Only',
  BOARD_ONLY:  'Board Only',
};

function IndexPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: 'pill-pending', label: 'Indexing: Pending' },
    INDEXED: { cls: 'pill-indexed', label: 'Indexing: Indexed' },
    FAILED:  { cls: 'pill-failed',  label: 'Indexing: Failed' },
  };
  const { cls, label } = map[status] ?? map.PENDING;
  return <span className={`pill ${cls}`}><span className="s-dot" />{label}</span>;
}

function groupByDocType(docs: DocumentSummary[]) {
  const map = new Map<string, DocumentSummary[]>();
  for (const d of docs) {
    const key = DOC_TYPE_LABELS[d.docType] ?? d.docType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, items]) => ({ category, items }));
}

function currentVersionStatus(d: DocumentSummary) {
  const v = d.versions.find(v => v.isCurrent) ?? d.versions[d.versions.length - 1];
  return v?.indexStatus ?? 'PENDING';
}

/* ── Drawer ── */
function DocDrawer({
  mode, doc, saving, toast,
  onClose, onSave, onDelete, onGenerateEmbeddings,
}: {
  mode: 'create' | 'edit';
  doc: DocumentSummary | null;
  saving: boolean;
  toast: string;
  onClose: () => void;
  onSave: (p: CreateDocumentRequest | UpdateDocumentRequest, file?: File) => void;
  onDelete: () => void;
  onGenerateEmbeddings: (versionId: string) => void;
}) {
  const [title,       setTitle]       = useState('');
  const [docType,     setDocType]     = useState<DocumentType>('CONDO_DOC');
  const [visibility,  setVisibility]  = useState<DocumentVisibility>('OWNERS_ONLY');
  const [isMandatory, setIsMandatory] = useState(false);
  const [description, setDescription] = useState('');
  const [file,        setFile]        = useState<File | null>(null);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && doc) {
      setTitle(doc.title);
      setDocType(doc.docType);
      setVisibility(doc.visibility);
      setIsMandatory(doc.isMandatory);
      setDescription(doc.description ?? '');
      setFile(null);
    } else {
      setTitle(''); setDocType('CONDO_DOC');
      setVisibility('OWNERS_ONLY'); setIsMandatory(false);
      setDescription(''); setFile(null);
    }
    setErrors({});
  }, [mode, doc?.documentId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (!isEdit && !file) errs.file = 'File is required.';
    if (file) {
      const allowed = ['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];
      if (file.size > 10 * 1024 * 1024) errs.file = 'File too large. Max 10MB.';
      else if (file.type && !allowed.includes(file.type)) errs.file = 'Use PDF/DOC/DOCX/TXT.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const payload = {
      title: title.trim(),
      docType,
      visibility,
      isMandatory,
      ...(description.trim() && { description: description.trim() }),
    };
    onSave(payload, file ?? undefined);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
      />
      <div className="docs-drawer">

        {/* Head */}
        <div className="drawer-head">
          <div>
            <h2>{isEdit ? 'Edit Document' : 'Upload Document'}</h2>
            <div className="sub">
              {isEdit
                ? `${DOC_TYPE_LABELS[doc?.docType ?? 'CONDO_DOC']} • ${doc?.createdAt.slice(0, 10)}`
                : 'Pick a type, set visibility, then upload a file.'}
            </div>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          <div className="form-card">

            {/* Title + DocType */}
            <div className="grid2">
              <div>
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Annual Budget 2026"
                />
                {errors.title && <div className="field-err">{errors.title}</div>}
              </div>
              <div>
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value as DocumentType)}>
                  {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visibility + Mandatory */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Visibility</label>
                <select className="form-select" value={visibility} onChange={e => setVisibility(e.target.value as DocumentVisibility)}>
                  {Object.entries(VISIBILITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="check-row w-full">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={e => setIsMandatory(e.target.checked)}
                  />
                  Mandatory (owners must read)
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="mt-[10px]">
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description…"
              />
            </div>

            {/* File */}
            <div className="mt-[10px]">
              <label className="form-label">
                {isEdit ? 'Upload New Version (PDF/DOC/DOCX/TXT)' : 'File *'}
              </label>
              <input
                className="form-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {errors.file && <div className="field-err">{errors.file}</div>}
            </div>
          </div>

          {/* Versions — edit only */}
          {isEdit && doc && doc.versions.length > 0 && (
            <div className="versions-wrap">
              <div className="versions-head">Versions ({doc.versions.length})</div>
              {doc.versions.map(v => (
                <div key={v.versionId} className={`version-row ${v.isCurrent ? 'current' : ''}`}>
                  <div>
                    <div className="version-name">
                      v{v.versionNumber} {v.isCurrent ? '(current)' : ''}
                    </div>
                    <div className="version-meta">
                      {v.file.originalName} • {Math.round(Number(v.file.sizeBytes) / 1024)} KB • {v.uploadedAt?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndexPill status={v.indexStatus} />
                    {v.indexStatus !== 'INDEXED' && (
                      <button
                        className="btn-soft"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => onGenerateEmbeddings(v.versionId)}
                      >
                        Index
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Danger Zone — edit only */}
          {isEdit && (
            <div className="danger-wrap">
              <div className="mb-[10px] flex items-start justify-between gap-3">
                <div>
                  <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                  <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                    Permanently delete this document and all versions.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                  Admin
                </span>
              </div>
              <div className="danger-row">
                <div>
                  <strong className="block text-[13px] text-[#0f172a]">Delete Document</strong>
                  <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                    Removes all versions and index data. Cannot be undone.
                  </small>
                </div>
                <button className="danger-btn danger-btn-delete" onClick={onDelete}>Delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Foot */}
        <div className="drawer-foot">
          <div className="drawer-foot-left" />
          <div className="drawer-foot-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-solid" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function DocumentsPage() {
  const location = useLocation();

  const [documents,   setDocuments]   = useState<DocumentSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState('');

  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');

  const [drawer,  setDrawer]  = useState(false);
  const [mode,    setMode]    = useState<'create' | 'edit'>('create');
  const [active,  setActive]  = useState<DocumentSummary | null>(null);
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);

  /* Ask AI */
  const [askOpen,    setAskOpen]    = useState(false);
  const [question,   setQuestion]   = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askResult,  setAskResult]  = useState<{
    answer: string;
    citations: { documentTitle: string; pageStart?: number | null; pageEnd?: number | null }[];
  } | null>(null);
  const [askError, setAskError] = useState('');

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      setDocuments(await getDocuments());
    } catch { setError('Could not load documents'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  const filtered = documents.filter(d => {
    const s = search.toLowerCase();
    return (
      (!s || d.title.toLowerCase().includes(s) || (d.description ?? '').toLowerCase().includes(s))
      && (!typeFilter || d.docType === typeFilter)
    );
  });

  const grouped = groupByDocType(filtered);

  function openCreate() { setMode('create'); setActive(null); setDrawer(true); }
  function openEdit(d: DocumentSummary) { setMode('edit'); setActive(d); setDrawer(true); }
  function closeDrawer() { setDrawer(false); setActive(null); }

  async function handleSave(
    payload: CreateDocumentRequest | UpdateDocumentRequest,
    file?: File
  ) {
    try {
      setSaving(true);
      if (mode === 'create') {
        const created = await createDocument(payload as CreateDocumentRequest);
        if (file) await uploadDocumentVersion(created.documentId, file);
        showToast('Document uploaded. Indexing started.');
      } else if (active) {
        await updateDocument(active.documentId, payload as UpdateDocumentRequest);
        if (file) {
          await uploadDocumentVersion(active.documentId, file);
          showToast('New version uploaded.');
        } else {
          showToast('Changes saved.');
        }
      }
      closeDrawer();
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm(`Delete "${active.title}"? Cannot be undone.`)) return;
    try {
      await deleteDocument(active.documentId);
      closeDrawer();
      await fetchAll();
      showToast('Document deleted.');
    } catch { showToast('Could not delete.'); }
  }

  async function handleGenerateEmbeddings(versionId: string) {
    try {
      await generateDocumentEmbeddings(versionId);
      await fetchAll();
      showToast('Indexing started.');
    } catch { showToast('Could not generate embeddings.'); }
  }

  async function handleAsk() {
    if (!question.trim()) return;
    try {
      setAskLoading(true); setAskError(''); setAskResult(null);
      const result = await askDocuments({ query: question.trim() });
      setAskResult(result);
    } catch { setAskError('Could not get answer. Make sure documents are indexed.'); }
    finally { setAskLoading(false); }
  }

  async function handleFileAction(
    versionId: string,
    mode: 'open' | 'download',
  ) {
    try {
      setDownloadingVersionId(versionId);
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
    } catch {
      showToast('Could not open document.');
    } finally {
      setDownloadingVersionId(null);
    }
  }

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="rounded-[18px] border border-[#e5eaf3] p-4"
        style={{ background: 'linear-gradient(180deg,#ffffff,#fbfcff)' }}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
              Documents
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Upload documents grouped by type. After upload, indexing starts automatically.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} documents`}
            </span>
            <button className="btn-soft" onClick={() => { setAskOpen(o => !o); setAskResult(null); setAskError(''); }}>
              {askOpen ? 'Close AI' : '🤖 Ask AI'}
            </button>
            <button className="btn-solid" onClick={openCreate}>+ Upload</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Ask AI ── */}
      {askOpen && (
        <div className="ask-panel">
          <div className="ask-head">
            <h3>🤖 Ask Documents</h3>
            <p>Ask a question — searches all indexed documents at once.</p>
          </div>
          <div className="ask-row">
            <textarea
              className="ask-textarea"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g., What do the by-laws say about pets?"
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            />
            <button className="btn-solid" onClick={handleAsk} disabled={askLoading || !question.trim()}>
              {askLoading ? 'Asking…' : 'Ask'}
            </button>
          </div>
          {askError && (
            <div className="mt-[10px] rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
              {askError}
            </div>
          )}
          {askResult && (
            <div className="ask-result">
              <div className="ask-answer">{askResult.answer}</div>
              {askResult.citations.length > 0 && (
                <div className="ask-citations">
                  <div className="ask-citation-label">Sources</div>
                  {askResult.citations.map((c, i) => (
                    <div key={i} className="ask-citation">
                      📄 {c.documentTitle}
                      {c.pageStart != null
                        ? ` • p.${c.pageStart}${c.pageEnd && c.pageEnd !== c.pageStart ? `–${c.pageEnd}` : ''}`
                        : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="docs-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
          />
        </div>
        <select className="toolbar-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Categories</option>
          {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className="btn-ghost" onClick={() => { setSearch(''); setTypeFilter(''); }}>Clear</button>
      </div>

      {/* ── Grouped list ── */}
      {loading ? (
        <div className="mt-3 flex items-center justify-center py-12 text-[13px] text-[#64748b]">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="mt-3 flex items-center justify-center py-12 font-black text-[#64748b]" style={{ padding: '12px', fontSize: '13px' }}>
          No documents found.
        </div>
      ) : (
        <div className="docs-groups">
          {grouped.map(g => (
            <section key={g.category} className="docs-group">
              <div className="group-head">
                <strong>{g.category}</strong>
                <span className="group-count">{g.items.length}</span>
              </div>
              <div className="group-body">
                {g.items.map(d => (
                  <div key={d.documentId} className="doc-row">
                    <div className="doc-left">
                      <div className="doc-title">{d.title}</div>
                      <div className="doc-meta">
                        <IndexPill status={currentVersionStatus(d)} />
                        {d.isMandatory && (
                          <span className="pill pill-mandatory">
                            <span className="s-dot" />Mandatory
                          </span>
                        )}
                        <span className="pill">
                          <span className="s-dot" style={{ background: '#64748b' }} />
                          {VISIBILITY_LABELS[d.visibility]}
                        </span>
                        <span className="pill">
                          <span className="s-dot" style={{ background: '#64748b' }} />
                          {d.versions.length} version{d.versions.length !== 1 ? 's' : ''}
                        </span>
                        <span className="pill">
                          <span className="s-dot" style={{ background: '#64748b' }} />
                          Updated: {(d.updatedAt ?? d.createdAt).slice(0, 10)}
                        </span>
                      </div>
                    </div>
                    <div className="doc-actions">
                      {(d.versions.find(v => v.isCurrent) ?? d.versions[0]) ? (
                        <>
                          <button
                            className="icon-btn text-[12px]"
                            title="Open"
                            onClick={() =>
                              void handleFileAction(
                                (d.versions.find(v => v.isCurrent) ?? d.versions[0]).versionId,
                                'open',
                              )
                            }
                          >
                            {downloadingVersionId === (d.versions.find(v => v.isCurrent) ?? d.versions[0]).versionId ? '…' : 'Open'}
                          </button>
                          <button
                            className="icon-btn text-[12px]"
                            title="Download"
                            onClick={() =>
                              void handleFileAction(
                                (d.versions.find(v => v.isCurrent) ?? d.versions[0]).versionId,
                                'download',
                              )
                            }
                          >
                            ↓
                          </button>
                        </>
                      ) : null}
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(d)}>✎</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Drawer ── */}
      {drawer && (
        <DocDrawer
          mode={mode}
          doc={active}
          saving={saving}
          toast={toast}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onGenerateEmbeddings={handleGenerateEmbeddings}
        />
      )}
    </>
  );
}
