import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './AnnouncementsPage.css';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../api/announcements';
import type {
  Announcement,
  AnnouncementStatus,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '../../types/announcement';

/* ── helpers ── */
function monthShort(iso: string) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleString(undefined, { month: 'short' });
  } catch { return '—'; }
}
function dayNum(iso: string) {
  try {
    return String(new Date(iso + 'T00:00:00').getDate()).padStart(2, '0');
  } catch { return '—'; }
}

function StatusTag({ status }: { status: AnnouncementStatus }) {
  const map: Record<AnnouncementStatus, { cls: string; label: string }> = {
    PUBLISHED: { cls: 'tag-published', label: 'Published' },
    DRAFT:     { cls: 'tag-draft',     label: 'Draft' },
    ARCHIVED:  { cls: 'tag-archived',  label: 'Archived' },
  };
  const { cls, label } = map[status] ?? map.DRAFT;
  return <span className={`tag ${cls}`}><span className="t-dot" />{label}</span>;
}

/* ── Drawer ── */
function AnnouncementDrawer({
  mode, announcement, saving, toast,
  onClose, onSave, onDelete,
}: {
  mode: 'create' | 'edit';
  announcement: Announcement | null;
  saving: boolean;
  toast: string;
  onClose: () => void;
  onSave: (d: CreateAnnouncementRequest | UpdateAnnouncementRequest) => void;
  onDelete: () => void;
}) {
  const [title,       setTitle]       = useState('');
  const [content,     setContent]     = useState('');
  const [status,      setStatus]      = useState<AnnouncementStatus>('DRAFT');
  const [pinned,      setPinned]      = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setStatus(announcement.status);
      setPinned(announcement.pinned);
      setPublishedAt(announcement.publishedAt?.slice(0, 10) ?? '');
    } else {
      setTitle(''); setContent('');
      setStatus('DRAFT'); setPinned(false);
      setPublishedAt(new Date().toISOString().slice(0, 10));
    }
    setErrors({});
  }, [mode, announcement?.announcementId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim())   errs.title   = 'Title is required.';
    if (!content.trim()) errs.content = 'Message is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      title: title.trim(),
      content: content.trim(),
      status,
      pinned,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }

  const dateLabel = isEdit && announcement
    ? `${announcement.status} • ${announcement.createdAt.slice(0, 10)}`
    : 'Create a new announcement';

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
      />
      <div className="ann-drawer">

        {/* Head */}
        <div className="drawer-head">
          <div>
            <h2>{isEdit ? announcement?.title : 'New Announcement'}</h2>
            <div className="sub">{dateLabel}</div>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          <div className="form-card">

            {/* Title */}
            <div>
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Water shutdown on Friday"
              />
              {errors.title && <div className="field-err">{errors.title}</div>}
            </div>

            {/* Status + Published At */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as AnnouncementStatus)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="form-label">Publish Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={publishedAt}
                  onChange={e => setPublishedAt(e.target.value)}
                />
              </div>
            </div>

            {/* Pinned */}
            <div className="mt-[10px] flex items-center gap-3">
              <input
                type="checkbox"
                id="ann-pinned"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
              <label htmlFor="ann-pinned" className="cursor-pointer text-[13px] font-black text-[#0f172a]">
                📌 Pin this announcement
              </label>
            </div>

            {/* Content */}
            <div className="mt-[10px]">
              <label className="form-label">Message *</label>
              <textarea
                className="form-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write the announcement…"
              />
              {errors.content && <div className="field-err">{errors.content}</div>}
            </div>

            {/* Danger Zone */}
            {isEdit && (
              <div className="danger-wrap">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                      Permanently delete this announcement.
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                    Admin
                  </span>
                </div>
                <div className="danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete Announcement</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Permanently removes this announcement. Cannot be undone.
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
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
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
export function AnnouncementsPage() {
  const location = useLocation();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [toast,         setToast]         = useState('');

  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [page,    setPage]    = useState(1);
  const pageSize = 15;

  const [drawer, setDrawer] = useState(false);
  const [mode,   setMode]   = useState<'create' | 'edit'>('create');
  const [active, setActive] = useState<Announcement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      setAnnouncements(await getAnnouncements());
    } catch { setError('Could not load announcements'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  const filtered = announcements
    .filter(a => {
      const s = search.toLowerCase();
      return (
        (!s || a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s))
        && (!statusF || a.status === statusF)
      );
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx   = (page - 1) * pageSize;
  const pageItems  = filtered.slice(startIdx, startIdx + pageSize);

  function openCreate() { setMode('create'); setActive(null); setDrawer(true); }
  function openEdit(a: Announcement) { setMode('edit'); setActive(a); setDrawer(true); }
  function closeDrawer() { setDrawer(false); setActive(null); }

  async function handleSave(
    payload: CreateAnnouncementRequest | UpdateAnnouncementRequest
  ) {
    try {
      setSaving(true);
      if (mode === 'create') {
        await createAnnouncement(payload as CreateAnnouncementRequest);
        showToast('Announcement created.');
      } else if (active) {
        await updateAnnouncement(active.announcementId, payload as UpdateAnnouncementRequest);
        showToast('Changes saved.');
      }
      closeDrawer();
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm('Delete this announcement? Cannot be undone.')) return;
    try {
      await deleteAnnouncement(active.announcementId);
      closeDrawer();
      await fetchAll();
      showToast('Announcement deleted.');
    } catch { showToast('Could not delete.'); }
  }

  const dateStr = (a: Announcement) =>
    (a.publishedAt ?? a.createdAt ?? '').slice(0, 10);

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
              Announcements
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Clean list view. Click any announcement to edit in the side panel.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} announcements`}
            </span>
            <button className="btn-solid" onClick={openCreate}>+ New Announcement</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="ann-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, message…"
          />
        </div>
        <select className="toolbar-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div />
        <button className="btn-ghost" onClick={() => { setSearch(''); setStatusF(''); setPage(1); }}>Clear</button>
      </div>

      {/* ── List header ── */}
      <div className="ann-list-header">
        <h3>All Announcements</h3>
        <span className="shown-chip">
          <span className="s-dot" />
          {pageItems.length} shown
        </span>
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">No announcements found.</div>
      ) : (
        <div className="ann-feed">
          {pageItems.map(a => (
            <button key={a.announcementId} className="ann-row" onClick={() => openEdit(a)}>

              {/* Date pill */}
              <div className="date-pill">
                <div className="dp-month">{monthShort(dateStr(a))}</div>
                <div className="dp-day">{dayNum(dateStr(a))}</div>
              </div>

              {/* Main */}
              <div className="ann-main">
                <h4 className="ann-title">{a.title}</h4>
                <div className="ann-meta">
                  {dateStr(a)}
                  {a.createdBy ? ` • ${a.createdBy.firstName} ${a.createdBy.lastName}` : ''}
                </div>
                <div className="ann-body">{a.content}</div>
                <div className="ann-pill-row">
                  <StatusTag status={a.status} />
                  {a.pinned && (
                    <span className="tag tag-pinned">📌 Pinned</span>
                  )}
                </div>
              </div>

              {/* Building badge placeholder — shows first letter of status */}
              <div className="building-badge">
                <span className="b-dot" />
                {a.status.slice(0, 1)}
              </div>

            </button>
          ))}
        </div>
      )}

      {/* ── Pager ── */}
      <div className="ann-pager">
        <div className="page-info">Page {page} / {totalPages}</div>
        <div className="pager">
          <button className="btn-ghost" style={{ padding: '8px 10px', borderRadius: '12px' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
          <button className="btn-ghost" style={{ padding: '8px 10px', borderRadius: '12px' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <AnnouncementDrawer
          mode={mode}
          announcement={active}
          saving={saving}
          toast={toast}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}