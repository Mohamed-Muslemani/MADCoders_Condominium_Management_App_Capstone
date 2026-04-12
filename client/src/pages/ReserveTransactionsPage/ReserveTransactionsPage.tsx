import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './ReserveTransactionsPage.css';
import {
  getReserveTransactions,
  createReserveTransaction,
  updateReserveTransaction,
  deleteReserveTransaction,
  deleteReserveTransactionReceipt,
  downloadReserveTransactionReceipt,
  uploadReserveTransactionReceipt,
} from '../../api/reserveTransactions';
import type {
  ReserveTransaction,
  CreateReserveTransactionRequest,
  UpdateReserveTransactionRequest,
} from '../../types/reserve-transaction';

/* ── Lightbox ── */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img src={src} alt="Receipt" onClick={e => e.stopPropagation()} />
    </div>
  );
}

/* ── Expense Drawer ── */
function ExpenseDrawer({
  mode, transaction, saving, toast,
  onClose, onSave, onDelete, onReceiptAction,
}: {
  mode: 'create' | 'edit';
  transaction: ReserveTransaction | null;
  saving: boolean;
  toast: string;
  onClose: () => void;
  onSave: (
    p: CreateReserveTransactionRequest | UpdateReserveTransactionRequest,
    receipt: File | null
  ) => void;
  onDelete: () => void;
  onReceiptAction: (action: 'open' | 'download' | 'remove') => void;
}) {
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [amount,        setAmount]        = useState('');
  const [date,          setDate]          = useState('');
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [receiptFile,   setReceiptFile]   = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [lightbox,      setLightbox]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && transaction) {
      setTitle(transaction.title);
      setDescription(transaction.description ?? '');
      setAmount(String(transaction.amount));
      setDate(transaction.transactionDate?.slice(0, 10) ?? '');
    } else {
      setTitle(''); setDescription(''); setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
    }
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setErrors({});
  }, [mode, transaction?.transactionId]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors(er => ({ ...er, receipt: 'Only JPG/PNG allowed.' })); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(er => ({ ...er, receipt: 'Max 5MB.' })); return;
    }
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
    setErrors(er => { const n = { ...er }; delete n.receipt; return n; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title  = 'Title is required.';
    if (!amount)       errs.amount = 'Amount is required.';
    else if (isNaN(Number(amount)) || Number(amount) < 0) errs.amount = 'Must be a valid amount.';
    if (!date)         errs.date   = 'Date is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const payload = isEdit
      ? {
          title: title.trim(),
          description: description.trim() || undefined,
          amount: Number(amount),
          transactionDate: date,
        } as UpdateReserveTransactionRequest
      : {
          title: title.trim(),
          description: description.trim() || undefined,
          amount: Number(amount),
          type: 'EXPENSE' as const,
          status: 'POSTED' as const,
          transactionDate: date,
        } as CreateReserveTransactionRequest;
    onSave(payload, receiptFile);
  }

  const fmt = (n: string | number) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {lightbox && receiptPreviewUrl && (
        <Lightbox src={receiptPreviewUrl} onClose={() => setLightbox(false)} />
      )}

      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />

      <div className="exp-drawer">

        {/* Head */}
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? transaction?.title : 'Add Expense'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? `$${fmt(transaction?.amount ?? 0)} • ${transaction?.transactionDate?.slice(0, 10) ?? '—'}`
                : 'Upload receipt (optional) and save details'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          {/* Two column */}
          <div className="drawer-two-col">

            {/* Left — Receipt */}
            <div className="detail-card">
              <div className="card-head">
                <div>
                  <h4>Receipt Image</h4>
                  <p>Upload photo (PNG/JPG). Click preview to enlarge.</p>
                </div>
              </div>

              {receiptPreviewUrl ? (
                <>
                  <div className="receipt-preview">
                    <img src={receiptPreviewUrl} alt="Receipt preview" />
                  </div>
                  <div className="receipt-actions mt-[10px]">
                    <button className="btn-small" onClick={() => setLightbox(true)}>View</button>
                    <button className="btn-small" onClick={() => fileRef.current?.click()}>Replace</button>
                    <button
                      className="btn-small danger"
                      onClick={() => {
                        if (receiptPreviewUrl) {
                          URL.revokeObjectURL(receiptPreviewUrl);
                        }
                        setReceiptFile(null);
                        setReceiptPreviewUrl(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : isEdit && transaction?.receiptFile ? (
                <>
                  <div className="receipt-upload-area">
                    <span className="upload-icon">🧾</span>
                    <strong>{transaction.receiptFile.originalName}</strong>
                    <span>Stored on the server and available to your team.</span>
                  </div>
                  <div className="receipt-actions mt-[10px]">
                    <button className="btn-small" onClick={() => onReceiptAction('open')}>Open</button>
                    <button className="btn-small" onClick={() => onReceiptAction('download')}>Download</button>
                    <button className="btn-small" onClick={() => fileRef.current?.click()}>Replace</button>
                    <button className="btn-small danger" onClick={() => onReceiptAction('remove')}>Remove</button>
                  </div>
                </>
              ) : (
                <div className="receipt-upload-area" onClick={() => fileRef.current?.click()}>
                  <span className="upload-icon">🧾</span>
                  <strong>Click to upload receipt</strong>
                  <span>JPG / PNG (max 5MB)</span>
                </div>
              )}

              {errors.receipt && <div className="field-err mt-[6px]">{errors.receipt}</div>}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <p className="receipt-tip mt-[10px]">
                Receipts are stored on the server and linked to each expense.
              </p>
            </div>

            {/* Right — Form */}
            <div className="detail-card">
              <div className="card-head">
                <div>
                  <h4>{isEdit ? 'Edit Expense' : 'Add Expense'}</h4>
                  <p>What was paid for + amount + date are required.</p>
                </div>
              </div>

              <div>
                <label className="form-label">What was paid for *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Plumbing repair — main hall"
                />
                {errors.title && <div className="field-err">{errors.title}</div>}
              </div>

              <div className="mt-[10px]">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional…"
                />
              </div>

              <div className="grid2 mt-[10px]">
                <div>
                  <label className="form-label">Amount ($) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="e.g., 487.25"
                  />
                  {errors.amount && <div className="field-err">{errors.amount}</div>}
                </div>
                <div>
                  <label className="form-label">Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                  {errors.date && <div className="field-err">{errors.date}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone — full width, edit only */}
          {isEdit && (
            <div className="danger-wrap mt-[12px]">
              <div className="mb-[10px] flex items-start justify-between gap-3">
                <div>
                  <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                  <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                    Permanently delete this expense.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                  Admin
                </span>
              </div>
              <div className="danger-row">
                <div>
                  <strong className="block text-[13px] text-[#0f172a]">Delete Expense</strong>
                  <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                    Permanently removes this record. Cannot be undone.
                  </small>
                </div>
                <button className="danger-btn danger-btn-delete" onClick={onDelete}>Delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Foot */}
        <div className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function ReserveTransactionsPage() {
  const location = useLocation();

  const [transactions, setTransactions] = useState<ReserveTransaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [toast,        setToast]        = useState('');

  const [search,   setSearch]  = useState('');
  const [page,     setPage]    = useState(1);
  const [pageSize, setPageSz]  = useState(25);

  const [drawer, setDrawer] = useState(false);
  const [mode,   setMode]   = useState<'create' | 'edit'>('create');
  const [active, setActive] = useState<ReserveTransaction | null>(null);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const data = await getReserveTransactions({ type: 'EXPENSE', status: 'POSTED' });
      setTransactions(data);
    } catch { setError('Could not load expenses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  const filtered = transactions.filter(t => {
    const s = search.toLowerCase();
    return !s || t.title.toLowerCase().includes(s) || (t.description ?? '').toLowerCase().includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx   = (page - 1) * pageSize;
  const pageItems  = filtered.slice(startIdx, startIdx + pageSize);

  function openCreate() { setMode('create'); setActive(null); setDrawer(true); }
  function openEdit(t: ReserveTransaction) { setMode('edit'); setActive(t); setDrawer(true); }
  function closeDrawer() { setDrawer(false); setActive(null); }

  async function handleSave(
    payload: CreateReserveTransactionRequest | UpdateReserveTransactionRequest,
    receipt: File | null,
  ) {
    try {
      setSaving(true);
      if (mode === 'create') {
        const created = await createReserveTransaction(
          payload as CreateReserveTransactionRequest
        );
        if (receipt) {
          await uploadReserveTransactionReceipt(created.transactionId, receipt);
        }
        showToast('Expense added.');
      } else if (active) {
        await updateReserveTransaction(
          active.transactionId,
          payload as UpdateReserveTransactionRequest
        );
        if (receipt) {
          await uploadReserveTransactionReceipt(active.transactionId, receipt);
        }
        showToast('Changes saved.');
      }
      closeDrawer();
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm('Delete this expense? Cannot be undone.')) return;
    try {
      await deleteReserveTransaction(active.transactionId);
      closeDrawer();
      await fetchAll();
      showToast('Expense deleted.');
    } catch { showToast('Could not delete.'); }
  }

  async function handleReceiptAction(action: 'open' | 'download' | 'remove') {
    if (!active) {
      return;
    }

    try {
      if (action === 'remove') {
        const updated = await deleteReserveTransactionReceipt(active.transactionId);
        setActive(updated);
        await fetchAll();
        showToast('Receipt removed.');
        return;
      }

      const { blob, filename } = await downloadReserveTransactionReceipt(
        active.transactionId,
      );
      const objectUrl = URL.createObjectURL(blob);

      if (action === 'open') {
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
      showToast(
        action === 'remove'
          ? 'Could not remove receipt.'
          : 'Could not access receipt.',
      );
    }
  }

  function exportCSV() {
    const header = ['transactionId', 'title', 'description', 'amount', 'date', 'receipt'].join(',');
    const rows = filtered.map(t =>
      [
        t.transactionId,
        `"${t.title}"`,
        `"${t.description ?? ''}"`,
        t.amount,
        t.transactionDate?.slice(0, 10) ?? '',
        t.receiptFile ? 'yes' : 'no',
      ].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    );
    a.download = 'expenses.csv';
    a.click();
  }

  const fmt = (n: string | number) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalAmount = filtered.reduce((s, t) => s + Number(t.amount), 0);

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
              Expenses (Receipt Gallery)
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Track posted expenses and keep each receipt stored with the expense record.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} expenses`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={openCreate}>+ Add Expense</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="exp-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search what paid for, description…"
          />
        </div>
        <select
          className="toolbar-select"
          value={pageSize}
          onChange={e => { setPageSz(Number(e.target.value)); setPage(1); }}
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button className="btn-ghost" onClick={() => { setSearch(''); setPage(1); }}>Clear</button>
      </div>

      {/* ── List header ── */}
      <div className="list-head">
        <div className="list-head-left">
          All Expenses
          <span>Receipt thumbnail • details • amount</span>
        </div>
        <div className="list-head-right">
          {filtered.length > 0
            ? `Showing ${startIdx + 1}–${Math.min(filtered.length, startIdx + pageSize)} of ${filtered.length}`
            : 'No expenses'}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">
          No expenses found.
        </div>
      ) : (
        <div className="exp-list">
          {pageItems.map(t => {
            return (
              <button key={t.transactionId} className="exp-row" onClick={() => openEdit(t)}>
                <div className={`exp-thumb ${t.receiptFile ? '' : 'no-receipt'}`}>
                  {t.receiptFile ? 'Stored receipt' : 'No receipt'}
                </div>
                <div className="exp-content">
                  <div className="exp-title">{t.title}</div>
                  {t.description && <div className="exp-desc">{t.description}</div>}
                  <div className="exp-chips">
                    <span className="exp-chip amount">${fmt(t.amount)}</span>
                    <span className="exp-chip date">🗓 {t.transactionDate?.slice(0, 10) ?? '—'}</span>
                    {t.receiptFile
                      ? <span className="exp-chip receipt-yes">🧾 Receipt</span>
                      : <span className="exp-chip no-receipt">— No receipt</span>}
                  </div>
                </div>
                <span className="exp-arrow">›</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="exp-foot">
        <div className="page-info">
          Page {page} of {totalPages}
          {!loading && (
            <span className="ml-3 font-black text-[#0b2b55]">
              Total: ${fmt(totalAmount)}
            </span>
          )}
        </div>
        <div className="pager">
          <button
            className="btn-ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className="btn-ghost"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <ExpenseDrawer
          mode={mode}
          transaction={active}
          saving={saving}
          toast={toast}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onReceiptAction={handleReceiptAction}
        />
      )}
    </>
  );
}
