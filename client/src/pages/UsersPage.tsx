import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './UsersPage.css';
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '../api/users';
import { getUnitOwners } from '../api/unitOwners';
import { getUnits } from '../api/units';
import type { UnitOwner } from '../types/unit-owner';
import type { Unit } from '../types/unit';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserRole,
} from '../types/user';

function isOwnershipActive(record: UnitOwner) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(record.startDate);
  start.setHours(0, 0, 0, 0);

  const end = record.endDate ? new Date(record.endDate) : null;
  if (end) {
    end.setHours(0, 0, 0, 0);
  }

  return start <= today && (!end || end >= today);
}

function UserDrawer({
  mode,
  user,
  linkedUnits,
  saving,
  deleting,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  mode: 'create' | 'edit';
  user: User | null;
  linkedUnits: string[];
  saving: boolean;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: CreateUserRequest | UpdateUserRequest) => void;
  onDelete: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('OWNER');
  const [active, setActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isEdit && user) {
      setEmail(user.email);
      setPassword('');
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone(user.phone ?? '');
      setRole(user.role);
      setActive(user.active);
    } else {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setRole('OWNER');
      setActive(true);
    }
    setFieldErrors({});
  }, [isEdit, user]);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    if (!isEdit && !password.trim()) nextErrors.password = 'Password is required.';
    if (!isEdit && password.trim() && password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (isEdit && password.trim() && password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      return;
    }

    const payload = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || null,
      role,
      active,
      ...(password.trim() ? { password: password.trim() } : {}),
    };

    onSave(
      isEdit
        ? (payload as UpdateUserRequest)
        : ({
            ...payload,
            phone: phone.trim() || undefined,
            password: password.trim(),
          } as CreateUserRequest),
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="users-drawer">
        <div className="users-drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? `${user?.firstName} ${user?.lastName}` : 'New User'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? `${user?.role} account • ${linkedUnits.length} active unit${linkedUnits.length === 1 ? '' : 's'}`
                : 'Create an admin or owner account'}
            </span>
          </div>
          <button className="users-x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="users-drawer-body">
          <div className="users-form-card">
            <div className="mb-[10px]">
              <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                {isEdit ? 'Edit User' : 'Create User'}
              </h3>
              <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                Owners are managed here as normal user accounts. Unit assignment stays on the Ownerships page.
              </p>
            </div>

            <div className="users-grid2">
              <div>
                <label className="users-form-label">First Name *</label>
                <input className="users-form-input" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                {fieldErrors.firstName ? <div className="users-field-err">{fieldErrors.firstName}</div> : null}
              </div>
              <div>
                <label className="users-form-label">Last Name *</label>
                <input className="users-form-input" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                {fieldErrors.lastName ? <div className="users-field-err">{fieldErrors.lastName}</div> : null}
              </div>
            </div>

            <div className="users-grid2 mt-[10px]">
              <div>
                <label className="users-form-label">Email *</label>
                <input className="users-form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                {fieldErrors.email ? <div className="users-field-err">{fieldErrors.email}</div> : null}
              </div>
              <div>
                <label className="users-form-label">Phone</label>
                <input className="users-form-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
            </div>

            <div className="users-grid2 mt-[10px]">
              <div>
                <label className="users-form-label">Role</label>
                <select className="users-form-select" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="users-form-label">Status</label>
                <select className="users-form-select" value={active ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setActive(event.target.value === 'ACTIVE')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-[10px]">
              <label className="users-form-label">
                Password{isEdit ? ' (leave blank to keep current)' : ' *'}
              </label>
              <input className="users-form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {fieldErrors.password ? <div className="users-field-err">{fieldErrors.password}</div> : null}
            </div>

            {linkedUnits.length ? (
              <div className="users-linked-units">
                <span className="users-linked-units-label">Active units</span>
                <div className="users-linked-units-list">
                  {linkedUnits.map((unitNumber) => (
                    <span key={unitNumber} className="users-linked-unit-pill">
                      Unit {unitNumber}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="users-field-err">{error}</div> : null}

            {isEdit ? (
              <div className="users-danger-wrap">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">
                      Delete this account if it is no longer needed.
                    </p>
                  </div>
                  <span className="users-admin-pill">Admin</span>
                </div>
                <div className="users-danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete User</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Account deletion does not replace ownership cleanup. Use the Ownerships page for unit links.
                    </small>
                  </div>
                  <button className="users-danger-btn" onClick={onDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="users-drawer-foot">
          <button className="users-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="users-btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState<'ALL' | UserRole>('ALL');
  const [statusF, setStatusF] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [allUsers, allOwnerships, allUnits] = await Promise.all([
        getUsers(),
        getUnitOwners(),
        getUnits(),
      ]);
      setUsers(allUsers);
      setUnitOwners(allOwnerships);
      setUnits(allUnits);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    function handleCreateEvent() {
      openCreate();
    }

    window.addEventListener('admin-users-create', handleCreateEvent);

    return () => {
      window.removeEventListener('admin-users-create', handleCreateEvent);
    };
  }, []);

  const activeOwnerships = useMemo(
    () => unitOwners.filter(isOwnershipActive),
    [unitOwners],
  );

  function getLinkedUnits(userId: string) {
    return activeOwnerships
      .filter((record) => record.userId === userId)
      .map((record) => units.find((unit) => unit.unitId === record.unitId)?.unitNumber ?? record.unitId)
      .sort();
  }

  const filteredUsers = users
    .filter((user) => {
      const query = search.trim().toLowerCase();
      const name = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        (!query ||
          name.includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone ?? '').toLowerCase().includes(query)) &&
        (roleF === 'ALL' || user.role === roleF) &&
        (statusF === 'ALL' ||
          (statusF === 'ACTIVE' ? user.active : !user.active))
      );
    })
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const ownerCount = users.filter((user) => user.role === 'OWNER').length;
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const activeCount = users.filter((user) => user.active).length;

  function openCreate() {
    setMode('create');
    setActiveUser(null);
    setDrawerError('');
    setDrawerOpen(true);
  }

  function openEdit(user: User) {
    setMode('edit');
    setActiveUser(user);
    setDrawerError('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveUser(null);
    setDrawerError('');
  }

  function getRequestErrorMessage(
    requestError: unknown,
    fallback: string,
  ) {
    if (axios.isAxiosError(requestError)) {
      const message = requestError.response?.data?.message;

      if (Array.isArray(message)) {
        return message.join(' ');
      }

      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (requestError instanceof Error && requestError.message.trim()) {
      return requestError.message;
    }

    return fallback;
  }

  async function handleSave(payload: CreateUserRequest | UpdateUserRequest) {
    try {
      setSaving(true);
      setDrawerError('');

      if (mode === 'create') {
        await createUser(payload as CreateUserRequest);
      } else if (activeUser) {
        await updateUser(activeUser.userId, payload as UpdateUserRequest);
      }

      closeDrawer();
      await loadAll();
    } catch (requestError) {
      setDrawerError(
        getRequestErrorMessage(
          requestError,
          mode === 'create'
            ? 'Could not create the user.'
            : 'Could not update the user.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeUser) {
      return;
    }

    if (!window.confirm(`Delete ${activeUser.firstName} ${activeUser.lastName}?`)) {
      return;
    }

    try {
      setDeleting(true);
      setDrawerError('');
      await deleteUser(activeUser.userId);
      closeDrawer();
      await loadAll();
    } catch {
      setDrawerError('Could not delete the user.');
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
              Users
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Manage all account types here, including owners. Unit assignment lives on the Ownerships page.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="users-summary-pill">
              {loading ? '—' : `${filteredUsers.length} users`}
            </span>
            <button className="users-btn-solid" onClick={openCreate}>
              + New User
            </button>
          </div>
        </div>

        {!loading ? (
          <div className="users-stats">
            <div className="users-stat-card">
              <p>Total users</p>
              <strong>{users.length}</strong>
            </div>
            <div className="users-stat-card">
              <p>Owners</p>
              <strong>{ownerCount}</strong>
            </div>
            <div className="users-stat-card">
              <p>Admins</p>
              <strong>{adminCount}</strong>
            </div>
            <div className="users-stat-card">
              <p>Active</p>
              <strong>{activeCount}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <div className="users-page-error">{error}</div> : null}

      <div className="users-toolbar">
        <div className="users-toolbar-field">
          <span className="shrink-0 text-[#64748b]">🔎</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone…"
          />
        </div>
        <select className="users-toolbar-select" value={roleF} onChange={(event) => setRoleF(event.target.value as 'ALL' | UserRole)}>
          <option value="ALL">All roles</option>
          <option value="OWNER">Owners</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select className="users-toolbar-select" value={statusF} onChange={(event) => setStatusF(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="users-btn-ghost" onClick={() => {
          setSearch('');
          setRoleF('ALL');
          setStatusF('ALL');
        }}>
          Clear
        </button>
      </div>

      <div className="users-list-wrap">
        {loading ? (
          <div className="users-empty">Loading users…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">No users matched the current filters.</div>
        ) : (
          <div className="users-list">
            {filteredUsers.map((user) => {
              const linkedUnits = getLinkedUnits(user.userId);
              return (
                <button
                  key={user.userId}
                  className="users-card"
                  onClick={() => openEdit(user)}
                >
                  <div className="users-card-main">
                    <div className="users-card-top">
                      <strong>{user.firstName} {user.lastName}</strong>
                      <span className={`users-role-pill ${user.role === 'ADMIN' ? 'is-admin' : 'is-owner'}`}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Owner'}
                      </span>
                    </div>
                    <p>{user.email}</p>
                    <span className="users-phone">{user.phone || 'No phone'}</span>
                    {linkedUnits.length ? (
                      <div className="users-linked-preview">
                        {linkedUnits.map((unitNumber) => (
                          <span key={unitNumber} className="users-linked-unit-pill">
                            Unit {unitNumber}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="users-no-units">
                        {user.role === 'OWNER' ? 'No active units linked' : 'No unit links for admins'}
                      </div>
                    )}
                  </div>
                  <div className="users-card-side">
                    <span className={`users-status-pill ${user.active ? 'is-active' : 'is-inactive'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="users-created">Created {user.createdAt.slice(0, 10)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {drawerOpen ? (
        <UserDrawer
          mode={mode}
          user={activeUser}
          linkedUnits={activeUser ? getLinkedUnits(activeUser.userId) : []}
          saving={saving}
          deleting={deleting}
          error={drawerError}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={() => void handleDelete()}
        />
      ) : null}
    </>
  );
}
