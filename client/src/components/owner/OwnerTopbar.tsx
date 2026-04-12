import { Link } from 'react-router-dom';
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
  return (
    <header className="owner-shell-topbar">
      <div className="owner-shell-topbar-inner">
        <div className="owner-shell-brand">
          <div className="owner-shell-logo">CM</div>

          <div className="owner-shell-brand-copy">
            <strong>CondoManager</strong>
            <span>Owner Portal</span>
          </div>
        </div>

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
        </div>
      </div>
    </header>
  );
}
