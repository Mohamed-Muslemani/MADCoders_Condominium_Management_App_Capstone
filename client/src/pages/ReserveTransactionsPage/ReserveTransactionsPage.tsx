import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './ReserveTransactionsPage.css';
import {
  createExpenseCategory,
  getExpenseCategories,
} from '../../api/expenseCategories';
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
  ReserveTransactionStatus,
  ReserveTransactionType,
  UpdateReserveTransactionRequest,
} from '../../types/reserve-transaction';
import type { ExpenseCategory } from '../../types/expense-category';

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img src={src} alt="Receipt" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  return value?.slice(0, 10) ?? '—';
}

function formatType(type: ReserveTransactionType) {
  return type === 'EXPENSE' ? 'Expense' : 'Projection';
}

function formatStatus(status: ReserveTransactionStatus) {
  if (status === 'POSTED') return 'Posted';
  if (status === 'PLANNED') return 'Planned';
  return 'Cancelled';
}

function transactionChipClass(type: ReserveTransactionType) {
  return type === 'EXPENSE' ? 'exp-chip expense-type' : 'exp-chip projection-type';
}

function statusChipClass(status: ReserveTransactionStatus) {
  if (status === 'POSTED') return 'exp-chip status-posted';
  if (status === 'PLANNED') return 'exp-chip status-planned';
  return 'exp-chip status-cancelled';
}

function ExpenseDrawer({
  mode,
  transaction,
  saving,
  toast,
  categories,
  onClose,
  onSave,
  onDelete,
  onReceiptAction,
  onCreateCategory,
}: {
  mode: 'create' | 'edit';
  transaction: ReserveTransaction | null;
  saving: boolean;
  toast: string;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: (
    p: CreateReserveTransactionRequest | UpdateReserveTransactionRequest,
    receipt: File | null,
  ) => void;
  onDelete: () => void;
  onReceiptAction: (action: 'open' | 'download' | 'remove') => void;
  onCreateCategory: (payload: {
    name: string;
    description?: string;
  }) => Promise<ExpenseCategory>;
}) {
  const [type, setType] = useState<ReserveTransactionType>('EXPENSE');
  const [status, setStatus] = useState<ReserveTransactionStatus>('POSTED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [showCategoryCreate, setShowCategoryCreate] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && transaction) {
      setType(transaction.type);
      setStatus(transaction.status);
      setTitle(transaction.title);
      setDescription(transaction.description ?? '');
      setCategoryId(transaction.categoryId ?? '');
      setAmount(String(transaction.amount));
      setTransactionDate(transaction.transactionDate?.slice(0, 10) ?? '');
      setExpectedDate(transaction.expectedDate?.slice(0, 10) ?? '');
    } else {
      setType('EXPENSE');
      setStatus('POSTED');
      setTitle('');
      setDescription('');
      setCategoryId('');
      setAmount('');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setExpectedDate('');
    }
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setShowCategoryCreate(false);
    setNewCategoryName('');
    setNewCategoryDescription('');
    setCategoryError('');
    setErrors({});
  }, [isEdit, transaction?.transactionId]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  useEffect(() => {
    if (type === 'EXPENSE' && status === 'PLANNED') {
      setStatus('POSTED');
    }

    if (type === 'PROJECTION' && status === 'POSTED') {
      setStatus('PLANNED');
    }
  }, [type, status]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((current) => ({ ...current, receipt: 'Only JPG/PNG allowed.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, receipt: 'Max 5MB.' }));
      return;
    }
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
    setErrors((current) => {
      const next = { ...current };
      delete next.receipt;
      return next;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (!amount) nextErrors.amount = 'Amount is required.';
    else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Must be a valid amount.';
    }

    if (type === 'EXPENSE' && !transactionDate) {
      nextErrors.transactionDate = 'Expense date is required.';
    }

    if (type === 'PROJECTION' && !expectedDate) {
      nextErrors.expectedDate = 'Expected date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const sharedPayload = {
      categoryId: categoryId || null,
      type,
      status,
      title: title.trim(),
      description: description.trim() || undefined,
      amount: Number(amount),
      transactionDate: transactionDate || null,
      expectedDate: expectedDate || null,
    };

    if (isEdit) {
      onSave(sharedPayload as UpdateReserveTransactionRequest, receiptFile);
      return;
    }

    onSave(
      {
        categoryId: categoryId || undefined,
        type,
        status,
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        transactionDate: transactionDate || undefined,
        expectedDate: expectedDate || undefined,
      } as CreateReserveTransactionRequest,
      receiptFile,
    );
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      setCategoryError('Category name is required.');
      return;
    }

    try {
      setCategorySaving(true);
      setCategoryError('');
      const created = await onCreateCategory({
        name,
        description: newCategoryDescription.trim() || undefined,
      });
      setCategoryId(created.categoryId);
      setShowCategoryCreate(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (requestError) {
      setCategoryError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not create category.',
      );
    } finally {
      setCategorySaving(false);
    }
  }

  const headerText = type === 'EXPENSE' ? 'Transaction details for a completed expense.' : 'Track a projected future cost.';

  return (
    <>
      {lightbox && receiptPreviewUrl ? (
        <Lightbox src={receiptPreviewUrl} onClose={() => setLightbox(false)} />
      ) : null}

      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />

      <div className="exp-drawer">
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? transaction?.title : 'New Transaction'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? `${formatType(type)} • ${formatStatus(status)}`
                : 'Create an expense or projection and keep supporting details together.'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {toast ? <div className="drawer-toast">{toast}</div> : null}

          <div className="drawer-two-col">
            <div className="detail-card">
              <div className="card-head">
                <div>
                  <h4>Receipt Image</h4>
                  <p>Optional for expenses. Upload PNG/JPG and open it later from the transaction record.</p>
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
                    <span>Stored on the server and linked to this transaction.</span>
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

              {errors.receipt ? <div className="field-err mt-[6px]">{errors.receipt}</div> : null}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <p className="receipt-tip mt-[10px]">
                {type === 'PROJECTION'
                  ? 'Projections can be saved without receipts and updated later when they become real expenses.'
                  : 'Receipts are optional but useful when you want a full expense trail.'}
              </p>
            </div>

            <div className="detail-card">
              <div className="card-head">
                <div>
                  <h4>{isEdit ? 'Edit Transaction' : 'Create Transaction'}</h4>
                  <p>{headerText}</p>
                </div>
              </div>

              <div className="grid2">
                <div>
                  <label className="form-label">Type *</label>
                  <select
                    className="form-input"
                    value={type}
                    onChange={(e) => setType(e.target.value as ReserveTransactionType)}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="PROJECTION">Projection</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status *</label>
                  <select
                    className="form-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReserveTransactionStatus)}
                  >
                    {type === 'EXPENSE' ? (
                      <>
                        <option value="POSTED">Posted</option>
                        <option value="CANCELLED">Cancelled</option>
                      </>
                    ) : (
                      <>
                        <option value="PLANNED">Planned</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="POSTED">Posted</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-[10px]">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'EXPENSE' ? 'e.g., Plumbing repair - lobby' : 'e.g., Roof membrane replacement'}
                />
                {errors.title ? <div className="field-err">{errors.title}</div> : null}
              </div>

              <div className="mt-[10px]">
                <label className="form-label">Category</label>
                <div className="exp-category-row">
                  <select
                    className="form-input"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setShowCategoryCreate((current) => !current);
                      setCategoryError('');
                    }}
                  >
                    {showCategoryCreate ? 'Hide' : '+ New'}
                  </button>
                </div>

                {showCategoryCreate ? (
                  <div className="exp-category-create">
                    {categoryError ? <div className="field-err">{categoryError}</div> : null}
                    <input
                      className="form-input"
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      placeholder="Category name"
                    />
                    <input
                      className="form-input"
                      value={newCategoryDescription}
                      onChange={(event) => setNewCategoryDescription(event.target.value)}
                      placeholder="Optional description"
                    />
                    <div className="exp-category-create-actions">
                      <button
                        type="button"
                        className="btn-soft"
                        onClick={() => void handleCreateCategory()}
                        disabled={categorySaving}
                      >
                        {categorySaving ? 'Creating…' : 'Create Category'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-[10px]">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this transaction..."
                />
              </div>

              <div className="grid2 mt-[10px]">
                <div>
                  <label className="form-label">Amount ($) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 487.25"
                  />
                  {errors.amount ? <div className="field-err">{errors.amount}</div> : null}
                </div>
                <div>
                  <label className="form-label">Expense Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                  {errors.transactionDate ? <div className="field-err">{errors.transactionDate}</div> : null}
                </div>
              </div>

              <div className="mt-[10px]">
                <label className="form-label">Expected Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
                {errors.expectedDate ? <div className="field-err">{errors.expectedDate}</div> : null}
              </div>
            </div>
          </div>

          {isEdit ? (
            <div className="danger-wrap mt-[12px]">
              <div className="mb-[10px] flex items-start justify-between gap-3">
                <div>
                  <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                  <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                    Permanently delete this transaction.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                  Admin
                </span>
              </div>
              <div className="danger-row">
                <div>
                  <strong className="block text-[13px] text-[#0f172a]">Delete Transaction</strong>
                  <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                    Removes this record and any linked receipt.
                  </small>
                </div>
                <button className="danger-btn danger-btn-delete" onClick={onDelete}>Delete</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </>
  );
}

export function ReserveTransactionsPage() {
  const location = useLocation();
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ReserveTransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReserveTransactionStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSz] = useState(25);
  const [drawer, setDrawer] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [active, setActive] = useState<ReserveTransaction | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [transactionData, categoryData] = await Promise.all([
        getReserveTransactions(),
        getExpenseCategories(),
      ]);
      setTransactions(transactionData);
      setCategories(categoryData);
    } catch {
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [location.key, fetchAll]);

  useEffect(() => {
    function handleCreateEvent() {
      openCreate();
    }

    window.addEventListener('admin-expenses-create', handleCreateEvent);
    return () => {
      window.removeEventListener('admin-expenses-create', handleCreateEvent);
    };
  }, []);

  const filtered = transactions.filter((transaction) => {
    const normalized = search.toLowerCase();

    return (
      (!normalized ||
        transaction.title.toLowerCase().includes(normalized) ||
        (transaction.description ?? '').toLowerCase().includes(normalized) ||
        (transaction.category?.name ?? '').toLowerCase().includes(normalized)) &&
      (typeFilter === 'ALL' || transaction.type === typeFilter) &&
      (statusFilter === 'ALL' || transaction.status === statusFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const projectionCount = filtered.filter((transaction) => transaction.type === 'PROJECTION').length;
  const expenseCount = filtered.filter((transaction) => transaction.type === 'EXPENSE').length;
  const totalAmount = filtered.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  function openCreate() {
    setMode('create');
    setActive(null);
    setDrawer(true);
  }

  function openEdit(transaction: ReserveTransaction) {
    setMode('edit');
    setActive(transaction);
    setDrawer(true);
  }

  function closeDrawer() {
    setDrawer(false);
    setActive(null);
  }

  async function handleSave(
    payload: CreateReserveTransactionRequest | UpdateReserveTransactionRequest,
    receipt: File | null,
  ) {
    try {
      setSaving(true);
      if (mode === 'create') {
        const created = await createReserveTransaction(payload as CreateReserveTransactionRequest);
        if (receipt) {
          await uploadReserveTransactionReceipt(created.transactionId, receipt);
        }
        showToast('Transaction saved.');
      } else if (active) {
        await updateReserveTransaction(active.transactionId, payload as UpdateReserveTransactionRequest);
        if (receipt) {
          await uploadReserveTransactionReceipt(active.transactionId, receipt);
        }
        showToast('Transaction updated.');
      }
      closeDrawer();
      await fetchAll();
    } catch {
      showToast('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm('Delete this transaction? Cannot be undone.')) return;
    try {
      await deleteReserveTransaction(active.transactionId);
      closeDrawer();
      await fetchAll();
      showToast('Transaction deleted.');
    } catch {
      showToast('Could not delete.');
    }
  }

  async function handleReceiptAction(action: 'open' | 'download' | 'remove') {
    if (!active) return;

    try {
      if (action === 'remove') {
        const updated = await deleteReserveTransactionReceipt(active.transactionId);
        setActive(updated);
        await fetchAll();
        showToast('Receipt removed.');
        return;
      }

      const { blob, filename } = await downloadReserveTransactionReceipt(active.transactionId);
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
      showToast(action === 'remove' ? 'Could not remove receipt.' : 'Could not access receipt.');
    }
  }

  async function handleCreateCategory(payload: { name: string; description?: string }) {
    const created = await createExpenseCategory(payload);
    setCategories((current) =>
      [...current, created].sort((left, right) => left.name.localeCompare(right.name)),
    );
    showToast(`Category "${created.name}" created.`);
    return created;
  }

  function exportCSV() {
    const header = [
      'transactionId',
      'type',
      'status',
      'title',
      'description',
      'amount',
      'transactionDate',
      'expectedDate',
      'category',
      'receipt',
    ].join(',');

    const rows = filtered.map((transaction) =>
      [
        transaction.transactionId,
        transaction.type,
        transaction.status,
        `"${transaction.title}"`,
        `"${transaction.description ?? ''}"`,
        transaction.amount,
        transaction.transactionDate?.slice(0, 10) ?? '',
        transaction.expectedDate?.slice(0, 10) ?? '',
        `"${transaction.category?.name ?? ''}"`,
        transaction.receiptFile ? 'yes' : 'no',
      ].join(','),
    );

    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }));
    anchor.download = 'transactions.csv';
    anchor.click();
  }

  return (
    <>
      <section
        className="rounded-[18px] border border-[#e5eaf3] p-[14px]"
        style={{ background: 'linear-gradient(180deg,#ffffff,#fbfcff)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
              Transactions
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Manage posted expenses and future projections in one place.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} transactions`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={openCreate}>+ Add Transaction</button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      ) : null}

      <div className="transaction-summary">
        <div className="transaction-summary-card">
          <small>Total shown</small>
          <strong>{filtered.length}</strong>
        </div>
        <div className="transaction-summary-card">
          <small>Expenses</small>
          <strong>{expenseCount}</strong>
        </div>
        <div className="transaction-summary-card">
          <small>Projections</small>
          <strong>{projectionCount}</strong>
        </div>
        <div className="transaction-summary-card">
          <small>Combined value</small>
          <strong>${formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      <div className="exp-toolbar transaction-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, description, category…"
          />
        </div>
        <select
          className="toolbar-select"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as 'ALL' | ReserveTransactionType);
            setPage(1);
          }}
        >
          <option value="ALL">All types</option>
          <option value="EXPENSE">Expenses</option>
          <option value="PROJECTION">Projections</option>
        </select>
        <select
          className="toolbar-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | ReserveTransactionStatus);
            setPage(1);
          }}
        >
          <option value="ALL">All statuses</option>
          <option value="POSTED">Posted</option>
          <option value="PLANNED">Planned</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          className="toolbar-select"
          value={pageSize}
          onChange={(e) => {
            setPageSz(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button
          className="btn-ghost"
          onClick={() => {
            setSearch('');
            setTypeFilter('ALL');
            setStatusFilter('ALL');
            setPage(1);
          }}
        >
          Clear
        </button>
      </div>

      <div className="list-head">
        <div className="list-head-left">
          All Transactions
          <span>Type, status, category, dates, amount, and receipt activity</span>
        </div>
        <div className="list-head-right">
          {filtered.length > 0
            ? `Showing ${startIdx + 1}–${Math.min(filtered.length, startIdx + pageSize)} of ${filtered.length}`
            : 'No transactions'}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">
          No transactions found.
        </div>
      ) : (
        <div className="exp-list">
          {pageItems.map((transaction) => (
            <button
              key={transaction.transactionId}
              className="exp-row"
              onClick={() => openEdit(transaction)}
            >
              <div className={`exp-thumb ${transaction.receiptFile ? '' : 'no-receipt'}`}>
                {transaction.receiptFile ? 'Stored receipt' : transaction.type === 'PROJECTION' ? 'Projection' : 'No receipt'}
              </div>
              <div className="exp-content">
                <div className="exp-title">{transaction.title}</div>
                {transaction.description ? (
                  <div className="exp-desc">{transaction.description}</div>
                ) : null}
                <div className="exp-chips">
                  <span className={transactionChipClass(transaction.type)}>
                    {formatType(transaction.type)}
                  </span>
                  <span className={statusChipClass(transaction.status)}>
                    {formatStatus(transaction.status)}
                  </span>
                  <span className="exp-chip amount">${formatCurrency(transaction.amount)}</span>
                  <span className="exp-chip date">
                    {transaction.type === 'EXPENSE' ? 'Paid' : 'Expected'}: {formatDate(
                      transaction.type === 'EXPENSE'
                        ? transaction.transactionDate
                        : transaction.expectedDate,
                    )}
                  </span>
                  {transaction.category?.name ? (
                    <span className="exp-chip category-chip">{transaction.category.name}</span>
                  ) : null}
                  {transaction.receiptFile ? (
                    <span className="exp-chip receipt-yes">🧾 Receipt</span>
                  ) : (
                    <span className="exp-chip no-receipt">— No receipt</span>
                  )}
                </div>
              </div>
              <span className="exp-arrow">›</span>
            </button>
          ))}
        </div>
      )}

      <div className="exp-foot">
        <div className="page-info">
          Page {page} of {totalPages}
          {!loading ? (
            <span className="ml-3 font-black text-[#0b2b55]">
              Total: ${formatCurrency(totalAmount)}
            </span>
          ) : null}
        </div>
        <div className="pager">
          <button
            className="btn-ghost"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className="btn-ghost"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {drawer ? (
        <ExpenseDrawer
          mode={mode}
          transaction={active}
          saving={saving}
          toast={toast}
          categories={categories}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onReceiptAction={handleReceiptAction}
          onCreateCategory={handleCreateCategory}
        />
      ) : null}
    </>
  );
}
