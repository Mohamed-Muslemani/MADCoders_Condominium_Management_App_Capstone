import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './DashboardPage.css';
import { getUnits } from '../../api/units';
import { getUnitOwners } from '../../api/unitOwners';
import { getUnitDues } from '../../api/unitDues';
import { getMaintenanceRequests } from '../../api/maintenanceRequests';
import { getAnnouncements } from '../../api/announcements';
import { getReserveTransactions } from '../../api/reserveTransactions';
import type { Unit } from '../../types/unit';
import type { UnitOwner } from '../../types/unit-owner';
import type { UnitDue } from '../../types/unit-due';
import type { MaintenanceRequest } from '../../types/maintenance-request';
import type { Announcement } from '../../types/announcement';
import type { ReserveTransaction } from '../../types/reserve-transaction';

function PanelHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-[10px] flex items-end justify-between gap-[10px]">
      <h3 className="m-0 text-[14px] font-black text-[#0f172a]">{title}</h3>
      <span className="text-[12px] text-[#64748b]">{sub}</span>
    </div>
  );
}

function Prio({ level }: { level: string }) {
  const label = level === 'HIGH' ? 'High' : level === 'MEDIUM' ? 'Medium' : 'Low';
  return (
    <span className={`prio-${level} inline-flex shrink-0 items-center rounded-full border px-[10px] py-1 text-[12px] font-black whitespace-nowrap`}>
      {label}
    </span>
  );
}

export function DashboardPage() {
  const location        = useLocation();
  const reserveRef      = useRef<HTMLCanvasElement>(null);
  const maintenanceRef  = useRef<HTMLCanvasElement>(null);
  const reserveInst     = useRef<any>(null);
  const maintenanceInst = useRef<any>(null);

  const [units,         setUnits]         = useState<Unit[]>([]);
  const [owners,        setOwners]        = useState<UnitOwner[]>([]);
  const [dues,          setDues]          = useState<UnitDue[]>([]);
  const [requests,      setRequests]      = useState<MaintenanceRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [transactions,  setTransactions]  = useState<ReserveTransaction[]>([]);
  const [loading,       setLoading]       = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      getUnits(),
      getUnitOwners(),
      getUnitDues(),
      getMaintenanceRequests(),
      getAnnouncements(),
      getReserveTransactions(),
    ]).then(([u, o, d, r, a, t]) => {
      setUnits(u);
      setOwners(o);
      setDues(d);
      setRequests(r);
      setAnnouncements(a);
      setTransactions(t);
      setLoading(false);
    }).catch((err) => {
      console.error('Dashboard fetch error:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [location.key]);

  /* ── derived ── */
  const missedPayments = dues.filter(d => d.status === 'UNPAID').length;

  const totalFunds = transactions
    .filter(t => t.status === 'POSTED')
    .reduce((sum, t) => {
      const amt = Number(t.amount);
      return t.type === 'EXPENSE' ? sum - amt : sum + amt;
    }, 0);

  const healthScore = dues.length > 0
    ? Math.max(0, Math.round(100 - (missedPayments / dues.length) * 100))
    : 100;

  const monthlyBalance = (() => {
    const posted = transactions
      .filter(t => t.status === 'POSTED' && (t.transactionDate || t.createdAt))
      .sort((a, b) => (a.transactionDate ?? a.createdAt).localeCompare(b.transactionDate ?? b.createdAt));
    const map: Record<string, number> = {};
    let running = 0;
    for (const t of posted) {
      const date = (t.transactionDate ?? t.createdAt).slice(0, 7);
      running += t.type === 'EXPENSE' ? -Number(t.amount) : Number(t.amount);
      map[date] = running;
    }
    return map;
  })();

  const reserveLabels = Object.keys(monthlyBalance);
  const reserveData   = Object.values(monthlyBalance);

  const statusCounts = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map(s =>
    requests.filter(r => r.status === s).length
  );

  const upcomingExpenses = transactions
    .filter(t => t.type === 'PROJECTION' && t.status === 'PLANNED' && t.expectedDate)
    .sort((a, b) => (a.expectedDate! > b.expectedDate! ? 1 : -1))
    .slice(0, 5);

  const recentRequests = [...requests]
    .sort((a, b) => b.requestId.localeCompare(a.requestId))
    .slice(0, 3);

  const latestAnnouncements = [...announcements]
    .sort((a, b) => b.announcementId.localeCompare(a.announcementId))
    .slice(0, 3);

  /* ── charts ── */
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const steel = '#2563eb';
      const muted = '#64748b';
      const line  = '#e5eaf3';

      reserveInst.current?.destroy();
      maintenanceInst.current?.destroy();
      reserveInst.current     = null;
      maintenanceInst.current = null;

      if (reserveRef.current && reserveLabels.length > 0) {
        reserveInst.current = new Chart(reserveRef.current, {
          type: 'line',
          data: {
            labels: reserveLabels,
            datasets: [{
              data: reserveData,
              borderColor: steel,
              borderWidth: 3,
              pointRadius: 0,
              tension: 0.35,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx: any) => ` $${Number(ctx.raw).toLocaleString()}` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: muted } },
              y: { grid: { color: line }, ticks: { color: muted, callback: (v: any) => `$${Number(v).toLocaleString()}` } },
            },
          },
        });
      }

      if (maintenanceRef.current) {
        maintenanceInst.current = new Chart(maintenanceRef.current, {
          type: 'bar',
          data: {
            labels: ['CLOSED', 'COMPLETED', 'IN_PROGRESS', 'OPEN'],
            datasets: [{ data: statusCounts, backgroundColor: steel, borderRadius: 10 }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: muted } },
              y: { beginAtZero: true, grid: { color: line }, ticks: { color: muted, stepSize: 5 } },
            },
          },
        });
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      reserveInst.current?.destroy();
      maintenanceInst.current?.destroy();
    };
  }, [loading, transactions, requests]);

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-section hero-bg flex items-end justify-between gap-3 rounded-[18px] border border-[#e5eaf3] p-4">
        <div>
          <h2 className="m-0 text-[20px] font-black tracking-[-0.03em] text-[#0f172a]">
            Dashboard Overview
          </h2>
          <p className="m-0 mt-[6px] text-[13px] text-[#64748b]">
            Clear reporting and centralized records.
          </p>
        </div>

        <div className="health-box min-w-[260px] rounded-[14px] border border-[#e5eaf3] bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-[10px]">
            <div>
              <div className="text-[22px] font-black text-[#0b2b55]">
                {loading ? '—' : healthScore}
              </div>
              <small className="block text-[12px] text-[#64748b]">Building Health Score</small>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap rounded-full border border-[#bbf7d0] bg-[#ecfdf3] px-[10px] py-[3px] text-[11px] font-black text-[#166534]">
                Healthy
              </span>
              <button
                onClick={fetchAll}
                disabled={loading}
                title="Refresh"
                className="cursor-pointer rounded-full border border-[#e5eaf3] bg-white px-[10px] py-[3px] text-[13px] text-[#64748b] hover:bg-[#f5f7fb] disabled:opacity-40"
              >
                {loading ? '…' : '↻'}
              </button>
            </div>
          </div>
          <small className="mt-[6px] block text-[12px] leading-[1.35] text-[#64748b]">
            Strong reserve fund and low late payments compared to last month.
          </small>
        </div>
      </section>

      {/* ── 12-col grid ── */}
      <div className="mt-[14px] grid grid-cols-12 gap-[14px]">

        {/* Stats */}
        <div className="stat-card col-span-3">
          <p className="m-0 text-[12px] text-[#64748b]">Active Units</p>
          <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0f172a]">{loading ? '—' : units.length}</p>
        </div>
        <div className="stat-card col-span-3">
          <p className="m-0 text-[12px] text-[#64748b]">Active Owners</p>
          <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0f172a]">{loading ? '—' : owners.length}</p>
        </div>
        <div className="stat-card col-span-3">
          <p className="m-0 text-[12px] text-[#64748b]">Funds</p>
          <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0f172a]">{loading ? '—' : `$${totalFunds.toLocaleString()}`}</p>
        </div>
        <div className="stat-card col-span-3">
          <p className="m-0 text-[12px] text-[#64748b]">Missed Payments</p>
          <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0f172a]">{loading ? '—' : missedPayments}</p>
        </div>

        {/* Reserve Fund Chart */}
        <div className="panel-card col-span-6">
          <PanelHead title="Reserve Fund Balance" sub="Including dues & expenses" />
          <div className="chart-wrap overflow-hidden rounded-[14px] border border-dashed border-[#dbe1ee] p-[10px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#64748b]">Loading…</div>
            ) : reserveLabels.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#64748b]">No data yet</div>
            ) : (
              <canvas ref={reserveRef} />
            )}
          </div>
        </div>

        {/* Maintenance Chart */}
        <div className="panel-card col-span-6">
          <PanelHead title="Maintenance Requests" sub="By status" />
          <div className="chart-wrap overflow-hidden rounded-[14px] border border-dashed border-[#dbe1ee] p-[10px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#64748b]">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-[#64748b]">No data yet</div>
            ) : (
              <canvas ref={maintenanceRef} />
            )}
          </div>
        </div>

        {/* Upcoming Expenses */}
        <div className="expense-card col-span-8">
          <PanelHead title="Upcoming Expenses" sub="Date • Expense • Cost" />
          {loading ? (
            <div className="py-6 text-center text-[13px] text-[#64748b]">Loading…</div>
          ) : upcomingExpenses.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[#64748b]">No upcoming expenses</div>
          ) : (
            <div className="mt-2 flex flex-col gap-[10px]">
              {upcomingExpenses.map(e => (
                <div key={e.transactionId} className="expense-row flex items-center gap-3 rounded-[14px] border border-[#e5eaf3] p-3">
                  <div className="expense-date w-[110px] text-[12px] font-bold text-[#64748b]">
                    {(e.expectedDate ?? '').slice(0, 10)}
                  </div>
                  <div className="flex-1 text-[13px] font-black leading-[1.2] text-[#0f172a]">
                    {e.title}
                  </div>
                  <div className="expense-cost ml-auto whitespace-nowrap rounded-full border border-[#e3eaf7] bg-[#f3f7ff] px-[10px] py-[6px] text-[13px] font-black text-[#0b2b55]">
                    ${Number(e.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="right-col col-span-4 flex flex-col gap-[14px]">

          <div className="right-card">
            <PanelHead title="Maintenance Requests" sub="Today" />
            {loading ? (
              <div className="py-4 text-center text-[13px] text-[#64748b]">Loading…</div>
            ) : recentRequests.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-[#64748b]">No requests</div>
            ) : recentRequests.map(r => (
              <div key={r.requestId} className="item-block">
                <div className="flex items-start justify-between gap-[10px]">
                  <div>
                    <strong className="block text-[13px] text-[#0f172a]">{r.title}</strong>
                    <small className="mt-0.5 block text-[12px] text-[#64748b]">
                      {r.requestId.slice(0, 8).toUpperCase()} • {r.status}
                    </small>
                  </div>
                  <Prio level={r.priority} />
                </div>
              </div>
            ))}
          </div>

          <div className="right-card">
            <PanelHead title="Announcements" sub="Latest" />
            {loading ? (
              <div className="py-4 text-center text-[13px] text-[#64748b]">Loading…</div>
            ) : latestAnnouncements.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-[#64748b]">No announcements</div>
            ) : latestAnnouncements.map(a => (
              <div key={a.announcementId} className="item-block">
                <strong className="block text-[13px] text-[#0f172a]">{a.title}</strong>
                <small className="mt-0.5 block text-[12px] text-[#64748b]">
                  {a.publishedAt ? a.publishedAt.slice(0, 10) : a.status}
                </small>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}