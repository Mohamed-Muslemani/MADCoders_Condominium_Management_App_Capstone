import { useEffect, useMemo, useState } from 'react';
import { getReserveTransactions } from '../../api/reserveTransactions';
import { getOwnerDashboard, getSelectedOwnerUnitId, setSelectedOwnerUnitId } from '../../api/owner';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerCard,
  OwnerEmptyState,
  OwnerStatusPill,
  OwnerStatCard,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import type {
  ReserveTransaction,
  ReserveTransactionStatus,
  ReserveTransactionType,
} from '../../types/reserve-transaction';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import './OwnerTransactionsPage.css';

function formatCurrency(value: string | number) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatType(type: ReserveTransactionType) {
  return type === 'EXPENSE' ? 'Expense' : 'Projection';
}

function formatStatus(status: ReserveTransactionStatus) {
  if (status === 'POSTED') return 'Posted';
  if (status === 'PLANNED') return 'Planned';
  return 'Cancelled';
}

function statusTone(status: ReserveTransactionStatus) {
  if (status === 'POSTED') return 'good' as const;
  if (status === 'PLANNED') return 'warn' as const;
  return 'neutral' as const;
}

export function OwnerTransactionsPage() {
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ReserveTransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReserveTransactionStatus>('ALL');
  const [selectedUnitId, setSelectedUnitIdState] = useState(() => getSelectedOwnerUnitId());

  async function loadPage(unitId = selectedUnitId) {
    try {
      setLoading(true);
      setError('');
      const [dashboardData, transactionData] = await Promise.all([
        getOwnerDashboard(unitId || undefined),
        getReserveTransactions(),
      ]);
      setDashboard(dashboardData);
      const resolvedUnitId = dashboardData.activeOwnership?.unit.unitId ?? '';
      setSelectedOwnerUnitId(resolvedUnitId);
      setSelectedUnitIdState(resolvedUnitId);
      setTransactions(transactionData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load transactions.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          transaction.title,
          transaction.description ?? '',
          transaction.category?.name ?? '',
          transaction.type,
          transaction.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        (typeFilter === 'ALL' || transaction.type === typeFilter) &&
        (statusFilter === 'ALL' || transaction.status === statusFilter)
      );
    });
  }, [query, statusFilter, transactions, typeFilter]);

  const expenseCount = filteredTransactions.filter((transaction) => transaction.type === 'EXPENSE').length;
  const projectionCount = filteredTransactions.filter((transaction) => transaction.type === 'PROJECTION').length;
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const user = dashboard?.profile ?? null;
  const activeUnit = dashboard?.activeOwnership?.unit ?? null;
  const ownerships = dashboard?.activeOwnerships ?? [];

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : 'Up to date',
      transactions: `${transactions.length} total`,
      maintenance: dashboard?.maintenance.length
        ? `${dashboard.maintenance.length} total`
        : '0 total',
      documents: `${dashboard?.documentsSummary.availableCount ?? 0} docs`,
      profile: 'Account',
    }),
    [dashboard, transactions.length],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading transactions"
            description="We’re gathering reserve projections and completed expenses."
          />
        </div>
      </main>
    );
  }

  if (error || !dashboard || !user) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load transactions"
            description={error || 'Transaction data could not be loaded.'}
            action={<OwnerActionButton onClick={() => void loadPage()}>Try again</OwnerActionButton>}
          />
        </div>
      </main>
    );
  }

  return (
    <OwnerLayout
      activeRoute="transactions"
      title="Transactions"
      subtitle="Browse reserve projections and completed expense records."
      user={user}
      unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
      navBadges={navBadges}
      topbarActions={[
        {
          label: 'Refresh',
          onClick: () => void loadPage(),
        },
      ]}
      showPageHeader={false}
      contentClassName="p-0"
    >
      <div className="owner-transactions-page">
        <section className="owner-transactions-hero">
          <div>
            <h2>Transactions</h2>
            <p>See both upcoming projections and posted expenses for the building reserve activity.</p>
            {ownerships.length > 1 ? (
              <div className="owner-transactions-unit-switcher">
                <label htmlFor="owner-transactions-unit">Viewing unit</label>
                <select
                  id="owner-transactions-unit"
                  className="owner-transactions-select"
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
            label={`${filteredTransactions.length} shown`}
            tone="good"
          />
        </section>

        <div className="owner-transactions-content">
          <div className="owner-transactions-summary">
            <OwnerStatCard label="Total value" value={formatCurrency(totalAmount)} />
            <OwnerStatCard label="Expenses" value={expenseCount} />
            <OwnerStatCard label="Projections" value={projectionCount} />
            <OwnerStatCard label="Records" value={filteredTransactions.length} />
          </div>

          <OwnerCard
            title="Activity"
            action={
              <div className="owner-transactions-filters">
                <input
                  className="owner-transactions-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, category, type..."
                />
                <select
                  className="owner-transactions-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'ALL' | ReserveTransactionType)}
                >
                  <option value="ALL">All types</option>
                  <option value="EXPENSE">Expenses</option>
                  <option value="PROJECTION">Projections</option>
                </select>
                <select
                  className="owner-transactions-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ReserveTransactionStatus)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="POSTED">Posted</option>
                  <option value="PLANNED">Planned</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <OwnerActionButton
                  onClick={() => {
                    setQuery('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear
                </OwnerActionButton>
              </div>
            }
          >
            {filteredTransactions.length === 0 ? (
              <OwnerEmptyState
                title="No transactions found"
                description={
                  transactions.length === 0
                    ? 'No reserve transactions are available yet.'
                    : 'No transactions match your current filters.'
                }
              />
            ) : (
              <div className="owner-transactions-list">
                {filteredTransactions.map((transaction) => (
                  <article key={transaction.transactionId} className="owner-transactions-item">
                    <div className="owner-transactions-item-main">
                      <div className="owner-transactions-item-head">
                        <strong>{transaction.title}</strong>
                        <span className="owner-transactions-amount">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      {transaction.description ? (
                        <div className="owner-transactions-copy">
                          {transaction.description}
                        </div>
                      ) : null}

                      <div className="owner-transactions-meta">
                        <span className="owner-transactions-tag">
                          {formatType(transaction.type)}
                        </span>
                        <span className="owner-transactions-tag">
                          {transaction.category?.name ?? 'Uncategorized'}
                        </span>
                        <span className="owner-transactions-tag">
                          {transaction.type === 'EXPENSE' ? 'Expense date' : 'Expected date'}:{' '}
                          {formatDate(
                            transaction.type === 'EXPENSE'
                              ? transaction.transactionDate
                              : transaction.expectedDate,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="owner-transactions-item-side">
                      <OwnerStatusPill
                        label={formatStatus(transaction.status)}
                        tone={statusTone(transaction.status)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </OwnerCard>
        </div>
      </div>
    </OwnerLayout>
  );
}
