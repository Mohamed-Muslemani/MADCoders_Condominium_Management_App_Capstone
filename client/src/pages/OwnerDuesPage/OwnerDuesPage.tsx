import { useEffect, useMemo, useState } from 'react';
import { getOwnerDashboard, getSelectedOwnerUnitId, setSelectedOwnerUnitId } from '../../api/owner';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerCard,
  OwnerDataTable,
  OwnerEmptyState,
  OwnerStatCard,
  OwnerStatusPill,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import type { UnitDue, UnitDueStatus } from '../../types/unit-due';
import './OwnerDuesPage.css';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number | string) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(status: UnitDueStatus) {
  if (status === 'UNPAID') return 'Unpaid';
  if (status === 'WAIVED') return 'Waived';
  return 'Paid';
}

function statusTone(status: UnitDueStatus) {
  if (status === 'PAID') return 'good' as const;
  if (status === 'WAIVED') return 'neutral' as const;
  return 'warn' as const;
}

export function OwnerDuesPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitDueStatus | ''>('');
  const [selectedUnitId, setSelectedUnitIdState] = useState(() => getSelectedOwnerUnitId());

  async function loadPage(unitId = selectedUnitId) {
    try {
      setLoading(true);
      setError('');
      const data = await getOwnerDashboard(unitId || undefined);
      setDashboard(data);
      const resolvedUnitId = data.activeOwnership?.unit.unitId ?? '';
      setSelectedOwnerUnitId(resolvedUnitId);
      setSelectedUnitIdState(resolvedUnitId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load your dues page.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const dues = dashboard?.dues ?? [];
  const activeUnit = dashboard?.activeOwnership?.unit ?? null;
  const ownerships = dashboard?.activeOwnerships ?? [];
  const user = dashboard?.profile ?? null;
  const duesSummary = dashboard?.duesSummary ?? null;

  const filteredDues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dues.filter((due) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          due.periodMonth,
          due.note ?? '',
          due.status,
          due.unit.unitNumber,
          formatDate(due.dueDate),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus = !statusFilter || due.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [dues, query, statusFilter]);

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: duesSummary?.unpaidCount ? `${duesSummary.unpaidCount} unpaid` : 'Up to date',
      transactions: 'View all',
      maintenance: dashboard?.maintenance.length
        ? `${dashboard.maintenance.length} total`
        : '0 total',
      documents: `${dashboard?.documentsSummary.availableCount ?? 0} docs`,
      profile: 'Account',
    }),
    [dashboard, duesSummary],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading dues"
            description="We’re gathering your unit dues history and current balance."
          />
        </div>
      </main>
    );
  }

  if (error || !dashboard || !user || !duesSummary) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load dues"
            description={error || 'Your dues data could not be loaded.'}
            action={<OwnerActionButton onClick={() => void loadPage()}>Try again</OwnerActionButton>}
          />
        </div>
      </main>
    );
  }

  return (
    <OwnerLayout
      activeRoute="dues"
      title="Dues"
      subtitle="Review your unit dues history and current status."
      user={user}
      unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
      navBadges={navBadges}
      topbarActions={[
        {
          label: 'Print',
          onClick: () => window.print(),
        },
      ]}
      showPageHeader={false}
      contentClassName="p-0"
    >
      <div className="owner-dues-page">
        <section className="owner-dues-hero">
          <div>
            <h2>Dues</h2>
            <p>Simple list of your dues history and current status.</p>
            {ownerships.length > 1 ? (
              <div className="owner-dues-unit-switcher">
                <label htmlFor="owner-dues-unit">Viewing unit</label>
                <select
                  id="owner-dues-unit"
                  className="owner-dues-select"
                  value={selectedUnitId}
                  onChange={(event) => {
                    const nextUnitId = event.target.value;
                    setSelectedOwnerUnitId(nextUnitId);
                    setSelectedUnitIdState(nextUnitId);
                    void loadPage(nextUnitId);
                  }}
                >
                  {ownerships.map((ownership) => (
                    <option key={ownership.unit.unitId} value={ownership.unit.unitId}>
                      Unit {ownership.unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <OwnerStatusPill
            label={
              duesSummary.currentStatus === 'UNPAID'
                ? 'Check unpaid dues'
                : 'Up to date'
            }
            tone={duesSummary.currentStatus === 'UNPAID' ? 'warn' : 'good'}
          />
        </section>

        <div className="owner-dues-content">
          <div className="owner-dues-summary">
            <OwnerStatCard
              label="Current balance"
              value={formatCurrency(duesSummary.currentBalance)}
            />
            <OwnerStatCard
              label="Monthly fee"
              value={
                duesSummary.monthlyFee !== null
                  ? formatCurrency(duesSummary.monthlyFee)
                  : 'Unavailable'
              }
            />
            <OwnerStatCard
              label="Next due"
              value={formatDate(duesSummary.nextDueDate)}
            />
            <OwnerStatCard
              label="Unit"
              value={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unavailable'}
            />
          </div>

          <OwnerCard
            title="History"
            action={
              <div className="owner-dues-filters">
                <input
                  className="owner-dues-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search month, status, note..."
                />
                <select
                  className="owner-dues-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as UnitDueStatus | '')
                  }
                >
                  <option value="">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="WAIVED">Waived</option>
                </select>
                <OwnerActionButton
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('');
                  }}
                >
                  Clear
                </OwnerActionButton>
              </div>
            }
          >
            <OwnerDataTable<UnitDue>
              columns={[
                {
                  key: 'dueDate',
                  header: 'Due Date',
                  render: (due) => formatDate(due.dueDate),
                },
                {
                  key: 'periodMonth',
                  header: 'Period',
                  render: (due) => due.periodMonth.slice(0, 7),
                },
                {
                  key: 'unit',
                  header: 'Unit',
                  render: (due) => due.unit.unitNumber,
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (due) => formatCurrency(due.amount),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (due) => (
                    <OwnerStatusPill
                      label={formatStatus(due.status)}
                      tone={statusTone(due.status)}
                    />
                  ),
                },
                {
                  key: 'notes',
                  header: 'Notes',
                  render: (due) => due.note?.trim() || '—',
                },
              ]}
              rows={filteredDues}
              getRowKey={(due) => due.dueId}
              emptyState={
                <OwnerEmptyState
                  title="No dues found"
                  description={
                    dues.length === 0
                      ? 'No dues records are available for your current unit yet.'
                      : 'No dues match your current filters.'
                  }
                />
              }
            />

            <div className="owner-dues-row-count">
              {filteredDues.length} dues record{filteredDues.length === 1 ? '' : 's'}
            </div>
          </OwnerCard>
        </div>
      </div>
    </OwnerLayout>
  );
}
