import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './UnitDuesPage.css';
import { getUnitDues, createUnitDue, updateUnitDue, deleteUnitDue } from '../../api/unitDues';
import { getUnits } from '../../api/units';
import { getUnitOwners } from '../../api/unitOwners';
import type { UnitDue, CreateUnitDueRequest, UpdateUnitDueRequest, UnitDueStatus } from '../../types/unit-due';
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

/* ── Drawer ── */
function DueDrawer({
  mode, due, units, saving, toast,
  onClose, onSave, onDelete,
}: {
  mode: 'create' | 'edit';
  due: UnitDue | null;
  units: Unit[];
  saving: boolean;
  toast: string;
  onClose: () => void;
  onSave: (d: CreateUnitDueRequest | UpdateUnitDueRequest) => void;
  onDelete: () => void;
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

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function UnitDuesPage() {
  const location = useLocation();

  const [dues,       setDues]       = useState<UnitDue[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

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
      const [d, u, o] = await Promise.all([getUnitDues(), getUnits(), getUnitOwners()]);
      setDues(d);
      setUnits(u);
      setUnitOwners(o);
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
    const header = ['dueId','unit','owner','periodMonth','dueDate','amount','status','paidDate'].join(',');
    const rows = filtered.map(d =>
      [d.dueId, `"${d.unit?.unitNumber ?? ''}"`, `"${getOwnerName(d.unitId)}"`,
       d.periodMonth?.slice(0,7), d.dueDate?.slice(0,10),
       d.amount, d.status, d.paidDate?.slice(0,10) ?? ''].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header,...rows].join('\n')],{type:'text/csv'}));
    a.download = 'payments.csv'; a.click();
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#991b1b]">${fmt(totalUnpaid)}</p>
            </div>
            <div className="rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.06em] text-[#64748b]">Paid</p>
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#166534]">${fmt(totalPaid)}</p>
            </div>
            <div className="rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.06em] text-[#64748b]">Waived</p>
              <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0369a1]">${fmt(totalWaived)}</p>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

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
                    <td><div className="money">${fmt(Number(d.amount))}</div></td>
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
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}