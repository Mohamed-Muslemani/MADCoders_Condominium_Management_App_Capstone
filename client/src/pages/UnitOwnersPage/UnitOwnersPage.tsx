import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './UnitOwnersPage.css';
import { getUnitOwners, createUnitOwner, deleteUnitOwner } from '../../api/unitOwners';
import { getUnits } from '../../api/units';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import type { UnitOwner } from '../../types/unit-owner';
import type { Unit } from '../../types/unit';
import type { User } from '../../types/user';

/* ── helpers ── */
function initials(firstName: string, lastName: string) {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || 'O';
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`status-badge ${active ? 'good' : 'bad'}`}>
      <span className="b-dot" />
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

/* ══════════════════════════════════════
   CREATE OWNER DRAWER
══════════════════════════════════════ */
function CreateOwnerDrawer({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (user: User) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim())  errs.lastName  = 'Last name is required.';
    if (!email.trim())     errs.email     = 'Email is required.';
    if (!password.trim())  errs.password  = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    try {
      setSaving(true);
      const user = await createUser({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        phone:     phone.trim() || undefined,
        password:  password,
        role:      'OWNER',
        active:    true,
      });
      onCreated(user);
    } catch {
      setErrors(e => ({ ...e, email: 'Could not create owner. Email may already exist.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <div className="create-drawer">
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              Create Owner
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              New owner account
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="detail-card">
            <div className="card-head">
              <div>
                <h4>Owner Info</h4>
                <p>Email must be unique. Password min 6 characters.</p>
              </div>
            </div>

            <div className="grid2">
              <div>
                <label className="form-label">First Name *</label>
                <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g., Sarah" />
                {errors.firstName && <div className="field-err">{errors.firstName}</div>}
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g., Ahmed" />
                {errors.lastName && <div className="field-err">{errors.lastName}</div>}
              </div>
            </div>

            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., sarah@mail.com" />
                {errors.email && <div className="field-err">{errors.email}</div>}
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., (519) 555-1133" />
              </div>
            </div>

            <div className="mt-[10px]">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
              {errors.password && <div className="field-err">{errors.password}</div>}
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-solid" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Owner'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   DETAIL PANEL
══════════════════════════════════════ */
function OwnerDetail({
  user, unitOwners, units, onUpdated, onDeleted, onAssign, onUnassign, toast,
}: {
  user: User;
  unitOwners: UnitOwner[];
  units: Unit[];
  onUpdated: (u: User) => void;
  onDeleted: () => void;
  onAssign: (unitId: string) => void;
  onUnassign: (unitOwnerId: string) => void;
  toast: string;
}) {
  const [firstName,  setFirstName]  = useState(user.firstName);
  const [lastName,   setLastName]   = useState(user.lastName);
  const [email,      setEmail]      = useState(user.email);
  const [phone,      setPhone]      = useState(user.phone ?? '');
  const [active,     setActive]     = useState(user.active);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [unitSearch, setUnitSearch] = useState('');

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setActive(user.active);
    setErrors({});
  }, [user.userId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim())  errs.lastName  = 'Last name is required.';
    if (!email.trim())     errs.email     = 'Email is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      setSaving(true);
      const updated = await updateUser(user.userId, {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        phone:     phone.trim() || null,
        active,
      });
      onUpdated(updated);
    } catch {
      setErrors(e => ({ ...e, email: 'Could not save. Email may already exist.' }));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    try {
      const updated = await updateUser(user.userId, { active: !active });
      setActive(!active);
      onUpdated(updated);
    } catch {}
  }

  async function handleDelete() {
    if (!window.confirm(`Delete owner "${user.firstName} ${user.lastName}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.userId);
      onDeleted();
    } catch {}
  }

  const assignedOwnerRecords = unitOwners.filter(o => o.userId === user.userId);
  const assignedUnitIds = new Set(assignedOwnerRecords.map(o => o.unitId));
  const unitsCount = assignedOwnerRecords.length;

  const unitResults = units
    .filter(u => {
      const q = unitSearch.toLowerCase();
      return !q || u.unitNumber.toLowerCase().includes(q);
    })
    .slice(0, 25);

  return (
    <div className="detail-panel">
      {toast && <div className="detail-toast">{toast}</div>}

      {/* Profile card */}
      <div className="detail-card">
        <div className="card-head">
          <div>
            <h4>Owner Profile</h4>
            <p>Edit owner info. Email must be unique.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="o-units-count">{unitsCount} units</span>
            <StatusBadge active={active} />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="form-label">First Name *</label>
            <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g., Sarah" />
            {errors.firstName && <div className="field-err">{errors.firstName}</div>}
          </div>
          <div>
            <label className="form-label">Last Name *</label>
            <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g., Ahmed" />
            {errors.lastName && <div className="field-err">{errors.lastName}</div>}
          </div>
        </div>

        <div className="grid2 mt-[10px]">
          <div>
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., sarah@mail.com" />
            {errors.email && <div className="field-err">{errors.email}</div>}
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., (519) 555-1133" />
          </div>
        </div>

        <div className="grid2 mt-[10px]">
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={active ? 'ACTIVE' : 'INACTIVE'} onChange={e => setActive(e.target.value === 'ACTIVE')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Disabled</option>
            </select>
          </div>
          <div>
            <label className="form-label">Quick Toggle</label>
            <button className="btn-ghost" style={{ width: '100%' }} onClick={handleToggle}>
              {active ? 'Disable Owner' : 'Enable Owner'}
            </button>
          </div>
        </div>

        <div className="actions-row">
          <button className="btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn-danger" onClick={handleDelete}>Delete Owner</button>
        </div>
      </div>

      {/* Unit ownership card */}
      <div className="detail-card">
        <div className="card-head">
          <div>
            <h4>Unit Ownership</h4>
            <p>Search a unit and click Assign to link it to this owner.</p>
          </div>
        </div>

        <div className="section-head">
          <h5>Assigned Units</h5>
          <span>Search + Assign below</span>
        </div>

        <div className="assigned-chips">
          {assignedOwnerRecords.length === 0 ? (
            <span className="chip-empty">No units assigned</span>
          ) : assignedOwnerRecords.map(record => {
            const u = units.find(x => x.unitId === record.unitId);
            return (
              <span key={record.unitOwnerId} className="chip-unit">
                {u?.unitNumber ?? record.unitId}
                <button onClick={() => onUnassign(record.unitOwnerId)}>✕</button>
              </span>
            );
          })}
        </div>

        <div className="assign-box">
          <div className="assign-search">
            <span className="text-[#64748b]">🔎</span>
            <input
              value={unitSearch}
              onChange={e => setUnitSearch(e.target.value)}
              placeholder="Search unit # (e.g., A07-02)…"
            />
          </div>
          <div className="assign-results">
            {unitResults.length === 0 ? (
              <div className="unit-result-row">
                <div className="unit-result-meta">
                  <div className="t" style={{ color: '#64748b' }}>No matching units</div>
                </div>
              </div>
            ) : unitResults.map(u => (
              <div key={u.unitId} className="unit-result-row">
                <div className="unit-result-meta">
                  <div className="t">{u.unitNumber}</div>
                  <div className="s">
                    {u.floor != null ? `Floor ${u.floor}` : ''}
                    {u.unitType ? ` • ${u.unitType}` : ''}
                  </div>
                </div>
                {assignedUnitIds.has(u.unitId) ? (
                  <span className="chip-assigned">Assigned</span>
                ) : (
                  <button className="btn-small" onClick={() => onAssign(u.unitId)}>
                    Assign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function UnitOwnersPage() {
  const location = useLocation();

  const [users,      setUsers]      = useState<User[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [page,      setPage]      = useState(1);
  const pageSize = 25;

  const [selectedUserId,    setSelectedUserId]    = useState<string | null>(null);
  const [showCreate,        setShowCreate]        = useState(false);
  const [showMobileDetail,  setShowMobileDetail]  = useState(false);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [u, o, un] = await Promise.all([getUsers(), getUnitOwners(), getUnits()]);
      setUsers(u.filter(x => x.role === 'OWNER'));
      setUnitOwners(o);
      setUnits(un);
    } catch { setError('Could not load owners'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  const filtered = users
    .filter(u => {
      const s = search.toLowerCase();
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        (!s || name.includes(s) || u.email.toLowerCase().includes(s) || (u.phone ?? '').includes(s))
        && (statusF === '' || (statusF === 'active' ? u.active : !u.active))
      );
    })
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx   = (page - 1) * pageSize;
  const pageItems  = filtered.slice(startIdx, startIdx + pageSize);

  function countUnits(userId: string) {
    return unitOwners.filter(o => o.userId === userId && !o.endDate).length;
  }

  const selectedUser = users.find(u => u.userId === selectedUserId) ?? null;

  async function handleAssign(unitId: string) {
    if (!selectedUserId) return;
    try {
      const record = await createUnitOwner({
        unitId,
        userId: selectedUserId,
        startDate: new Date().toISOString().slice(0, 10),
      });
      setUnitOwners(prev => [...prev, record]);
      showToast('Unit assigned.');
    } catch { showToast('Could not assign unit.'); }
  }

  async function handleUnassign(unitOwnerId: string) {
    try {
      await deleteUnitOwner(unitOwnerId);
      setUnitOwners(prev => prev.filter(o => o.unitOwnerId !== unitOwnerId));
      showToast('Unit removed.');
    } catch { showToast('Could not remove unit.'); }
  }

  function handleUpdated(updated: User) {
    setUsers(prev => prev.map(u => u.userId === updated.userId ? updated : u));
    setShowMobileDetail(false);
    showToast('Owner saved successfully.');
  }

  function handleDeleted() {
    setUsers(prev => prev.filter(u => u.userId !== selectedUserId));
    setUnitOwners(prev => prev.filter(o => o.userId !== selectedUserId));
    setSelectedUserId(null);
    setShowMobileDetail(false);
    showToast('Owner deleted.');
  }

  function handleCreated(user: User) {
    setUsers(prev => [user, ...prev]);
    setSelectedUserId(user.userId);
    setShowCreate(false);
    showToast('Owner created successfully.');
  }

  function exportCSV() {
    const header = ['userId','firstName','lastName','email','phone','active','units'].join(',');
    const rows = filtered.map(u =>
      [u.userId, `"${u.firstName}"`, `"${u.lastName}"`, `"${u.email}"`, `"${u.phone ?? ''}"`, u.active, countUnits(u.userId)].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }));
    a.download = 'owners.csv'; a.click();
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
              Owners Management
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Create owners, store contact info, toggle Active/Disabled, and assign units.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} owners`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={() => setShowCreate(true)}>+ Create Owner</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Split ── */}
      <div className="owners-split">

        {/* LEFT — list */}
        <div className="owners-panel">
          <div className="panel-head">
            <h3>Owners</h3>
            <span>{filtered.length} total</span>
          </div>

          <div className="owners-toolbar">
            <div className="toolbar-field">
              <span className="shrink-0">🔎</span>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email, phone…"
              />
            </div>
            <select className="toolbar-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <button className="btn-ghost" onClick={() => { setSearch(''); setStatusF(''); setPage(1); }}>
              Clear
            </button>
          </div>

          <div className="owners-list">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-[13px] text-[#64748b]">Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="detail-card">
                <div className="card-head">
                  <div>
                    <h4>No owners found</h4>
                    <p>Try a different search or clear filters.</p>
                  </div>
                </div>
              </div>
            ) : pageItems.map(u => (
              <div
                key={u.userId}
                className={`owner-row ${selectedUserId === u.userId ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedUserId(u.userId);
                  if (window.innerWidth <= 980) setShowMobileDetail(true);
                }}
              >
                <div className="o-left">
                  <div className="o-avatar">{initials(u.firstName, u.lastName)}</div>
                  <div className="o-meta">
                    <div className="o-name">{u.firstName} {u.lastName}</div>
                    <div className="o-email">{u.email}</div>
                    <div className="o-phone">📞 {u.phone || '—'}</div>
                  </div>
                </div>
                <div className="o-right">
                  <span className="o-units-count">{countUnits(u.userId)} units</span>
                  <StatusBadge active={u.active} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="owners-foot">
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

        {/* RIGHT — desktop detail */}
        <div className="owners-panel detail-panel-desktop">
          <div className="panel-head">
            <h3>Owner Details</h3>
            <span>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Click an owner'}</span>
          </div>
          {!selectedUser ? (
            <div className="detail-empty">
              <span className="text-[32px]">👤</span>
              <span>Select an owner from the list to view and edit details.</span>
            </div>
          ) : (
            <OwnerDetail
              key={selectedUser.userId}
              user={selectedUser}
              unitOwners={unitOwners}
              units={units}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              toast={toast}
            />
          )}
        </div>
      </div>

      {/* ── Mobile detail drawer ── */}
      {showMobileDetail && selectedUser && (
        <>
          <div
            className="fixed inset-0 z-[80]"
            style={{ background: 'rgba(2,6,23,0.45)' }}
            onClick={() => setShowMobileDetail(false)}
          />
          <div className="create-drawer">
            <div className="drawer-head">
              <div>
                <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
                  {selectedUser.firstName} {selectedUser.lastName}
                </strong>
                <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
                  {selectedUser.email}
                </span>
              </div>
              <button className="x-btn" onClick={() => setShowMobileDetail(false)}>✕</button>
            </div>
            <OwnerDetail
              key={selectedUser.userId + '-mobile'}
              user={selectedUser}
              unitOwners={unitOwners}
              units={units}
              onUpdated={(u) => { handleUpdated(u); }}
              onDeleted={() => { handleDeleted(); setShowMobileDetail(false); }}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              toast={toast}
            />
          </div>
        </>
      )}

      {/* ── Create drawer ── */}
      {showCreate && (
        <CreateOwnerDrawer
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}