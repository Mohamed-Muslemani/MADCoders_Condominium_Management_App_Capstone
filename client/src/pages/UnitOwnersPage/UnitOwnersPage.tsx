import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './UnitOwnersPage.css';
import {
  createUnitOwner,
  deleteUnitOwner,
  getUnitOwners,
} from '../../api/unitOwners';
import { getUnits } from '../../api/units';
import { getUsers } from '../../api/users';
import type { UnitOwner } from '../../types/unit-owner';
import type { Unit } from '../../types/unit';
import type { User } from '../../types/user';

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

function OwnershipDetail({
  user,
  unitOwners,
  units,
  toast,
  onAssign,
  onUnassign,
}: {
  user: User;
  unitOwners: UnitOwner[];
  units: Unit[];
  toast: string;
  onAssign: (unitId: string) => void;
  onUnassign: (unitOwnerId: string) => void;
}) {
  const [unitSearch, setUnitSearch] = useState('');

  const ownerRecords = useMemo(
    () => unitOwners.filter((record) => record.userId === user.userId),
    [unitOwners, user.userId],
  );

  const activeRecords = ownerRecords.filter(isOwnershipActive);
  const assignedUnitIds = new Set(activeRecords.map((record) => record.unitId));

  const unitResults = units
    .filter((unit) =>
      unit.unitNumber.toLowerCase().includes(unitSearch.trim().toLowerCase()),
    )
    .slice(0, 25);

  return (
    <div className="detail-panel">
      {toast ? <div className="detail-toast">{toast}</div> : null}

      <div className="detail-card">
        <div className="card-head">
          <div>
            <h4>Owner Summary</h4>
            <p>Account edits now live on the Users page. This workspace is for ownership assignments only.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="o-units-count">{activeRecords.length} active units</span>
            <StatusBadge active={user.active} />
          </div>
        </div>

        <div className="ownership-summary-grid">
          <div className="ownership-summary-item">
            <span>Name</span>
            <strong>{user.firstName} {user.lastName}</strong>
          </div>
          <div className="ownership-summary-item">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="ownership-summary-item">
            <span>Phone</span>
            <strong>{user.phone || '—'}</strong>
          </div>
          <div className="ownership-summary-item">
            <span>Status</span>
            <strong>{user.active ? 'Active' : 'Disabled'}</strong>
          </div>
        </div>
      </div>

      <div className="detail-card">
        <div className="card-head">
          <div>
            <h4>Ownership Assignments</h4>
            <p>Assign active units to this owner or remove existing links.</p>
          </div>
        </div>

        <div className="section-head">
          <h5>Assigned Units</h5>
          <span>{ownerRecords.length} total records</span>
        </div>

        <div className="assigned-chips">
          {ownerRecords.length === 0 ? (
            <span className="chip-empty">No unit ownerships assigned</span>
          ) : (
            ownerRecords.map((record) => {
              const unit = units.find((item) => item.unitId === record.unitId);
              return (
                <span key={record.unitOwnerId} className="chip-unit">
                  {unit?.unitNumber ?? record.unitId}
                  <span className="chip-unit-meta">
                    {isOwnershipActive(record) ? 'Active' : 'Ended'}
                  </span>
                  <button onClick={() => onUnassign(record.unitOwnerId)}>✕</button>
                </span>
              );
            })
          )}
        </div>

        <div className="assign-box">
          <div className="assign-search">
            <span className="text-[#64748b]">🔎</span>
            <input
              value={unitSearch}
              onChange={(event) => setUnitSearch(event.target.value)}
              placeholder="Search unit number…"
            />
          </div>
          <div className="assign-results">
            {unitResults.length === 0 ? (
              <div className="unit-result-row">
                <div className="unit-result-meta">
                  <div className="t" style={{ color: '#64748b' }}>No matching units</div>
                </div>
              </div>
            ) : (
              unitResults.map((unit) => (
                <div key={unit.unitId} className="unit-result-row">
                  <div className="unit-result-meta">
                    <div className="t">{unit.unitNumber}</div>
                    <div className="s">
                      {unit.floor != null ? `Floor ${unit.floor}` : ''}
                      {unit.unitType ? ` • ${unit.unitType}` : ''}
                    </div>
                  </div>
                  {assignedUnitIds.has(unit.unitId) ? (
                    <span className="chip-assigned">Assigned</span>
                  ) : (
                    <button className="btn-small" onClick={() => onAssign(unit.unitId)}>
                      Assign
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnitOwnersPage() {
  const location = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const pageSize = 25;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [allUsers, ownerships, allUnits] = await Promise.all([
        getUsers(),
        getUnitOwners(),
        getUnits(),
      ]);
      setUsers(allUsers.filter((user) => user.role === 'OWNER'));
      setUnitOwners(ownerships);
      setUnits(allUnits);
    } catch {
      setError('Could not load ownership records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, location.key]);

  const filtered = users
    .filter((user) => {
      const query = search.trim().toLowerCase();
      const name = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        (!query ||
          name.includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone ?? '').toLowerCase().includes(query)) &&
        (statusF === '' || (statusF === 'active' ? user.active : !user.active))
      );
    })
    .sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  function countUnits(userId: string) {
    return unitOwners.filter(
      (record) => record.userId === userId && isOwnershipActive(record),
    ).length;
  }

  const selectedUser =
    users.find((user) => user.userId === selectedUserId) ?? null;

  async function handleAssign(unitId: string) {
    if (!selectedUserId) {
      return;
    }

    try {
      const record = await createUnitOwner({
        unitId,
        userId: selectedUserId,
        startDate: new Date().toISOString().slice(0, 10),
      });
      setUnitOwners((current) => [...current, record]);
      showToast('Ownership assigned.');
    } catch {
      showToast('Could not assign ownership.');
    }
  }

  async function handleUnassign(unitOwnerId: string) {
    try {
      await deleteUnitOwner(unitOwnerId);
      setUnitOwners((current) =>
        current.filter((record) => record.unitOwnerId !== unitOwnerId),
      );
      showToast('Ownership removed.');
    } catch {
      showToast('Could not remove ownership.');
    }
  }

  function exportCSV() {
    const rows = unitOwners
      .filter((record) =>
        filtered.some((user) => user.userId === record.userId),
      )
      .map((record) => {
        const owner = users.find((user) => user.userId === record.userId);
        const unit = units.find((item) => item.unitId === record.unitId);
        return [
          `"${owner ? `${owner.firstName} ${owner.lastName}` : record.userId}"`,
          `"${owner?.email ?? ''}"`,
          `"${unit?.unitNumber ?? record.unitId}"`,
          `"${record.startDate.slice(0, 10)}"`,
          `"${record.endDate?.slice(0, 10) ?? ''}"`,
          `"${isOwnershipActive(record) ? 'ACTIVE' : 'ENDED'}"`,
        ].join(',');
      });

    const header = [
      'owner_name',
      'owner_email',
      'unit_number',
      'start_date',
      'end_date',
      'status',
    ].join(',');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([[header, ...rows].join('\n')], { type: 'text/csv' }),
    );
    link.download = 'ownerships.csv';
    link.click();
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
              Ownerships
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Manage which owner accounts are linked to which units. User account creation and editing now happens on the Users page.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} owners`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      ) : null}

      <div className="owners-split">
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
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search owner name, email, phone…"
              />
            </div>
            <select
              className="toolbar-select"
              value={statusF}
              onChange={(event) => {
                setStatusF(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <button
              className="btn-ghost"
              onClick={() => {
                setSearch('');
                setStatusF('');
                setPage(1);
              }}
            >
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
            ) : (
              pageItems.map((user) => (
                <div
                  key={user.userId}
                  className={`owner-row ${selectedUserId === user.userId ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedUserId(user.userId);
                    if (window.innerWidth <= 980) {
                      setShowMobileDetail(true);
                    }
                  }}
                >
                  <div className="o-left">
                    <div className="o-avatar">{initials(user.firstName, user.lastName)}</div>
                    <div className="o-meta">
                      <div className="o-name">{user.firstName} {user.lastName}</div>
                      <div className="o-email">{user.email}</div>
                      <div className="o-phone">📞 {user.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="o-right">
                    <span className="o-units-count">{countUnits(user.userId)} units</span>
                    <StatusBadge active={user.active} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="owners-foot">
            <div className="page-info">
              {filtered.length > 0
                ? `Showing ${startIdx + 1}–${Math.min(filtered.length, startIdx + pageSize)} of ${filtered.length}`
                : 'Showing 0–0 of 0'}
            </div>
            <div className="pager">
              <button className="btn-ghost" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="btn-ghost" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</button>
            </div>
          </div>
        </div>

        <div className="owners-panel detail-panel-desktop">
          <div className="panel-head">
            <h3>Ownership Details</h3>
            <span>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Click an owner'}</span>
          </div>
          {!selectedUser ? (
            <div className="detail-empty">
              <span className="text-[32px]">🏠</span>
              <span>Select an owner to manage unit assignments.</span>
            </div>
          ) : (
            <OwnershipDetail
              key={selectedUser.userId}
              user={selectedUser}
              unitOwners={unitOwners}
              units={units}
              toast={toast}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
            />
          )}
        </div>
      </div>

      {showMobileDetail && selectedUser ? (
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
                  Ownership assignments
                </span>
              </div>
              <button className="x-btn" onClick={() => setShowMobileDetail(false)}>✕</button>
            </div>

            <OwnershipDetail
              key={selectedUser.userId}
              user={selectedUser}
              unitOwners={unitOwners}
              units={units}
              toast={toast}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
