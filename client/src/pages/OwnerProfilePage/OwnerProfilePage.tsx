import { useEffect, useMemo, useState } from 'react';
import { updateCurrentUserProfile } from '../../api/users';
import { getOwnerDashboard, getSelectedOwnerUnitId, setSelectedOwnerUnitId } from '../../api/owner';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerStatusPill,
  OwnerViewState,
} from '../../components/owner/OwnerUi';
import type { OwnerDashboardResponse, OwnerNavBadgeMap } from '../../types/owner';
import './OwnerProfilePage.css';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

export function OwnerProfilePage() {
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
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
      setForm({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        email: data.profile.email,
        phone: data.profile.phone ?? '',
        currentPassword: '',
        password: '',
        confirmPassword: '',
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load your profile.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const user = dashboard?.profile ?? null;
  const activeUnit = dashboard?.activeOwnership?.unit ?? null;
  const ownerships = dashboard?.activeOwnerships ?? [];

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : 'Up to date',
      transactions: 'View all',
      maintenance: dashboard?.maintenance.length
        ? `${dashboard.maintenance.length} total`
        : '0 total',
      documents: `${dashboard?.documentsSummary.availableCount ?? 0} docs`,
      profile: 'Account',
    }),
    [dashboard],
  );

  async function handleSave() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const currentPassword = form.currentPassword;
    const password = form.password.trim();

    if (!firstName || !lastName) {
      setError('First and last name are required.');
      return;
    }

    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password && password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (showPasswordFields && !currentPassword.trim()) {
      setError('Current password is required to change your password.');
      return;
    }

    if (showPasswordFields && !password) {
      setError('Enter a new password to complete the password change.');
      return;
    }

    if (password && password !== form.confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await updateCurrentUserProfile({
        firstName,
        lastName,
        email,
        phone: form.phone.trim() || null,
        ...(password
          ? { password, currentPassword: currentPassword.trim() }
          : {}),
      });
      await loadPage();
      setShowPasswordFields(false);
      setSuccess(password ? 'Your profile and password have been updated.' : 'Your profile has been updated.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not save your profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="loading"
            title="Loading profile"
            description="We’re gathering your account details."
          />
        </div>
      </main>
    );
  }

  if (error && !dashboard) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-[1200px]">
          <OwnerViewState
            tone="error"
            title="Unable to load profile"
            description={error}
            action={<OwnerActionButton onClick={() => void loadPage()}>Try again</OwnerActionButton>}
          />
        </div>
      </main>
    );
  }

  return (
    <OwnerLayout
      activeRoute="profile"
      title="Profile"
      subtitle="Keep your account details current so building staff can reach you."
      user={user}
      unitLabel={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Unit pending'}
      navBadges={navBadges}
      topbarActions={[
        {
          label: 'Refresh',
          onClick: () => void loadPage(),
        },
      ]}
    >
      <div className="owner-profile-page">
        <section className="owner-profile-hero">
          <div className="owner-profile-hero-top">
            <div>
              <h2 className="m-0 text-[20px] font-semibold tracking-[-0.03em] text-[#0f172a]">
                My Profile
              </h2>
              <p className="m-0 mt-[6px] text-[13px] leading-[1.35] text-[#64748b]">
                Review your account details and update your contact information.
              </p>
              {ownerships.length > 1 ? (
                <div className="owner-profile-unit-switcher">
                  <span>Viewing unit</span>
                  <select
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
              label={user?.active ? 'Account active' : 'Account inactive'}
              tone={user?.active ? 'good' : 'warn'}
            />
          </div>

          <div className="owner-profile-stats">
            <div className="owner-profile-stat-card owner-profile-stat-card-wide">
              <p>Email</p>
              <strong>{user?.email ?? 'Unavailable'}</strong>
            </div>
            <div className="owner-profile-stat-card">
              <p>Member Since</p>
              <strong>{formatDate(user?.createdAt)}</strong>
            </div>
            <div className="owner-profile-stat-card">
              <p>Status</p>
              <strong>{user?.active ? 'Active' : 'Inactive'}</strong>
            </div>
            <div className="owner-profile-stat-card">
              <p>Unit</p>
              <strong>{activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Pending'}</strong>
            </div>
            <div className="owner-profile-stat-card">
              <p>Role</p>
              <strong>{user?.role ?? 'Owner'}</strong>
            </div>
          </div>
        </section>

        <section className="owner-profile-card">
          <div className="owner-profile-card-head">
            <div>
              <h3>Account Details</h3>
              <p>Update contact information and manage your login credentials here.</p>
            </div>
            <div className="owner-profile-card-actions">
              <OwnerActionButton
                onClick={() => {
                  setShowPasswordFields((current) => !current);
                  setError('');
                  setSuccess('');
                  setForm((current) => ({
                    ...current,
                    currentPassword: '',
                    password: '',
                    confirmPassword: '',
                  }));
                }}
              >
                {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
              </OwnerActionButton>
              <OwnerActionButton variant="primary" onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </OwnerActionButton>
            </div>
          </div>

          <div className="owner-profile-form">
            {error ? (
              <OwnerViewState
                tone="error"
                title="Could not save profile"
                description={error}
              />
            ) : null}

            {success ? (
              <div className="owner-profile-success">{success}</div>
            ) : null}

            <div className="owner-profile-field-grid">
              <label className="owner-profile-field">
                <span>First Name</span>
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </label>

              <label className="owner-profile-field">
                <span>Last Name</span>
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="owner-profile-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label className="owner-profile-field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Add a phone number"
              />
            </label>

            {showPasswordFields ? (
              <div className="owner-profile-password-panel">
                <div className="owner-profile-password-head">
                  <strong>Password Change</strong>
                  <span>Confirm your current password before setting a new one.</span>
                </div>

                <div className="owner-profile-field-grid">
                  <label className="owner-profile-field">
                    <span>Current Password</span>
                    <input
                      type="password"
                      value={form.currentPassword}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                      placeholder="Enter your current password"
                    />
                  </label>

                  <label className="owner-profile-field">
                    <span>New Password</span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Minimum 8 characters"
                    />
                  </label>
                </div>

                <label className="owner-profile-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Repeat your new password"
                  />
                </label>
              </div>
            ) : (
              <div className="owner-profile-help">
                Use the Change Password button when you want to update your login credentials.
              </div>
            )}
          </div>
        </section>
      </div>
    </OwnerLayout>
  );
}
