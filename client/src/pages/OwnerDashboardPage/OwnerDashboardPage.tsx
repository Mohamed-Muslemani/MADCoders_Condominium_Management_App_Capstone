import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOwnerDashboard,
} from '../../api/owner';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerEmptyState,
  OwnerStatusPill,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import { useAuth } from '../../context/auth-provider';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import type { User } from '../../types/user';
import './OwnerDashboardPage.css';

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

function formatRelativeRole(role: User['role']) {
  return role === 'OWNER' ? 'Owner account' : role;
}

function formatCurrency(value: number | string) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [state, setState] = useState<OwnerDashboardResponse | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      setState(await getOwnerDashboard());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load your owner dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const openMaintenanceCount = useMemo(
    () =>
      (state?.maintenance ?? []).filter(
        (request) =>
          request.status === 'OPEN' || request.status === 'IN_PROGRESS',
      ).length,
    [state],
  );

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      maintenance:
        openMaintenanceCount > 0 ? `${openMaintenanceCount} open` : '0 open',
      documents: 'Owners',
    }),
    [openMaintenanceCount],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading owner dashboard"
            description="We’re gathering your profile, announcements, and maintenance activity."
          />
        </div>
      </main>
    );
  }

  if (error || !state?.profile) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load owner dashboard"
            description={error || 'Your owner profile could not be loaded.'}
            action={
              <div className="flex flex-wrap gap-2">
                <div onClick={() => void loadDashboard()}>
                  <OwnerActionButton>Try again</OwnerActionButton>
                </div>
                <div
                  onClick={() => {
                    clearToken();
                    navigate('/login', { replace: true });
                  }}
                >
                  <OwnerActionButton>Sign out</OwnerActionButton>
                </div>
              </div>
            }
          />
        </div>
      </main>
    );
  }

  const user = state.profile;
  const ownerName = `${user.firstName} ${user.lastName}`.trim();
  const avatarLetter = user.firstName.trim().charAt(0).toUpperCase() || 'O';
  const latestMaintenance = state.maintenance[0];
  const maintenanceStatusLabel =
    openMaintenanceCount > 0 ? 'Attention needed' : 'Up to date';
  const activeUnit = state.activeOwnership?.unit ?? null;
  const duesSummary = state.duesSummary;

  return (
    <OwnerLayout
      activeRoute="dashboard"
      title={ownerName}
      subtitle={
        <>
          Owner portal access is active. Building updates and request history
          are available below.
        </>
      }
      user={user}
      unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
      navBadges={navBadges}
      statusBadge={{
        label:
          duesSummary.currentStatus === 'UNPAID'
            ? 'Dues outstanding'
            : maintenanceStatusLabel,
        tone:
          duesSummary.currentStatus === 'UNPAID'
            ? 'warn'
            : openMaintenanceCount > 0
              ? 'warn'
              : 'good',
      }}
      topbarActions={[
        {
          label: 'Print',
          onClick: () => window.print(),
        },
      ]}
      showPageHeader={false}
      contentClassName="p-0"
    >
      <div className="owner-dashboard-page">
      <section className="owner-dashboard-header">
        <div className="owner-dashboard-who">
          <div className="owner-dashboard-who-badge">
            {avatarLetter}
          </div>

          <div>
            <h1>
              {ownerName}
            </h1>
            <p>
              {activeUnit ? (
                <>
                  Unit <b>{activeUnit.unitNumber}</b> • Monthly fee{' '}
                  <b>
                    {duesSummary.monthlyFee !== null
                      ? `$${duesSummary.monthlyFee.toFixed(2)}`
                      : 'Not available'}
                  </b>{' '}
                  • Next due{' '}
                  <b>{formatDate(duesSummary.nextDueDate ?? null)}</b>
                </>
              ) : (
                <>
                  Account <b>{formatRelativeRole(user.role)}</b> • Email{' '}
                  <b>{user.email}</b> • Unit <b>Pending backend mapping</b>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="owner-dashboard-header-actions">
          <OwnerStatusPill
            label={
              duesSummary.currentStatus === 'UNPAID'
                ? 'Unpaid'
                : maintenanceStatusLabel
            }
            tone={
              duesSummary.currentStatus === 'UNPAID'
                ? 'bad'
                : openMaintenanceCount > 0
                  ? 'warn'
                  : 'good'
            }
          />

          <OwnerActionButton onClick={() => navigate('/owner/maintenance')}>
            New Request
          </OwnerActionButton>
        </div>
      </section>

      <section className="owner-dashboard-grid">
        <section className="owner-dashboard-card">
          <div className="owner-dashboard-card-head">
            <strong>
              Dues
            </strong>
            <span className="owner-shell-nav-pill">
              {activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
            </span>
          </div>

          <div className="owner-dashboard-card-body">
            <div className="owner-dashboard-hero-box">
              <small>
                Current balance
              </small>
              <div className="owner-dashboard-balance">
                {formatCurrency(duesSummary.currentBalance)}
              </div>
              <div className="owner-dashboard-hero-sub">
                {activeUnit ? (
                  <>
                    Monthly fee • Next due {formatDate(duesSummary.nextDueDate ?? null)}
                  </>
                ) : (
                  'We need an owner-safe unit lookup endpoint before the dashboard can derive your dues summary.'
                )}
              </div>
            </div>

            <div className="owner-dashboard-stats">
              <div className="owner-dashboard-stat">
                <small>Monthly fee</small>
                <strong>
                  {duesSummary.monthlyFee !== null
                    ? formatCurrency(duesSummary.monthlyFee)
                    : 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-stat">
                <small>Next due</small>
                <strong>{formatDate(duesSummary.nextDueDate ?? null)}</strong>
              </div>
              <div className="owner-dashboard-stat">
                <small>Open maintenance</small>
                <strong>
                  {openMaintenanceCount} open
                </strong>
              </div>
              <div className="owner-dashboard-stat">
                <small>Status</small>
                <strong>
                  {duesSummary.currentStatus === 'UNPAID' ? 'Overdue' : 'Paid'}
                </strong>
              </div>
              <div className="owner-dashboard-stat">
                <small>Account status</small>
                <strong>
                  {user.active ? 'Active' : 'Inactive'}
                </strong>
              </div>
              <div className="owner-dashboard-stat">
                <small>Latest request</small>
                <strong>
                  {latestMaintenance ? formatDate(latestMaintenance.updatedAt) : 'None yet'}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="owner-dashboard-card">
          <div className="owner-dashboard-card-head">
            <strong>
              Announcements
            </strong>
            <OwnerActionButton onClick={() => void loadDashboard()}>
              Refresh
            </OwnerActionButton>
          </div>

          <div className="owner-dashboard-card-body">
            <div className="owner-dashboard-feed">
              {state.announcements.length === 0 ? (
                <OwnerEmptyState
                  title="No announcements yet"
                  description="Building updates will appear here when admins publish them."
                />
              ) : (
                state.announcements.map((announcement) => (
                  <article
                    key={announcement.announcementId}
                    className="owner-dashboard-feed-item"
                  >
                    <div>
                      <strong>{announcement.title}</strong>
                      <span className="feed-copy">{announcement.content}</span>
                    </div>

                    <span className="inline-flex whitespace-nowrap rounded-full border border-[#e5eaf3] bg-[#f8fafc] px-[10px] py-[6px] text-[12px] font-black text-slate-500">
                      {announcement.pinned ? 'Pinned' : formatDate(announcement.publishedAt ?? announcement.createdAt)}
                    </span>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </section>

      <section className="owner-dashboard-full">
        <section className="owner-dashboard-card">
          <div className="owner-dashboard-card-head">
            <strong>
              Unit Details
            </strong>
            <OwnerActionButton onClick={() => void loadDashboard()}>
              Update
            </OwnerActionButton>
          </div>

          <div className="owner-dashboard-card-body">
            <div className="owner-dashboard-kv-grid">
              <div className="owner-dashboard-kv">
                <small>Name</small>
                <strong>
                  {ownerName}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Email</small>
                <strong>
                  {user.email}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Phone</small>
                <strong>
                  {user.phone?.trim() || 'Not provided'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Role</small>
                <strong>
                  {formatRelativeRole(user.role)}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Unit</small>
                <strong>
                  {activeUnit?.unitNumber ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Floor</small>
                <strong>
                  {activeUnit?.floor ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Bedrooms</small>
                <strong>
                  {activeUnit?.bedrooms ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Bathrooms</small>
                <strong>
                  {activeUnit?.bathrooms ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Square feet</small>
                <strong>
                  {activeUnit?.squareFeet ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Parking spots</small>
                <strong>
                  {activeUnit?.parkingSpots ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Monthly fee</small>
                <strong>
                  {duesSummary.monthlyFee !== null
                    ? formatCurrency(duesSummary.monthlyFee)
                    : 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Status</small>
                <strong>
                  {activeUnit?.status ?? 'Unavailable'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Maintenance open</small>
                <strong>
                  {openMaintenanceCount}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Recent requests</small>
                <strong>
                  {state.maintenance.length}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Last maintenance priority</small>
                <strong>
                  {latestMaintenance ? latestMaintenance.priority : 'None yet'}
                </strong>
              </div>
              <div className="owner-dashboard-kv">
                <small>Notes</small>
                <strong>
                  {activeUnit?.notes || 'No notes'}
                </strong>
              </div>
            </div>

            <div className="owner-dashboard-note">
              <OwnerViewState
                title={
                  activeUnit
                    ? 'Dashboard now uses real owner unit and dues data'
                    : 'Owner unit mapping is still missing for this account'
                }
                description={
                  activeUnit
                    ? 'This section is now backed by the signed-in owner’s active ownership record, current unit details, and real dues summary.'
                    : 'This account does not currently resolve to an active unit ownership record, so unit and dues fields remain unavailable.'
                }
              />
            </div>
          </div>
        </section>
      </section>
      </div>
    </OwnerLayout>
  );
}
