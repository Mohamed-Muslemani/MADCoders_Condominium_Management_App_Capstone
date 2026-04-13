import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './UnitsPage.css';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../../api/units';
import { getUnitOwners } from '../../api/unitOwners';
import type { Unit, CreateUnitRequest, UpdateUnitRequest, UnitStatus } from '../../types/unit';
import type { UnitOwner } from '../../types/unit-owner';

/* ── Status Pill ── */
function StatusPill({ status }: { status: UnitStatus }) {
  return (
    <span className={`status-pill ${status === 'ACTIVE' ? 'good' : 'bad'}`}>
      <span className="s-dot" />
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ── Drawer ── */
function UnitDrawer({
  mode, unit, saving, toast, onClose, onSave, onToggleStatus, onDelete,
}: {
  mode: 'create' | 'edit';
  unit: Unit | null;
  saving: boolean;
  toast: string;
  onClose: () => void;
  onSave: (d: CreateUnitRequest | UpdateUnitRequest) => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [unitNumber,   setUnitNumber]   = useState('');
  const [status,       setStatus]       = useState<UnitStatus>('ACTIVE');
  const [floor,        setFloor]        = useState('');
  const [bedrooms,     setBedrooms]     = useState('');
  const [bathrooms,    setBathrooms]    = useState('');
  const [squareFeet,   setSquareFeet]   = useState('');
  const [parkingSpots, setParkingSpots] = useState('');
  const [monthlyFee,   setMonthlyFee]   = useState('');
  const [notes,        setNotes]        = useState('');
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && unit) {
      setUnitNumber(unit.unitNumber);
      setStatus(unit.status);
      setFloor(unit.floor != null ? String(unit.floor) : '');
      setBedrooms(unit.bedrooms != null ? String(unit.bedrooms) : '');
      setBathrooms(unit.bathrooms != null ? String(unit.bathrooms) : '');
      setSquareFeet(unit.squareFeet != null ? String(unit.squareFeet) : '');
      setParkingSpots(unit.parkingSpots != null ? String(unit.parkingSpots) : '');
      setMonthlyFee(String(unit.monthlyFee));
      setNotes(unit.notes ?? '');
    } else {
      setUnitNumber(''); setStatus('ACTIVE');
      setFloor(''); setBedrooms(''); setBathrooms('');
      setSquareFeet(''); setParkingSpots(''); setMonthlyFee(''); setNotes('');
    }
    setErrors({});
  }, [mode, unit]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!unitNumber.trim()) errs.unitNumber = 'Unit number is required.';
    if (monthlyFee === '') errs.monthlyFee = 'Monthly fee is required.';
    else if (isNaN(Number(monthlyFee))) errs.monthlyFee = 'Must be a number.';
    else if (Number(monthlyFee) < 0) errs.monthlyFee = 'Cannot be negative.';
    if (floor !== '' && (isNaN(Number(floor)) || Number(floor) < 0)) errs.floor = 'Must be 0 or higher.';
    if (bedrooms !== '' && (isNaN(Number(bedrooms)) || Number(bedrooms) < 0)) errs.bedrooms = 'Must be 0 or higher.';
    if (bathrooms !== '' && isNaN(Number(bathrooms))) errs.bathrooms = 'Must be a number.';
    if (squareFeet !== '' && (isNaN(Number(squareFeet)) || Number(squareFeet) < 0)) errs.squareFeet = 'Must be 0 or higher.';
    if (parkingSpots !== '' && (isNaN(Number(parkingSpots)) || Number(parkingSpots) < 0)) errs.parkingSpots = 'Must be 0 or higher.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      unitNumber: unitNumber.trim(),
      status,
      monthlyFee: Number(monthlyFee),
      ...(floor        !== '' && { floor: Number(floor) }),
      ...(bedrooms     !== '' && { bedrooms: Number(bedrooms) }),
      ...(bathrooms    !== '' && { bathrooms: Number(bathrooms) }),
      ...(squareFeet   !== '' && { squareFeet: Number(squareFeet) }),
      ...(parkingSpots !== '' && { parkingSpots: Number(parkingSpots) }),
      ...(notes        && { notes }),
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

        {/* Head */}
        <div className="drawer-head">
          <div>
            <strong className="block text-[16px] font-black tracking-[-0.02em] text-[#0f172a]">
              {isEdit ? `Unit ${unit?.unitNumber}` : 'Create Unit'}
            </strong>
            <span className="mt-1 block text-[12px] leading-[1.35] text-[#64748b]">
              {isEdit
                ? [unit?.floor != null && `Floor ${unit.floor}`].filter(Boolean).join(' • ') || 'Edit unit details'
                : 'New unit entry'}
            </span>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {toast && <div className="drawer-toast">{toast}</div>}

          <div className="form-card">
            <div className="mb-[10px] flex items-start justify-between gap-[10px]">
              <div>
                <h3 className="m-0 text-[14px] font-black text-[#0f172a]">
                  {isEdit ? 'Edit Unit' : 'Create Unit'}
                </h3>
                <p className="m-0 mt-1 text-[12px] leading-[1.35] text-[#64748b]">
                  {isEdit
                    ? 'Update details and save. Use Danger Zone to deactivate or delete.'
                    : 'Unit number must be unique. Monthly fee must be a valid number ≥ 0.'}
                </p>
              </div>
            </div>

            {/* Unit Number + Status */}
            <div className="grid2">
              <div>
                <label className="form-label">Unit Number *</label>
                <input className="form-input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)} placeholder="e.g., A07-02" />
                {errors.unitNumber && <div className="field-err">{errors.unitNumber}</div>}
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as UnitStatus)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {/* Sq Ft + Floor */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Sq Ft</label>
                <input className="form-input" type="number" min="0" value={squareFeet} onChange={e => setSquareFeet(e.target.value)} placeholder="e.g., 950" />
                {errors.squareFeet && <div className="field-err">{errors.squareFeet}</div>}
              </div>
              <div>
                <label className="form-label">Floor</label>
                <input className="form-input" type="number" min="0" value={floor} onChange={e => setFloor(e.target.value)} placeholder="e.g., 7" />
                {errors.floor && <div className="field-err">{errors.floor}</div>}
              </div>
            </div>

            {/* Bedrooms + Bathrooms */}
            <div className="grid2 mt-[10px]">
              <div>
                <label className="form-label">Bedrooms</label>
                <input className="form-input" type="number" min="0" value={bedrooms} onChange={e => setBedrooms(e.target.value)} placeholder="e.g., 2" />
                {errors.bedrooms && <div className="field-err">{errors.bedrooms}</div>}
              </div>
              <div>
                <label className="form-label">Bathrooms</label>
                <input className="form-input" type="number" min="0" step="0.5" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="e.g., 1.5" />
                {errors.bathrooms && <div className="field-err">{errors.bathrooms}</div>}
              </div>
            </div>

            {/* Parking Spots */}
            <div className="mt-[10px]">
              <label className="form-label">Parking Spots</label>
              <input className="form-input" type="number" min="0" value={parkingSpots} onChange={e => setParkingSpots(e.target.value)} placeholder="e.g., 1" />
              {errors.parkingSpots && <div className="field-err">{errors.parkingSpots}</div>}
            </div>

            {/* Monthly Fee */}
            <div className="mt-[10px]">
              <label className="form-label">Monthly Fee ($) *</label>
              <input className="form-input" type="number" step="0.01" min="0" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} placeholder="e.g., 450.00" />
              {errors.monthlyFee && <div className="field-err">{errors.monthlyFee}</div>}
            </div>

            {/* Notes */}
            <div className="mt-[10px]">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
            </div>

            {/* Danger Zone */}
            {isEdit && unit && (
              <div className="danger-wrap">
                <div className="mb-[10px] flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 text-[13px] font-black tracking-[-0.01em] text-[#0f172a]">Danger Zone</h4>
                    <p className="m-0 mt-1 text-[12px] leading-[1.3] text-[#64748b]">Deactivate or permanently delete this unit.</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-[#fecaca] bg-[#fef2f2] px-[10px] py-[3px] text-[11px] font-black text-[#991b1b]">
                    Admin
                  </span>
                </div>
                <div className="danger-row">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">
                      {unit.status === 'ACTIVE' ? 'Deactivate Unit' : 'Activate Unit'}
                    </strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      {unit.status === 'ACTIVE' ? 'Marks the unit as inactive (stays in system).' : 'Re-activates this unit.'}
                    </small>
                  </div>
                  <button className="danger-btn" onClick={onToggleStatus}>
                    {unit.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="danger-row mt-[10px]">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">Delete Unit</strong>
                    <small className="mt-[3px] block text-[12px] leading-[1.25] text-[#64748b]">
                      Permanently removes this unit. Cannot be undone.
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
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-solid" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Unit'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export function UnitsPage() {
  const location = useLocation();

  const [units,      setUnits]      = useState<Unit[]>([]);
  const [unitOwners, setUnitOwners] = useState<UnitOwner[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [buildingF, setBuildingF] = useState('');
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSz]    = useState(25);
  const [sortKey,   setSortKey]   = useState<keyof Unit>('unitNumber');
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('asc');

  const [drawer, setDrawer] = useState(false);
  const [mode,   setMode]   = useState<'create'|'edit'>('create');
  const [active, setActive] = useState<Unit | null>(null);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 2200);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [u, o] = await Promise.all([getUnits(), getUnitOwners()]);
      setUnits(u);
      setUnitOwners(o);
    } catch { setError('Could not load units'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [location.key]);

  useEffect(() => {
    function handleCreateEvent() {
      openCreate();
    }

    window.addEventListener('admin-units-create', handleCreateEvent);

    return () => {
      window.removeEventListener('admin-units-create', handleCreateEvent);
    };
  }, []);

  function getOwnerName(unitId: string): string {
    const record = unitOwners.find(o => o.unitId === unitId && !o.endDate);
    return record ? `${record.user.firstName} ${record.user.lastName}` : 'No Owner';
  }

  const filtered = units
    .filter(u => {
      const s = search.toLowerCase();
      const ownerName = getOwnerName(u.unitId).toLowerCase();
      return (
        (!s ||
          u.unitNumber.toLowerCase().includes(s) ||
          (u.unitType ?? '').toLowerCase().includes(s) ||
          ownerName.includes(s)
        )
        && (!statusF || u.status === statusF)
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

  function handleSort(key: keyof Unit) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function openCreate() { setMode('create'); setActive(null); setDrawer(true); }
  function openEdit(u: Unit) { setMode('edit'); setActive(u); setDrawer(true); }
  function closeDrawer() { setDrawer(false); setActive(null); }

  async function handleSave(payload: CreateUnitRequest | UpdateUnitRequest) {
    try {
      setSaving(true);
      if (mode === 'create') {
        await createUnit(payload as CreateUnitRequest);
        showToast('Unit created successfully.');
        closeDrawer();
      } else if (active) {
        await updateUnit(active.unitId, payload as UpdateUnitRequest);
        const [fresh, owners] = await Promise.all([getUnits(), getUnitOwners()]);
        setUnits(fresh);
        setUnitOwners(owners);
        setActive(fresh.find(u => u.unitId === active.unitId) ?? null);
        showToast('Changes saved successfully.');
        closeDrawer(); 
        return;
      }
      await fetchAll();
    } catch { showToast('Something went wrong.'); }
    finally { setSaving(false); }
  }

  async function handleToggleStatus() {
    if (!active) return;
    const next: UnitStatus = active.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUnit(active.unitId, { status: next });
      const [fresh, owners] = await Promise.all([getUnits(), getUnitOwners()]);
      setUnits(fresh);
      setUnitOwners(owners);
      setActive(fresh.find(u => u.unitId === active.unitId) ?? null);
      showToast(next === 'INACTIVE' ? 'Unit deactivated.' : 'Unit activated.');
    } catch { showToast('Could not update status.'); }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm(`Delete unit ${active.unitNumber}? This cannot be undone.`)) return;
    try {
      await deleteUnit(active.unitId);
      await fetchAll();
      closeDrawer();
      showToast('Unit deleted.');
    } catch { showToast('Could not delete unit.'); }
  }

  function exportCSV() {
    const header = ['unitId','unitNumber','owner','floor','bedrooms','bathrooms','squareFeet','parkingSpots','monthlyFee','status'].join(',');
    const rows = filtered.map(u =>
      [u.unitId,`"${u.unitNumber}"`,`"${getOwnerName(u.unitId)}"`,u.floor??'',u.bedrooms??'',u.bathrooms??'',u.squareFeet??'',u.parkingSpots??'',u.monthlyFee,u.status].join(',')
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header,...rows].join('\n')],{type:'text/csv'}));
    a.download = 'units.csv'; a.click();
  }

  const fmtMoney = (n: string | number) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="rounded-[18px] border border-[#e5eaf3] p-[14px]"
        style={{ background: 'linear-gradient(180deg,#ffffff,#fbfcff)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
              Units Management
            </h2>
            <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
              Click a unit to view/edit details. Deactivate + Delete are inside the drawer (no actions column).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[6px] text-[12px] font-black text-[#64748b]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
              {loading ? '—' : `${filtered.length} units`}
            </span>
            <button className="btn-soft" onClick={exportCSV}>Export CSV</button>
            <button className="btn-solid" onClick={openCreate}>+ Create Unit</button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-3 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-black text-[#991b1b]">
          {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="units-toolbar">
        <div className="toolbar-field">
          <span className="shrink-0 text-[16px]">🔎</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by unit #, owner, attributes…"
          />
        </div>
        <select className="toolbar-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="toolbar-select" value={buildingF} onChange={e => { setBuildingF(e.target.value); setPage(1); }}>
          <option value="">All Buildings</option>
          <option value="A">Building A</option>
          <option value="B">Building B</option>
          <option value="C">Building C</option>
        </select>
        <select className="toolbar-select" value={pageSize} onChange={e => { setPageSz(Number(e.target.value)); setPage(1); }}>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button className="btn-ghost" onClick={() => { setSearch(''); setStatusF(''); setBuildingF(''); setPage(1); }}>
          Clear
        </button>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-[#64748b]">Loading…</div>
          ) : (
            <table className="units-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>
                    <button className="sort-btn" onClick={() => handleSort('unitNumber')}>Unit</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '18%' }}>
                    <button className="sort-btn" onClick={() => handleSort('floor')}>Location</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '28%' }}>Details</th>
                  <th style={{ width: '18%' }}>
                    <button className="sort-btn" onClick={() => handleSort('monthlyFee')}>Monthly Fee</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                  <th style={{ width: '16%' }}>
                    <button className="sort-btn" onClick={() => handleSort('status')}>Status</button>
                    <span className="ml-1.5 text-[10px] opacity-70">↕</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[13px] text-[#64748b]">
                      No units found.
                    </td>
                  </tr>
                ) : pageItems.map(u => (
                  <tr
                    key={u.unitId}
                    className="units-row"
                    onClick={() => openEdit(u)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openEdit(u);
                      }
                    }}
                  >
                    <td>
                      <div className="unit-link">
                        <div className="cell-title">{u.unitNumber}</div>
                        <div className="cell-sub">{getOwnerName(u.unitId)}</div>
                      </div>
                    </td>
                    <td>
                      {u.floor != null ? (
                        <>
                          <div className="cell-title" style={{ color: '#0f172a' }}>Floor {u.floor}</div>
                          {u.unitType && <div className="cell-sub">{u.unitType}</div>}
                        </>
                      ) : (
                        <div className="cell-sub">{u.unitType || '—'}</div>
                      )}
                    </td>
                    <td>
                      <div className="details-title">
                        {[
                          u.bedrooms  != null && `${u.bedrooms}BR`,
                          u.bathrooms != null && `${u.bathrooms}BA`,
                          u.squareFeet != null && `${u.squareFeet} sq ft`,
                        ].filter(Boolean).join(' • ') || '—'}
                      </div>
                      {u.parkingSpots != null && u.parkingSpots > 0 && (
                        <div className="kv">
                          <span>{u.parkingSpots} parking</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="money">${fmtMoney(u.monthlyFee)}</div>
                      <div className="cell-sub">per month</div>
                    </td>
                    <td>
                      <StatusPill status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Table Footer ── */}
        <div className="table-foot">
          <div className="page-info">
            {filtered.length > 0
              ? `Showing ${startIdx + 1}–${Math.min(filtered.length, startIdx + pageSize)} of ${filtered.length}`
              : 'Showing 0–0 of 0'}
          </div>
          <div className="pager">
            <button
              className="btn-ghost"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-ghost"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <UnitDrawer
          mode={mode}
          unit={active}
          saving={saving}
          toast={toast}
          onClose={closeDrawer}
          onSave={handleSave}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
