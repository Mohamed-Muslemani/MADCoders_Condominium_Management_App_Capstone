import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './MaintenanceRequestsPage.css';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  uploadMaintenanceRequestAttachment,
  downloadMaintenanceRequestAttachment,
} from '../../api/maintenanceRequests';
import { getUnits } from '../../api/units';
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
  CreateMaintenanceRequestRequest,
  UpdateMaintenanceRequestRequest,
} from '../../types/maintenance-request';
import type { Unit } from '../../types/unit';

/* ── helpers ── */
function reqCode(id: string) {
  return `REQ-${id.slice(0, 6).toUpperCase()}`;
}

function StatusPill({ status }: { status: MaintenanceStatus }) {
  const map: Record<MaintenanceStatus, { cls: string; label: string }> = {
    OPEN:        { cls: 'pill-open',     label: 'OPEN' },
    IN_PROGRESS: { cls: 'pill-progress', label: 'IN PROGRESS' },
    COMPLETED:   { cls: 'pill-done',     label: 'COMPLETED' },
    CLOSED:      { cls: 'pill-closed',   label: 'CLOSED' },
  };
  const { cls, label } = map[status] ?? map.OPEN;
  return <span className={`pill ${cls}`}><span className="s-dot" />{label}</span>;
}

function PriorityPill({ priority }: { priority: MaintenancePriority }) {
  const map: Record<MaintenancePriority, { cls: string; label: string }> = {
    HIGH:   { cls: 'pill-high',   label: 'HIGH' },
    MEDIUM: { cls: 'pill-medium', label: 'MEDIUM' },
    LOW:    { cls: 'pill-low',    label: 'LOW' },
  };
  const { cls, label } = map[priority] ?? map.MEDIUM;
  return <span className={`pill ${cls}`}><span className="s-dot" />{label}</span>;
}

function formatFileSize(sizeBytes: number | string) {
  const size = typeof sizeBytes === 'string' ? Number(sizeBytes) : sizeBytes;

  if (!Number.isFinite(size) || size <= 0) {
    return 'Unknown size';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Drawer ── */
function MaintDrawer({
  mode, request, units, saving, toast,
  activeAttachmentId, uploadPending, uploadError,
  onClose, onSave, onDelete, onUploadAttachment, onFileAction,
}: {
  mode: 'create' | 'edit';
  request: MaintenanceRequest | null;
  units: Unit[];
  saving: boolean;
  toast: string;
  activeAttachmentId: string | null;
  uploadPending: boolean;
  uploadError: string;
  onClose: () => void;
  onSave: (d: CreateMaintenanceRequestRequest | UpdateMaintenanceRequestRequest) => void;
  onDelete: () => void;
  onUploadAttachment: (file: File) => void;
  onFileAction: (fileId: string, action: 'open' | 'download') => void;
}) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [scope,       setScope]       = useState<'UNIT' | 'BUILDING'>('BUILDING');
  const [unitId,      setUnitId]      = useState('');
  const [status,      setStatus]      = useState<MaintenanceStatus>('OPEN');
  const [priority,    setPriority]    = useState<MaintenancePriority>('MEDIUM');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [attachment,  setAttachment]  = useState<File | null>(null);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && request) {
      setTitle(request.title);
      setDescription(request.description);
      setScope(request.scope);
      setUnitId(request.unitId ?? '');
      setStatus(request.status);
      setPriority(request.priority);
    } else {
      setTitle(''); setDescription('');
      setScope('BUILDING'); setUnitId('');
      setStatus('OPEN'); setPriority('MEDIUM');
    }
    setErrors({});
    setAttachment(null);
  }, [mode, request?.requestId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim())       errs.title       = 'Title is required.';
    if (!description.trim()) errs.description = 'Description is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      scope,
      status,
      priority,
      ...(scope === 'UNIT' && unitId ? { unitId } : {}),
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="maint-drawer">

        {/* Head */}
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? request?.title : 'New Maintenance Request'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? `${reqCode(request?.requestId ?? '')} • ${request?.unit ? `Unit ${request.unit.unitNumber}` : 'Building'} • ${request?.createdAt.slice(0, 10)}`
                : 'Create a request and save'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          <div className="form-card">
            <div className="mb-[10px]">
              <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                {isEdit ? 'Edit Request' : 'New Request'}
              </h3>
              <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                Title and description are required.
              </p>
            </div>

            {/* Title + Unit */}
            <div className="grid2">
              <div>
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Hallway light out"
                />
                {errors.title && <div className="field-err">{errors.title}</div>}
              </div>
              <div>
                <label className="form-label">Scope</label>
                <select className="form-select" value={scope} onChange={e => setScope(e.target.value as 'UNIT' | 'BUILDING')}>
                  <option value="BUILDING">Building</option>
                  <option value="UNIT">Unit</option>
                </select>
              </div>
            </div>

            {/* Unit select — only if scope is UNIT */}
            {scope === 'UNIT' && (
              <div className="mt-[10px]">
                <label className="form-label">Unit</label>
                <select className="form-select" value={unitId} onChange={e => setUnitId(e.target.value)}>
                  <option value="">Select unit…</option>
                  {units.map(u => (
                    <option key={u.unitId} value={u.unitId}>{u.unitNumber}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status + Priority */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as MaintenanceStatus)}>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div>
                <label className="form-label">Priority</label>
                <select className="form-select" value={priority} onChange={e => setPriority(e.target.value as MaintenancePriority)}>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="mt-[10px]">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail…"
              />
              {errors.description && <div className="field-err">{errors.description}</div>}
            </div>

            {isEdit && request ? (
              <div className="mt-[12px] rounded-[16px] border border-[#e5eaf3] bg-[#fbfcff] p-[12px]">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">
                      Attachments
                    </h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                      Upload photos or PDFs and open them directly from this request.
                    </p>
                  </div>
                  <span className="pill">
                    <span className="s-dot" style={{ background: '#64748b' }} />
                    {request.attachments?.length ?? 0} file{(request.attachments?.length ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>

                {request.attachments?.length ? (
                  <div className="maint-attachment-list">
                    {request.attachments.map((file) => (
                      <div key={file.fileId} className="maint-attachment-card">
                        <div className="maint-attachment-meta">
                          <strong>{file.originalName}</strong>
                          <span>
                            {formatFileSize(file.sizeBytes)}
                            {file.uploadedAt ? ` • ${file.uploadedAt.slice(0, 10)}` : ''}
                          </span>
                        </div>
                        <div className="maint-attachment-actions">
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={() => onFileAction(file.fileId, 'open')}
                            disabled={activeAttachmentId === file.fileId}
                          >
                            {activeAttachmentId === file.fileId ? 'Opening…' : 'Open'}
                          </button>
                          <button
                            className="btn-soft"
                            type="button"
                            onClick={() => onFileAction(file.fileId, 'download')}
                            disabled={activeAttachmentId === file.fileId}
                          >
                            {activeAttachmentId === file.fileId ? 'Preparing…' : 'Download'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="maint-attachment-empty">
                    No attachments yet.
                  </div>
                )}

                <div className="maint-attachment-upload">
                  <input
                    className="maint-file-input"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    onChange={(event) =>
                      setAttachment(event.target.files?.[0] ?? null)
                    }
                  />
                  <div className="maint-attachment-upload-row">
                    <span className="maint-attachment-help">
                      {attachment ? `Selected: ${attachment.name}` : 'Choose one photo or PDF to upload.'}
                    </span>
                    <button
                      className="btn-solid"
                      type="button"
                      onClick={() => attachment && onUploadAttachment(attachment)}
                      disabled={!attachment || uploadPending}
                    >
                      {uploadPending ? 'Uploading…' : 'Upload File'}
                    </button>
                  </div>
                  {uploadError ? (
                    <div className="field-err">{uploadError}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Danger Zone */}
            {isEdit && (
              <div className="danger-wrap">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                      Permanently delete this request.
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                    Admin
                  </span>
                </div>
                <div className="danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete Request</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Permanently removes this request. Cannot be undone.
                    </small>
                  </div>
                  <button className="danger-btn danger-btn-delete" onClick={onDelete}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foot */}
        <div className="drawer-foot">
          <div className="drawer-foot-left" />
          <div className="drawer-foot-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-solid" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Request'}
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
export function MaintenanceRequestsPage() {
  const location = useLocation();

  const [requests,  setRequests]  = useState<MaintenanceRequest[]>([]);
  const [units,     setUnits]     = useState<Unit[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState('');

  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [priorityF, setPriorityF] = useState('');
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSz]    = useState(25);

  const [drawer, setDrawer] = useState(false);
  const [mode,   setMode]   = useState<'create' | 'edit'>('create');
  const [active, setActive] = useState<MaintenanceRequest | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [r, u] = await Promise.all([getMaintenanceRequests(), getUnits()]);
      setRequests(r);
      setUnits(u);
    } catch { setError('Could not load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  useEffect(() => {
    function handleCreateEvent() {
      openCreate();
    }

    window.addEventListener('admin-maintenance-create', handleCreateEvent);

    return () => {
      window.removeEventListener('admin-maintenance-create', handleCreateEvent);
    };
  }, []);

  const filtered = requests
    .filter(r => {
      const s = search.toLowerCase();
      return (
        (!s ||
          r.title.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          (r.unit?.unitNumber ?? '').toLowerCase().includes(s) ||
          reqCode(r.requestId).toLowerCase().includes(s))
        && (!statusF   || r.status === statusF)
        && (!priorityF || r.priority === priorityF)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx   = (page - 1) * pageSize;
  const pageItems  = filtered.slice(startIdx, startIdx + pageSize);

  function openCreate() {
    setMode('create');
    setActive(null);
    setUploadError('');
    setDrawer(true);
  }
  function openEdit(r: MaintenanceRequest) {
    setMode('edit');
    setActive(r);
    setUploadError('');
    setDrawer(true);
  }
  function closeDrawer() {
    setDrawer(false);
    setActive(null);
    setUploadError('');
  }

  async function handleSave(
    payload: CreateMaintenanceRequestRequest | UpdateMaintenanceRequestRequest
  ) {
    try {
      setSaving(true);
      if (mode === 'create') {
        await createMaintenanceRequest(payload as CreateMaintenanceRequestRequest);
        showToast('Request created successfully.');
      } else if (active) {
        await updateMaintenanceRequest(active.requestId, payload as UpdateMaintenanceRequestRequest);
        showToast('Changes saved.');
      }
      closeDrawer();
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleUploadAttachment(file: File) {
    if (!active) return;

    try {
      setUploadPending(true);
      setUploadError('');
      await uploadMaintenanceRequestAttachment(active.requestId, file);
      const refreshed = await getMaintenanceRequests();
      setRequests(refreshed);
      const updated = refreshed.find(
        (request) => request.requestId === active.requestId,
      );
      if (updated) {
        setActive(updated);
      }
      showToast('Attachment uploaded.');
    } catch {
      setUploadError('Could not upload the attachment.');
    } finally {
      setUploadPending(false);
    }
  }

  async function handleAttachmentAction(
    fileId: string,
    action: 'open' | 'download',
  ) {
    try {
      setActiveAttachmentId(fileId);
      const { blob, filename, mimeType } =
        await downloadMaintenanceRequestAttachment(fileId);
      const blobUrl = URL.createObjectURL(
        blob.type ? blob : new Blob([blob], { type: mimeType || 'application/octet-stream' }),
      );

      if (action === 'open') {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast('Could not open the attachment.');
    } finally {
      setActiveAttachmentId(null);
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm('Delete this request? Cannot be undone.')) return;
    try {
      await deleteMaintenanceRequest(active.requestId);
      closeDrawer();
      await fetchAll();
      showToast('Request deleted.');
    } catch { showToast('Could not delete.'); }
  }

  function exportCSV() {
    const header = ['requestId','title','scope','unit','status','priority','submittedBy','createdAt'].join(',');
    const rows = filtered.map(r =>
      [r.requestId, `"${r.title}"`, r.scope,
       `"${r.unit?.unitNumber ?? ''}"`, r.status, r.priority,
       `"${r.submittedBy.firstName} ${r.submittedBy.lastName}"`,
       r.createdAt.slice(0,10)].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header,...rows].join('\n')],{type:'text/csv'}));
    a.download = 'maintenance_requests.csv'; a.click();
  }

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="rounded-[18px] border border-[#e5eaf3] p-[14px]"
        style={{ background: 'linear-gradient(180deg,#ffffff,#fbfcff)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
              Maintenance
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Search + filter requests. Click a row to view/edit. You can close or delete a request.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} requests`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={openCreate}>+ New Request</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="maint-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, unit, code…"
          />
        </div>
        <select className="toolbar-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select className="toolbar-select" value={priorityF} onChange={e => { setPriorityF(e.target.value); setPage(1); }}>
          <option value="">All Priority</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select className="toolbar-select" value={pageSize} onChange={e => { setPageSz(Number(e.target.value)); setPage(1); }}>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button className="btn-ghost" onClick={() => { setSearch(''); setStatusF(''); setPriorityF(''); setPage(1); }}>
          Clear
        </button>
      </div>

      {/* ── List ── */}
      <div className="list-wrap">
        <div className="list-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">Loading…</div>
          ) : pageItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">No requests found.</div>
          ) : pageItems.map(r => (
            <button key={r.requestId} className="row-card" onClick={() => openEdit(r)}>

              {/* Title + sub */}
              <div>
                <div className="row-title">{r.title}</div>
              <div className="row-sub">
                {r.submittedBy.firstName} {r.submittedBy.lastName} •{' '}
                {r.unit ? `Unit ${r.unit.unitNumber}` : 'Building'} •{' '}
                {r.createdAt.slice(0, 10)}
              </div>
              {r.attachments?.length ? (
                <div className="row-inline-tags">
                  <span className="pill">
                    <span className="s-dot" style={{ background: '#64748b' }} />
                    {r.attachments.length} attachment{r.attachments.length === 1 ? '' : 's'}
                  </span>
                </div>
              ) : null}
            </div>

              {/* Status */}
              <div className="row-meta">
                <StatusPill status={r.status} />
              </div>

              {/* Priority */}
              <div className="row-meta">
                <PriorityPill priority={r.priority} />
                <span className="pill">
                  <span className="s-dot" style={{ background: '#64748b' }} />
                  {r.scope === 'UNIT' ? `Unit` : 'Building'}
                </span>
              </div>

              {/* Right — ID */}
              <div className="row-right">
                <span className="id-tag">{reqCode(r.requestId)}</span>
              </div>

            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="table-foot">
          <div className="page-info">
            {filtered.length > 0
              ? `Showing ${startIdx + 1}–${Math.min(filtered.length, startIdx + pageSize)} of ${filtered.length}`
              : 'Showing 0–0 of 0'}
          </div>
          <div className="pager">
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <MaintDrawer
          mode={mode}
          request={active}
          units={units}
          saving={saving}
          toast={toast}
          activeAttachmentId={activeAttachmentId}
          uploadPending={uploadPending}
          uploadError={uploadError}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onUploadAttachment={handleUploadAttachment}
          onFileAction={handleAttachmentAction}
        />
      )}
    </>
  );
}
