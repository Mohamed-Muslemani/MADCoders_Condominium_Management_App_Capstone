import { useCallback, useEffect, useMemo, useState } from 'react';
import './MeetingsPage.css';
import {
  createMeeting,
  deleteMeeting,
  getMeeting,
  getMeetings,
  updateMeeting,
  uploadMeetingMinutes,
} from '../../api/meetings';
import { downloadDocumentVersion } from '../../api/documents';
import type {
  CreateMeetingRequest,
  Meeting,
  MeetingDetails,
  UpdateMeetingRequest,
} from '../../types/meeting';

function formatMeetingDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value.slice(0, 10);
  }
}

function formatMonthKey(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return value.slice(0, 7);
  }
}

function MinutesPill({ count }: { count: number }) {
  return (
    <span className="meetings-pill">
      <span className="m-dot" />
      {count} minute{count === 1 ? '' : 's'}
    </span>
  );
}

function MeetingDrawer({
  mode,
  meeting,
  saving,
  deleting,
  loadingDetails,
  filePending,
  fileError,
  activeVersionId,
  error,
  onClose,
  onSave,
  onDelete,
  onUploadMinutes,
  onMinutesAction,
}: {
  mode: 'create' | 'edit';
  meeting: MeetingDetails | null;
  saving: boolean;
  deleting: boolean;
  loadingDetails: boolean;
  filePending: boolean;
  fileError: string;
  activeVersionId: string | null;
  error: string;
  onClose: () => void;
  onSave: (payload: CreateMeetingRequest | UpdateMeetingRequest) => void;
  onDelete: () => void;
  onUploadMinutes: (file: File) => void;
  onMinutesAction: (versionId: string, action: 'open' | 'download') => void;
}) {
  const [meetingDate, setMeetingDate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && meeting) {
      setMeetingDate(meeting.meetingDate.slice(0, 10));
      setTitle(meeting.title);
      setNotes(meeting.notes ?? '');
    } else {
      setMeetingDate(new Date().toISOString().slice(0, 10));
      setTitle('');
      setNotes('');
    }
    setMinutesFile(null);
    setFieldErrors({});
  }, [isEdit, meeting?.meetingId]);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!meetingDate) nextErrors.meetingDate = 'Meeting date is required.';
    if (!title.trim()) nextErrors.title = 'Title is required.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      return;
    }

    onSave({
      meetingDate,
      title: title.trim(),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
      />
      <div className="meetings-drawer">
        <div className="meetings-drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? meeting?.title : 'New Meeting'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit && meeting ? formatMeetingDate(meeting.meetingDate) : 'Schedule and document a meeting'}
            </span>
          </div>
          <button className="meetings-x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="meetings-drawer-body">
          {error ? <div className="meetings-error">{error}</div> : null}

          <div className="meetings-form-card">
            <div className="mb-[10px]">
              <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                {isEdit ? 'Edit Meeting' : 'Create Meeting'}
              </h3>
              <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                Store the meeting date, title, and board notes in one place.
              </p>
            </div>

            <div className="meetings-grid2">
              <div>
                <label className="meetings-form-label">Meeting Date *</label>
                <input
                  className="meetings-form-input"
                  type="date"
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                />
                {fieldErrors.meetingDate ? <div className="meetings-field-err">{fieldErrors.meetingDate}</div> : null}
              </div>
              <div>
                <label className="meetings-form-label">Title *</label>
                <input
                  className="meetings-form-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g., April Board Meeting"
                />
                {fieldErrors.title ? <div className="meetings-field-err">{fieldErrors.title}</div> : null}
              </div>
            </div>

            <div className="mt-[10px]">
              <label className="meetings-form-label">Notes</label>
              <textarea
                className="meetings-form-textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Agenda notes, attendance reminders, or preparation details."
              />
            </div>
          </div>

          {isEdit ? (
            <div className="meetings-form-card mt-[12px]">
              <div className="meetings-section-head">
                <div>
                  <h4>Minutes</h4>
                  <p>Upload PDF minutes and make them available through the documents system.</p>
                </div>
                <MinutesPill count={meeting ? meeting.minutes.length : 0} />
              </div>

              {loadingDetails ? (
                <div className="meetings-empty">Loading meeting details…</div>
              ) : meeting?.minutes.length ? (
                <div className="meetings-minutes-list">
                  {meeting.minutes.map((entry) => {
                    const currentVersion =
                      entry.document.versions.find((version) => version.isCurrent) ??
                      entry.document.versions[0];

                    return (
                      <div key={entry.meetingMinutesId} className="meetings-minute-card">
                        <div className="meetings-minute-main">
                          <strong>{entry.document.title}</strong>
                          <span>
                            Uploaded {formatMeetingDate(entry.createdAt)} • {currentVersion?.file.originalName ?? 'No file'}
                          </span>
                        </div>
                        {currentVersion ? (
                          <div className="meetings-minute-actions">
                            <button
                              className="meetings-btn-ghost"
                              onClick={() => onMinutesAction(currentVersion.versionId, 'open')}
                              disabled={activeVersionId === currentVersion.versionId}
                            >
                              {activeVersionId === currentVersion.versionId ? 'Opening…' : 'Open'}
                            </button>
                            <button
                              className="meetings-btn-soft"
                              onClick={() => onMinutesAction(currentVersion.versionId, 'download')}
                              disabled={activeVersionId === currentVersion.versionId}
                            >
                              {activeVersionId === currentVersion.versionId ? 'Preparing…' : 'Download'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="meetings-empty">No minutes uploaded yet.</div>
              )}

              <div className="meetings-upload-wrap">
                <input
                  className="meetings-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => setMinutesFile(event.target.files?.[0] ?? null)}
                />
                <div className="meetings-upload-actions">
                  <span className="meetings-help">
                    {minutesFile ? `Selected: ${minutesFile.name}` : 'Choose a PDF file to upload as meeting minutes.'}
                  </span>
                  <button
                    className="meetings-btn-solid"
                    onClick={() => minutesFile && onUploadMinutes(minutesFile)}
                    disabled={!minutesFile || filePending}
                  >
                    {filePending ? 'Uploading…' : 'Upload Minutes'}
                  </button>
                </div>
                {fileError ? <div className="meetings-field-err">{fileError}</div> : null}
              </div>
            </div>
          ) : null}

          {isEdit ? (
            <div className="meetings-danger-wrap">
              <div className="mb-[10px] flex items-start justify-between gap-3">
                <div>
                  <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                  <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                    Delete meetings that were created by mistake.
                  </p>
                </div>
                <span className="meetings-admin-pill">Admin</span>
              </div>
              <div className="meetings-danger-row">
                <div>
                  <strong className="block text-[13px] text-[#0f172a]">Delete Meeting</strong>
                  <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                    This removes the meeting record. Uploaded minute documents remain in the documents system.
                  </small>
                </div>
                <button className="meetings-danger-btn" onClick={onDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="meetings-drawer-foot">
          <button className="meetings-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="meetings-btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Meeting'}
          </button>
        </div>
      </div>
    </>
  );
}

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<MeetingDetails | null>(null);
  const [filePending, setFilePending] = useState(false);
  const [fileError, setFileError] = useState('');
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setMeetings(await getMeetings());
    } catch {
      setError('Could not load meetings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const monthOptions = useMemo(
    () =>
      [...new Set(meetings.map((meeting) => meeting.meetingDate.slice(0, 7)))]
        .sort()
        .reverse(),
    [meetings],
  );

  const filteredMeetings = meetings
    .filter((meeting) => {
      const query = search.trim().toLowerCase();
      return (
        (!query ||
          meeting.title.toLowerCase().includes(query) ||
          (meeting.notes ?? '').toLowerCase().includes(query)) &&
        (!monthFilter || meeting.meetingDate.startsWith(monthFilter))
      );
    })
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));

  const upcomingCount = meetings.filter(
    (meeting) => new Date(meeting.meetingDate) >= new Date(new Date().toDateString()),
  ).length;

  function openCreate() {
    setMode('create');
    setActiveMeetingId(null);
    setActiveMeeting(null);
    setDrawerError('');
    setFileError('');
    setDrawerOpen(true);
  }

  async function openEdit(meetingId: string) {
    try {
      setMode('edit');
      setActiveMeetingId(meetingId);
      setActiveMeeting(null);
      setDrawerError('');
      setFileError('');
      setDetailLoading(true);
      setDrawerOpen(true);
      const details = await getMeeting(meetingId);
      setActiveMeeting(details);
    } catch {
      setDrawerError('Could not load meeting details.');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveMeetingId(null);
    setActiveMeeting(null);
    setDrawerError('');
    setFileError('');
  }

  async function handleSave(payload: CreateMeetingRequest | UpdateMeetingRequest) {
    try {
      setSaving(true);
      setDrawerError('');

      if (mode === 'create') {
        await createMeeting(payload as CreateMeetingRequest);
      } else if (activeMeetingId) {
        await updateMeeting(activeMeetingId, payload as UpdateMeetingRequest);
      }

      await loadMeetings();

      if (mode === 'edit' && activeMeetingId) {
        setActiveMeeting(await getMeeting(activeMeetingId));
      } else {
        closeDrawer();
      }
    } catch {
      setDrawerError(
        mode === 'create'
          ? 'Could not create the meeting.'
          : 'Could not update the meeting.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeMeetingId) return;
    if (!window.confirm('Delete this meeting?')) return;

    try {
      setDeleting(true);
      setDrawerError('');
      await deleteMeeting(activeMeetingId);
      closeDrawer();
      await loadMeetings();
    } catch {
      setDrawerError('Could not delete the meeting.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleUploadMinutes(file: File) {
    if (!activeMeetingId) return;

    try {
      setFilePending(true);
      setFileError('');
      await uploadMeetingMinutes(activeMeetingId, file);
      setActiveMeeting(await getMeeting(activeMeetingId));
      await loadMeetings();
    } catch {
      setFileError('Could not upload meeting minutes.');
    } finally {
      setFilePending(false);
    }
  }

  async function handleMinutesAction(versionId: string, action: 'open' | 'download') {
    try {
      setActiveVersionId(versionId);
      const { blob, filename, mimeType } = await downloadDocumentVersion(versionId);
      const blobUrl = URL.createObjectURL(
        blob.type ? blob : new Blob([blob], { type: mimeType || 'application/pdf' }),
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
      setFileError('Could not open the meeting minutes file.');
    } finally {
      setActiveVersionId(null);
    }
  }

  return (
    <>
      <section
        className="rounded-[18px] border border-[#e5eaf3] p-4"
        style={{ background: 'linear-gradient(180deg,#ffffff,#fbfcff)' }}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
              Meetings
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Schedule meetings, track notes, and upload board minutes that flow into owner-visible documents.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="meetings-summary-pill">
              {loading ? '—' : `${filteredMeetings.length} meetings`}
            </span>
            <button className="meetings-btn-solid" onClick={openCreate}>
              + New Meeting
            </button>
          </div>
        </div>

        {!loading ? (
          <div className="meetings-stats">
            <div className="meetings-stat-card">
              <p>Total meetings</p>
              <strong>{meetings.length}</strong>
            </div>
            <div className="meetings-stat-card">
              <p>Upcoming</p>
              <strong>{upcomingCount}</strong>
            </div>
            <div className="meetings-stat-card">
              <p>Visible now</p>
              <strong>{filteredMeetings.length}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <div className="meetings-error-banner">{error}</div> : null}

      <div className="meetings-toolbar">
        <div className="meetings-toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meeting title or notes…"
          />
        </div>
        <select
          className="meetings-toolbar-select"
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
        >
          <option value="">All months</option>
          {monthOptions.map((option) => (
            <option key={option} value={option}>
              {formatMonthKey(option)}
            </option>
          ))}
        </select>
        <button
          className="meetings-btn-ghost"
          onClick={() => {
            setSearch('');
            setMonthFilter('');
          }}
        >
          Clear
        </button>
      </div>

      <div className="meetings-list-wrap">
        {loading ? (
          <div className="meetings-empty">Loading meetings…</div>
        ) : filteredMeetings.length === 0 ? (
          <div className="meetings-empty">No meetings matched the current filters.</div>
        ) : (
          <div className="meetings-list">
            {filteredMeetings.map((meeting) => (
              <button
                key={meeting.meetingId}
                className="meetings-card"
                onClick={() => void openEdit(meeting.meetingId)}
              >
                <div className="meetings-card-main">
                  <strong>{meeting.title}</strong>
                  <p>{meeting.notes || 'No notes added yet.'}</p>
                </div>
                <div className="meetings-card-side">
                  <span className="meetings-date-pill">
                    {formatMeetingDate(meeting.meetingDate)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {drawerOpen ? (
        <MeetingDrawer
          mode={mode}
          meeting={activeMeeting}
          saving={saving}
          deleting={deleting}
          loadingDetails={detailLoading}
          filePending={filePending}
          fileError={fileError}
          activeVersionId={activeVersionId}
          error={drawerError}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onUploadMinutes={handleUploadMinutes}
          onMinutesAction={handleMinutesAction}
        />
      ) : null}
    </>
  );
}
