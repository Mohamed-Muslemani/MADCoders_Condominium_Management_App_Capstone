import { useCallback, useEffect, useMemo, useState } from 'react';
import './ExpenseCategoriesPage.css';
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
} from '../../api/expenseCategories';
import type {
  CreateExpenseCategoryRequest,
  ExpenseCategory,
  UpdateExpenseCategoryRequest,
} from '../../types/expense-category';

function CategoryDrawer({
  mode,
  category,
  saving,
  deleting,
  toast,
  onClose,
  onSave,
  onDelete,
}: {
  mode: 'create' | 'edit';
  category: ExpenseCategory | null;
  saving: boolean;
  deleting: boolean;
  toast: string;
  onClose: () => void;
  onSave: (payload: CreateExpenseCategoryRequest | UpdateExpenseCategoryRequest) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && category) {
      setName(category.name);
      setDescription(category.description ?? '');
    } else {
      setName('');
      setDescription('');
    }
    setErrors({});
  }, [category, isEdit]);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Category name is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="expense-categories-drawer">
        <div className="expense-categories-drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? category?.name : 'New Expense Category'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? `${category?._count.transactions ?? 0} linked transaction${category?._count.transactions === 1 ? '' : 's'}`
                : 'Create a category for reserve expenses'}
            </span>
          </div>
          <button className="expense-categories-x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="expense-categories-drawer-body">
          {toast ? <div className="expense-categories-drawer-toast">{toast}</div> : null}

          <div className="expense-categories-form-card">
            <div className="mb-[10px]">
              <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                {isEdit ? 'Edit Category' : 'Create Category'}
              </h3>
              <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                Keep names clear and reusable for reserve transaction tagging.
              </p>
            </div>

            <div>
              <label className="expense-categories-form-label">Name *</label>
              <input
                className="expense-categories-form-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Roofing"
              />
              {errors.name ? <div className="expense-categories-field-err">{errors.name}</div> : null}
            </div>

            <div className="mt-[10px]">
              <label className="expense-categories-form-label">Description</label>
              <textarea
                className="expense-categories-form-textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes about when this category should be used."
              />
            </div>

            {isEdit ? (
              <div className="expense-categories-danger-wrap">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                      Delete categories that are no longer needed.
                    </p>
                  </div>
                  <span className="expense-categories-admin-pill">Admin</span>
                </div>

                <div className="expense-categories-danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete Category</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Categories with linked transactions cannot be deleted.
                    </small>
                  </div>
                  <button
                    className="expense-categories-danger-btn"
                    onClick={onDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="expense-categories-drawer-foot">
          <button className="expense-categories-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="expense-categories-btn-solid"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </>
  );
}

export function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setCategories(await getExpenseCategories());
    } catch {
      setError('Could not load expense categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    function handleCreateEvent() {
      openCreate();
    }

    window.addEventListener('admin-categories-create', handleCreateEvent);

    return () => {
      window.removeEventListener('admin-categories-create', handleCreateEvent);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      if (!query) {
        return true;
      }

      return (
        category.name.toLowerCase().includes(query) ||
        (category.description ?? '').toLowerCase().includes(query)
      );
    });
  }, [categories, search]);

  const totalTransactions = filteredCategories.reduce(
    (sum, category) => sum + category._count.transactions,
    0,
  );

  function openCreate() {
    setMode('create');
    setActiveCategory(null);
    setDrawerOpen(true);
  }

  function openEdit(category: ExpenseCategory) {
    setMode('edit');
    setActiveCategory(category);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveCategory(null);
  }

  async function handleSave(
    payload: CreateExpenseCategoryRequest | UpdateExpenseCategoryRequest,
  ) {
    try {
      setSaving(true);
      setError('');

      if (mode === 'create') {
        await createExpenseCategory(payload as CreateExpenseCategoryRequest);
        showToast('Category created.');
      } else if (activeCategory) {
        await updateExpenseCategory(
          activeCategory.categoryId,
          payload as UpdateExpenseCategoryRequest,
        );
        showToast('Category updated.');
      }

      closeDrawer();
      await loadCategories();
    } catch {
      setError(
        mode === 'create'
          ? 'Could not create the category.'
          : 'Could not update the category.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeCategory) {
      return;
    }

    if (!window.confirm(`Delete ${activeCategory.name}?`)) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      await deleteExpenseCategory(activeCategory.categoryId);
      closeDrawer();
      await loadCategories();
      showToast('Category deleted.');
    } catch {
      setError(
        'Could not delete the category. Categories with linked transactions must stay in place.',
      );
    } finally {
      setDeleting(false);
    }
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
              Expense Categories
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Organize reserve expenses with reusable categories and track how widely each one is used.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="expense-categories-summary-pill">
              {loading ? '—' : `${filteredCategories.length} categories`}
            </span>
            <button className="expense-categories-btn-solid" onClick={openCreate}>
              + New Category
            </button>
          </div>
        </div>

        {!loading ? (
          <div className="expense-categories-stats">
            <div className="expense-categories-stat-card">
              <p>Total categories</p>
              <strong>{categories.length}</strong>
            </div>
            <div className="expense-categories-stat-card">
              <p>Visible now</p>
              <strong>{filteredCategories.length}</strong>
            </div>
            <div className="expense-categories-stat-card">
              <p>Linked transactions</p>
              <strong>{totalTransactions}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="expense-categories-page-error">
          {error}
        </div>
      ) : null}

      <div className="expense-categories-toolbar">
        <div className="expense-categories-toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by category name or description…"
          />
        </div>
        <button
          className="expense-categories-btn-ghost"
          onClick={() => setSearch('')}
        >
          Clear
        </button>
      </div>

      <div className="expense-categories-list-wrap">
        {loading ? (
          <div className="expense-categories-empty">Loading categories…</div>
        ) : filteredCategories.length === 0 ? (
          <div className="expense-categories-empty">
            {search
              ? 'No categories matched your search.'
              : 'No expense categories yet.'}
          </div>
        ) : (
          <div className="expense-categories-list">
            {filteredCategories.map((category) => (
              <button
                key={category.categoryId}
                className="expense-categories-card"
                onClick={() => openEdit(category)}
              >
                <div className="expense-categories-card-main">
                  <strong>{category.name}</strong>
                  <p>{category.description || 'No description provided.'}</p>
                </div>
                <div className="expense-categories-card-side">
                  <span className="expense-categories-usage-pill">
                    {category._count.transactions} transaction{category._count.transactions === 1 ? '' : 's'}
                  </span>
                  <span className="expense-categories-date">
                    Added {category.createdAt.slice(0, 10)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {drawerOpen ? (
        <CategoryDrawer
          mode={mode}
          category={activeCategory}
          saving={saving}
          deleting={deleting}
          toast={toast}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
