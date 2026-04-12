import { useEffect, useMemo, useState } from 'react';
import { updateCurrentUserProfile } from '../../api/users';
import { getOwnerDashboard } from '../../api/owner';
import { OwnerLayout } from '../../components/owner/OwnerLayout';
import {
  OwnerActionButton,
  OwnerCard,
  OwnerStatCard,
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
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadPage() {
    try {
      setLoading(true);
      setError('');
      const data = await getOwnerDashboard();
      setDashboard(data);
      setForm({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        email: data.profile.email,
        phone: data.profile.phone ?? '',
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

  const navBadges: OwnerNavBadgeMap = useMemo(
    () => ({
      dashboard: 'Home',
      dues: dashboard?.duesSummary.unpaidCount
        ? `${dashboard.duesSummary.unpaidCount} unpaid`
        : 'Up to date',
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
        ...(password ? { password } : {}),
      });
      await loadPage();
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
          <div>
            <h2>My Profile</h2>
            <p>Review your account details and update your contact information.</p>
          </div>

          <OwnerStatusPill
            label={user?.active ? 'Account active' : 'Account inactive'}
            tone={user?.active ? 'good' : 'warn'}
          />
        </section>

        <div className="owner-profile-grid">
          <OwnerCard title="Account Summary">
            <div className="owner-profile-stats">
              <OwnerStatCard label="Role" value={user?.role ?? 'Owner'} />
              <OwnerStatCard
                label="Email"
                value={user?.email ?? 'Unavailable'}
              />
              <OwnerStatCard
                label="Member Since"
                value={formatDate(user?.createdAt)}
              />
              <OwnerStatCard
                label="Unit"
                value={activeUnit ? `Unit ${activeUnit.unitNumber}` : 'Pending'}
              />
            </div>
          </OwnerCard>

          <OwnerCard
            title="Contact Details"
            action={
              <OwnerActionButton variant="primary" onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </OwnerActionButton>
            }
          >
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

              <div className="owner-profile-field-grid">
                <label className="owner-profile-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </label>

                <label className="owner-profile-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Repeat new password"
                  />
                </label>
              </div>
            </div>
          </OwnerCard>
        </div>
      </div>
    </OwnerLayout>
  );
}
