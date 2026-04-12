import { useEffect, useState } from 'react';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../../api/users';
import type { User } from '../../types/user';
import './AdminProfilePage.css';

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

export function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
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

  async function loadProfile() {
    try {
      setLoading(true);
      setError('');
      const currentUser = await getCurrentUserProfile();
      setUser(currentUser);
      setForm({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: currentUser.phone ?? '',
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
    void loadProfile();
  }, []);

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
      const updated = await updateCurrentUserProfile({
        firstName,
        lastName,
        email,
        phone: form.phone.trim() || null,
        ...(password ? { password } : {}),
      });
      setUser(updated);
      setForm({
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone ?? '',
        password: '',
        confirmPassword: '',
      });
      window.dispatchEvent(new Event('admin-profile-updated'));
      setSuccess(password ? 'Profile and password updated successfully.' : 'Profile updated successfully.');
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

  return (
    <section className="admin-profile-page">
      <section className="admin-profile-hero">
        <div className="admin-profile-hero-copy">
          <div>
            <h2>My Profile</h2>
            <p>
              Keep your admin account details current for everyday operations.
            </p>
          </div>

          <div className="admin-profile-hero-note">
            Your credentials and contact details live here, while user management
            for all accounts stays under the main Users section.
          </div>
        </div>

        <div className="admin-profile-hero-status">
          <span className="admin-profile-status-pill">
            <span className={`admin-profile-status-dot ${user?.active ? 'is-active' : 'is-inactive'}`} />
            {user?.active ? 'Account active' : 'Account inactive'}
          </span>
        </div>
      </section>

      {loading ? (
        <div className="admin-profile-state">
          Loading profile...
        </div>
      ) : error && !user ? (
        <div className="admin-profile-state is-error">
          {error}
        </div>
      ) : (
        <div className="admin-profile-grid">
          <section className="admin-profile-card">
            <div className="admin-profile-card-head">
              <div>
                <h3>Account Summary</h3>
                <p>Quick visibility into your workspace identity and account state.</p>
              </div>
              <span className="admin-profile-chip">
                {user?.role ?? 'ADMIN'}
              </span>
            </div>

            <div className="admin-profile-summary-grid">
              <div className="admin-profile-summary-card admin-profile-summary-card-wide">
                <small>Email</small>
                <strong>{user?.email ?? 'Unavailable'}</strong>
              </div>
              <div className="admin-profile-summary-card">
                <small>Member Since</small>
                <strong>{formatDate(user?.createdAt)}</strong>
              </div>
              <div className="admin-profile-summary-card">
                <small>Status</small>
                <strong>{user?.active ? 'Active' : 'Inactive'}</strong>
              </div>
              <div className="admin-profile-summary-card">
                <small>Workspace</small>
                <strong>Admin Portal</strong>
              </div>
            </div>
          </section>

          <section className="admin-profile-card">
            <div className="admin-profile-card-head">
              <div>
                <h3>Account Details</h3>
                <p>Update contact information and rotate your login credentials here.</p>
              </div>
              <button
                type="button"
                className="admin-profile-save"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="admin-profile-form">
              {error ? (
                <div className="admin-profile-message is-error">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="admin-profile-message is-success">
                  {success}
                </div>
              ) : null}

              <div className="admin-profile-field-grid">
                <label className="admin-profile-field">
                  <span>First Name</span>
                  <input
                    className="admin-profile-input"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </label>

                <label className="admin-profile-field">
                  <span>Last Name</span>
                  <input
                    className="admin-profile-input"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="admin-profile-field">
                <span>Email</span>
                <input
                  type="email"
                  className="admin-profile-input"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label className="admin-profile-field">
                <span>Phone</span>
                <input
                  className="admin-profile-input"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="Add a phone number"
                />
              </label>

              <div className="admin-profile-field-grid">
                <label className="admin-profile-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    className="admin-profile-input"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </label>

                <label className="admin-profile-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    className="admin-profile-input"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Repeat new password"
                  />
                </label>
              </div>

              <div className="admin-profile-help">
                Leave the password fields blank to keep your current password.
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
