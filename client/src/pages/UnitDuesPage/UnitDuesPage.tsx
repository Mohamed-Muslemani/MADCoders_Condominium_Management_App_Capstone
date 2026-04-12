import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './UnitDuesPage.css';
import {
  getUnitDues,
  createUnitDue,
  updateUnitDue,
  deleteUnitDue,
  sendUnitDueReminder,
} from '../../api/unitDues';
import {
  getDuesImportBatch,
  getDuesImportBatches,
  importUnitDuesCsv,
} from '../../api/duesImports';
import { getUnits } from '../../api/units';
import { getUnitOwners } from '../../api/unitOwners';
import type {
  UnitDue,
  CreateUnitDueRequest,
  UpdateUnitDueRequest,
  UnitDueStatus,
} from '../../types/unit-due';
import type {
  DuesImportBatch,
  DuesImportBatchListItem,
} from '../../types/dues-import';
import type { Unit } from '../../types/unit';
import type { UnitOwner } from '../../types/unit-owner';

/* ── Status Pill ── */
function StatusPill({ status }: { status: UnitDueStatus }) {
  const map = {
    PAID:   { cls: 'paid',   label: 'Paid' },
    UNPAID: { cls: 'unpaid', label: 'Unpaid' },
    WAIVED: { cls: 'waived', label: 'Waived' },
  };
  const { cls, label } = map[status] ?? map.UNPAID;
  return (
    <span className={`status-pill ${cls}`}>
      <span className="s-dot" />
      {label}
    </span>
  );
}

function countImportLines(
  batch: Pick<DuesImportBatchListItem, 'lines'>,
  rowStatus: 'APPLIED' | 'FAILED',
) {
  return batch.lines.filter((line) => line.rowStatus === rowStatus).length;
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : '—';
}

const UNIT_DUES_TEMPLATE = [
  ['unit_number', 'period_month', 'due_date', 'amount', 'status', 'paid_date', 'note'].join(','),
  ['101', '2026-04', '2026-04-05', '500', 'PAID', '2026-04-03', 'Paid by e-transfer'].join(','),
  ['303', '2026-04', '2026-04-05', '680', 'WAIVED', '', 'Board-approved waiver'].join(','),
  ['202', '2026-04', '2026-04-05', '590', 'UNPAID', '', ''].join(','),
].join('\n');

/* ── Drawer ── */
function DueDrawer({
  mode, due, units, saving, toast, reminderState,
  onClose, onSave, onDelete, onSendReminder,
}: {
  mode: 'create' | 'edit';
  due: UnitDue | null;
  units: Unit[];
  saving: boolean;
  toast: string;
  reminderState: {
    sending: boolean;
    error: string;
  };
  onClose: () => void;
  onSave: (d: CreateUnitDueRequest | UpdateUnitDueRequest) => void;
  onDelete: () => void;
  onSendReminder: () => void;
}) {
  const [unitId,      setUnitId]      = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [amount,      setAmount]      = useState('');
  const [status,      setStatus]      = useState<UnitDueStatus>('UNPAID');
  const [paidDate,    setPaidDate]    = useState('');
  const [note,        setNote]        = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && due) {
      setUnitId(due.unitId);
      setPeriodMonth(due.periodMonth?.slice(0, 7) ?? '');
      setDueDate(due.dueDate?.slice(0, 10) ?? '');
      setAmount(String(due.amount));
      setStatus(due.status);
      setPaidDate(due.paidDate?.slice(0, 10) ?? '');
      setNote(due.note ?? '');
    } else {
      setUnitId(''); setPeriodMonth(''); setDueDate('');
      setAmount(''); setStatus('UNPAID'); setPaidDate(''); setNote('');
    }
    setErrors({});
  }, [mode, due]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!unitId)           errs.unitId      = 'Unit is required.';
    if (!periodMonth)      errs.periodMonth = 'Period month is required.';
    if (!dueDate)          errs.dueDate     = 'Due date is required.';
    if (!amount)           errs.amount      = 'Amount is required.';
    else if (isNaN(Number(amount)) || Number(amount) < 0) errs.amount = 'Must be a valid amount.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      unitId,
      periodMonth: periodMonth + '-01',
      dueDate,
      amount: Number(amount),
      status,
      ...(paidDate && { paidDate }),
      ...(note     && { note }),
    });
  }

  const isEdit = mode === 'edit';

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? `Due — ${due?.unit?.unitNumber}` : 'Create Payment Due'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit ? due?.periodMonth?.slice(0, 7) ?? '—' : 'New payment record'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          <div className="form-card">
            <div className="mb-[10px]">
              <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                {isEdit ? 'Edit Payment Due' : 'Create Payment Due'}
              </h3>
              <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                {isEdit ? 'Update details and save.' : 'Fill in unit, period, due date and amount.'}
              </p>
            </div>

            {/* Unit */}
            <div>
              <label className="form-label">Unit *</label>
              <select className="form-select" value={unitId} onChange={e => setUnitId(e.target.value)} disabled={isEdit}>
                <option value="">Select unit…</option>
                {units.map(u => (
                  <option key={u.unitId} value={u.unitId}>{u.unitNumber}</option>
                ))}
              </select>
              {errors.unitId && <div className="field-err">{errors.unitId}</div>}
            </div>

            {/* Period + Due Date */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Period Month *</label>
                <input className="form-input" type="month" value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} />
                {errors.periodMonth && <div className="field-err">{errors.periodMonth}</div>}
              </div>
              <div>
                <label className="form-label">Due Date *</label>
                <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                {errors.dueDate && <div className="field-err">{errors.dueDate}</div>}
              </div>
            </div>

            {/* Amount + Status */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Amount ($) *</label>
                <input className="form-input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 450.00" />
                {errors.amount && <div className="field-err">{errors.amount}</div>}
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as UnitDueStatus)}>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="WAIVED">Waived</option>
                </select>
              </div>
            </div>

            {/* Paid Date */}
            <div className="mt-[10px]">
              <label className="form-label">Paid Date</label>
              <input className="form-input" type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} />
            </div>

            {/* Note */}
            <div className="mt-[10px]">
              <label className="form-label">Note</label>
              <textarea className="form-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional…" />
            </div>

            {/* Danger Zone */}
            {isEdit && (
              <div className="danger-wrap">
                {due?.status === 'UNPAID' ? (
                  <div className="danger-row dues-action-row">
                    <div>
                      <strong className="block text-[13px] text-[#0f172a]">
                        Send Reminder
                      </strong>
                      <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                        Email the active owner for this unit about the unpaid due.
                        {due.emailNotifiedAt
                          ? ` Last sent ${due.emailNotifiedAt.slice(0, 10)}.`
                          : ''}
                      </small>
                      {reminderState.error ? (
                        <div className="field-err">{reminderState.error}</div>
                      ) : null}
                    </div>
                    <button
                      className="btn-soft"
                      onClick={onSendReminder}
                      disabled={reminderState.sending}
                    >
                      {reminderState.sending ? 'Sending…' : 'Send Reminder'}
                    </button>
                  </div>
                ) : null}

                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">Permanently delete this payment record.</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                    Admin
                  </span>
                </div>
                <div className="danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete Record</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Permanently removes this payment. Cannot be undone.
                    </small>
                  </div>
                  <button className="danger-btn danger-btn-delete" onClick={onDelete}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Due'}
          </button>
        </div>
      </div>
    </>
  );
}

function ImportDrawer({
  batch,
  loading,
  error,
  onClose,
}: {
  batch: DuesImportBatch | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              Import Batch
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {batch ? `${batch.periodMonth.slice(0, 7)} • ${batch.totalRows} rows` : 'Loading import details'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div className="dues-empty">Loading import details…</div>
          ) : error ? (
            <div className="field-err">{error}</div>
          ) : batch ? (
            <>
              <div className="form-card">
                <div className="dues-import-detail-grid">
                  <div className="dues-import-detail-stat">
                    <span>Period</span>
                    <strong>{batch.periodMonth.slice(0, 7)}</strong>
                  </div>
                  <div className="dues-import-detail-stat">
                    <span>Rows</span>
                    <strong>{batch.totalRows}</strong>
                  </div>
                  <div className="dues-import-detail-stat">
                    <span>Applied</span>
                    <strong>{countImportLines(batch, 'APPLIED')}</strong>
                  </div>
                  <div className="dues-import-detail-stat">
                    <span>Failed</span>
                    <strong>{countImportLines(batch, 'FAILED')}</strong>
                  </div>
                </div>

                <div className="dues-import-meta">
                  Imported {formatDate(batch.importedAt)} by {batch.importedBy.firstName} {batch.importedBy.lastName}
                </div>
              </div>

              <div className="dues-import-line-list">
                {batch.lines.map((line) => (
                  <article key={line.importLineId} className="dues-import-line">
                    <div className="dues-import-line-top">
                      <strong>Row {line.rowNumber}</strong>
                      <span className={`dues-import-line-pill ${line.rowStatus === 'FAILED' ? 'is-failed' : 'is-applied'}`}>
                        {line.rowStatus}
                      </span>
                    </div>
                    <div className="dues-import-line-grid">
                      <span>Unit: {line.unit?.unitNumber ?? line.sourceUnitId ?? '—'}</span>
                      <span>Amount: {line.amount == null ? '—' : `$${formatCurrency(Number(line.amount))}`}</span>
                      <span>Due: {formatDate(line.dueDate)}</span>
                      <span>Status: {line.status ?? '—'}</span>
                    </div>
                    {line.errorReason ? (
                      <div className="field-err">{line.errorReason}</div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="dues-empty">No import details found.</div>
          )}
        </div>

        <div className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function UnitDuesPage() {
  const location = useLocation();

  const [dues,       setDues]       = useState<UnitDue[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [importBatches, setImportBatches] = useState<DuesImportBatchListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [uploadingImport, setUploadingImport] = useState(false);
  const [importError, setImportError] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [activeImportBatch, setActiveImportBatch] = useState<DuesImportBatch | null>(null);
  const [importDetailLoading, setImportDetailLoading] = useState(false);
  const [importDetailError, setImportDetailError] = useState('');
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderError, setReminderError] = useState('');

  const [search,   setSearch]  = useState('');
  const [statusF,  setStatusF] = useState('');
  const [monthF,   setMonthF]  = useState('');
  const [page,     setPage]    = useState(1);
  const [pageSize, setPageSz]  = useState(25);
  const [sortKey,  setSortKey] = useState<keyof UnitDue>('dueDate');
  const [sortDir,  setSortDir] = useState<'asc'|'desc'>('desc');

  const [drawer, setDrawer] = useState(false);
  const [mode,   setMode]   = useState<'create'|'edit'>('create');
  const [active, setActive] = useState<UnitDue | null>(null);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [d, u, o, batches] = await Promise.all([
        getUnitDues(),
        getUnits(),
        getUnitOwners(),
        getDuesImportBatches(),
      ]);
      setDues(d);
      setUnits(u);
      setUnitOwners(o);
      setImportBatches(batches);
    } catch { setError('Could not load payments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  function getOwnerName(unitId: string) {
    const record = unitOwners.find(o => o.unitId === unitId && !o.endDate);
    return record ? `${record.user.firstName} ${record.user.lastName}` : 'No Owner';
  }

  const totalUnpaid = dues.filter(d => d.status === 'UNPAID').reduce((s, d) => s + Number(d.amount), 0);
  const totalPaid   = dues.filter(d => d.status === 'PAID').reduce((s, d) => s + Number(d.amount), 0);
  const totalWaived = dues.filter(d => d.status === 'WAIVED').reduce((s, d) => s + Number(d.amount), 0);

  const months = [...new Set(dues.map(d => d.periodMonth?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const filtered = dues
    .filter(d => {
      const s = search.toLowerCase();
      const unitNum = d.unit?.unitNumber?.toLowerCase() ?? '';
      const owner   = getOwnerName(d.unitId).toLowerCase();
      return (
        (!s || unitNum.includes(s) || owner.includes(s))
        && (!statusF || d.status === statusF)
        && (!monthF  || d.periodMonth?.startsWith(monthF))
      );
    })
    .sort((a, b) => {
      const av = String(a[sortKey] ?? '').toLowerCase();
      const bv = String(b[sortKey] ?? '').toLowerCase();
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx   = (page - 1) * pageSize;
  const pageItems  = filtered.slice(startIdx, startIdx + pageSize);

  function handleSort(key: keyof UnitDue) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function openCreate() { setMode('create'); setActive(null); setDrawer(true); }
  function openEdit(d: UnitDue) { setMode('edit'); setActive(d); setDrawer(true); }
  function closeDrawer() { setDrawer(false); setActive(null); }

  async function handleSave(payload: CreateUnitDueRequest | UpdateUnitDueRequest) {
    try {
      setSaving(true);
      if (mode === 'create') {
        await createUnitDue(payload as CreateUnitDueRequest);
        showToast('Payment due created.');
      } else if (active) {
        await updateUnitDue(active.dueId, payload as UpdateUnitDueRequest);
        showToast('Changes saved.');
      }
      closeDrawer();
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm('Delete this payment record? This cannot be undone.')) return;
    try {
      await deleteUnitDue(active.dueId);
      closeDrawer();
      await fetchAll();
      showToast('Payment deleted.');
    } catch { showToast('Could not delete.'); }
  }

  function exportCSV() {
    const escapeCsv = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;

    const header = [
      'unit_number',
      'period_month',
      'due_date',
      'amount',
      'status',
      'paid_date',
      'note',
    ].join(',');
    const rows = filtered.map((d) =>
      [
        escapeCsv(d.unit?.unitNumber ?? ''),
        escapeCsv(d.periodMonth?.slice(0, 7) ?? ''),
        escapeCsv(d.dueDate?.slice(0, 10) ?? ''),
        escapeCsv(d.amount),
        escapeCsv(d.status),
        escapeCsv(d.paidDate?.slice(0, 10) ?? ''),
        escapeCsv(d.note ?? ''),
      ].join(','),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }),
    );
    a.download = 'unit-dues-export.csv';
    a.click();
  }

  function downloadImportTemplate() {
    const blob = new Blob([UNIT_DUES_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'unit-dues-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
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
              Payments
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Track unit dues, mark payments, waive fees and manage payment history.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} records`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={openCreate}>+ Create Due</button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.06em] text-[#64748b]">Unpaid</p>
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#991b1b]">${formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.06em] text-[#64748b]">Paid</p>
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#166534]">${formatCurrency(totalPaid)}</p>
            </div>
            <div className="rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.06em] text-[#64748b]">Waived</p>
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0369a1]">${formatCurrency(totalWaived)}</p>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      <section className="dues-imports-panel">
        <div className="dues-imports-head">
          <div>
            <h3>CSV Imports</h3>
            <p>Upload monthly dues in bulk and review the latest import results.</p>
          </div>
          <span className="dues-imports-pill">
            {importBatches.length} batch{importBatches.length === 1 ? '' : 'es'}
          </span>
        </div>

        <div className="dues-imports-grid">
          <div className="dues-import-card">
            <div className="dues-import-card-head">
              <label className="form-label m-0" htmlFor="dues-import-file">Import CSV</label>
              <button
                className="btn-ghost"
                type="button"
                onClick={downloadImportTemplate}
              >
                Download Template
              </button>
            </div>
            <input
              id="dues-import-file"
              className="dues-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <div className="dues-import-help">
              {importFile
                ? `Selected: ${importFile.name}`
                : 'Use unit_number for the easiest import. Required columns are unit_number or unit_id, period_month, due_date, and amount.'}
            </div>
            <div className="dues-import-example">
              Example: <code>101,2026-04,2026-04-05,500,UNPAID,,April dues</code>
            </div>
            {importError ? (
              <div className="field-err">{importError}</div>
            ) : null}
            <div className="dues-import-actions">
              <button
                className="btn-solid"
                type="button"
                disabled={!importFile || uploadingImport}
                onClick={() => void handleImportCsv()}
              >
                {uploadingImport ? 'Importing…' : 'Import CSV'}
              </button>
            </div>
          </div>

          <div className="dues-import-card">
            <div className="dues-import-history-head">
              <strong>Recent Imports</strong>
              <span>{importBatches.length ? 'Newest first' : 'No imports yet'}</span>
            </div>
            {importBatches.length ? (
              <div className="dues-import-history">
                {importBatches.slice(0, 5).map((batch) => (
                  <button
                    key={batch.importBatchId}
                    className="dues-import-row"
                    type="button"
                    onClick={() => void openImportBatch(batch.importBatchId)}
                  >
                    <div>
                      <strong>{batch.periodMonth.slice(0, 7)}</strong>
                      <span>{formatDate(batch.importedAt)} • {batch.file.originalName}</span>
                    </div>
                    <div className="dues-import-row-stats">
                      <span>{countImportLines(batch, 'APPLIED')} applied</span>
                      <span>{countImportLines(batch, 'FAILED')} failed</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dues-empty">No dues imports yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div className="dues-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by unit #, owner…"
          />
        </div>
        <select className="toolbar-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
          <option value="WAIVED">Waived</option>
        </select>
        <select className="toolbar-select" value={monthF} onChange={e => { setMonthF(e.target.value); setPage(1); }}>
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="toolbar-select" value={pageSize} onChange={e => { setPageSz(Number(e.target.value)); setPage(1); }}>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button className="btn-ghost" onClick={() => { setSearch(''); setStatusF(''); setMonthF(''); setPage(1); }}>
          Clear
        </button>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">Loading…</div>
          ) : (
            <table className="dues-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>
                    <button className="sort-btn" onClick={() => handleSort('unit' as keyof UnitDue)}>Unit</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '16%' }}>
                    <button className="sort-btn" onClick={() => handleSort('periodMonth')}>Period</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '16%' }}>
                    <button className="sort-btn" onClick={() => handleSort('dueDate')}>Due Date</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '16%' }}>
                    <button className="sort-btn" onClick={() => handleSort('amount')}>Amount</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '16%' }}>Paid Date</th>
                  <th style={{ width: '16%' }}>
                    <button className="sort-btn" onClick={() => handleSort('status')}>Status</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[13px] text-[#64748b]">
                      No payment records found.
                    </td>
                  </tr>
                ) : pageItems.map(d => (
                  <tr key={d.dueId}>
                    <td>
                      <button className="row-link" onClick={() => openEdit(d)}>
                        <div className="cell-title">{d.unit?.unitNumber ?? '—'}</div>
                        <div className="cell-sub">{getOwnerName(d.unitId)}</div>
                      </button>
                    </td>
                    <td><div className="cell-main">{d.periodMonth?.slice(0, 7) ?? '—'}</div></td>
                    <td><div className="cell-main">{d.dueDate?.slice(0, 10) ?? '—'}</div></td>
                    <td><div className="money">${formatCurrency(Number(d.amount))}</div></td>
                    <td><div className="cell-main">{d.paidDate?.slice(0, 10) ?? '—'}</div></td>
                    <td><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
        <DueDrawer
          mode={mode}
          due={active}
          units={units}
          saving={saving}
          toast={toast}
          reminderState={{
            sending: reminderSending,
            error: reminderError,
          }}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onSendReminder={() => void handleSendReminder()}
        />
      )}

      {importDrawerOpen ? (
        <ImportDrawer
          batch={activeImportBatch}
          loading={importDetailLoading}
          error={importDetailError}
          onClose={closeImportDrawer}
        />
      ) : null}
    </>
  );

  async function handleImportCsv() {
    if (!importFile) return;

    try {
      setUploadingImport(true);
      setImportError('');
      const batch = await importUnitDuesCsv(importFile);
      setImportFile(null);
      await fetchAll();
      showToast('Dues imported successfully.');
      setActiveImportBatch(batch);
      setImportDetailError('');
      setImportDrawerOpen(true);
    } catch {
      setImportError('Could not import the CSV file.');
    } finally {
      setUploadingImport(false);
    }
  }

  async function openImportBatch(importBatchId: string) {
    try {
      setImportDrawerOpen(true);
      setImportDetailLoading(true);
      setImportDetailError('');
      const batch = await getDuesImportBatch(importBatchId);
      setActiveImportBatch(batch);
    } catch {
      setImportDetailError('Could not load import batch details.');
    } finally {
      setImportDetailLoading(false);
    }
  }

  function closeImportDrawer() {
    setImportDrawerOpen(false);
    setActiveImportBatch(null);
    setImportDetailError('');
  }

  async function handleSendReminder() {
    if (!active) return;

    try {
      setReminderSending(true);
      setReminderError('');
      const response = await sendUnitDueReminder(active.dueId);
      setActive(response.due);
      setDues((current) =>
        current.map((due) => (due.dueId === response.due.dueId ? response.due : due)),
      );
      showToast(
        response.recipients.length > 0
          ? `Reminder sent to ${response.recipients.length} recipient${response.recipients.length === 1 ? '' : 's'}.`
          : response.message,
      );
    } catch {
      setReminderError('Could not send a reminder for this due.');
    } finally {
      setReminderSending(false);
    }
  }
}
