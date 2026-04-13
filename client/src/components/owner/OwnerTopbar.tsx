import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-provider';
import type { OwnerHeaderAction, OwnerLayoutUser } from '../../types/owner';

function getInitial(user?: OwnerLayoutUser | null) {
  if (!user) {
    return 'O';
  }

  return user.firstName.trim().charAt(0).toUpperCase() || 'O';
}

export function OwnerTopbar({
  user,
  unitLabel,
  actions = [],
}: {
  user?: OwnerLayoutUser | null;
  unitLabel?: string;
  actions?: OwnerHeaderAction[];
}) {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <header className="owner-shell-topbar">
      <div className="owner-shell-topbar-inner">
        <Link to="/owner" className="owner-shell-brand owner-shell-brand-link">
          <div className="owner-shell-logo-wrap">
            <img
              src="/CMLogo.png"
              alt="CondoManager logo"
              className="owner-shell-logo-image"
            />
          </div>

          <div className="owner-shell-brand-copy">
            <strong>CondoManager</strong>
            <span>Owner Portal</span>
          </div>
        </Link>

        <div className="owner-shell-top-actions">
          {actions.map((action) =>
            action.href ? (
              <a
                key={action.label}
                href={action.href}
                className="owner-shell-top-button"
              >
                {action.label}
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="owner-shell-top-button"
              >
                {action.label}
              </button>
            ),
          )}

          <Link to="/owner/profile" className="owner-shell-profile owner-shell-profile-link">
            <div className="owner-shell-avatar">{getInitial(user)}</div>
            <div>
              <strong>
                {user ? `${user.firstName} ${user.lastName}` : 'Owner'}
              </strong>
              <span>{unitLabel ?? 'Unit pending'}</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="owner-shell-top-button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
