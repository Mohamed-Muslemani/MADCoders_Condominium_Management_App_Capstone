import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-provider';
import type { OwnerNavBadgeMap, OwnerRouteKey } from '../../types/owner';
import { ownerRoutePaths } from '../../types/owner';

const ownerNavItems: Array<{ key: OwnerRouteKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dues', label: 'Dues' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'documents', label: 'Documents' },
];

export function OwnerSidebar({
  badges,
}: {
  activeRoute: OwnerRouteKey;
  badges?: OwnerNavBadgeMap;
}) {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="owner-shell-sidebar">
      <nav className="owner-shell-nav">
        {ownerNavItems.map((item) => {
          const badge = badges?.[item.key];

          return (
            <NavLink
              key={item.key}
              to={ownerRoutePaths[item.key]}
              end
              className={({ isActive }) =>
                ['owner-shell-nav-link', isActive && 'active']
                  .filter(Boolean)
                  .join(' ')
              }
            >
              <span>{item.label}</span>
              {badge ? (
                <span className="owner-shell-nav-pill">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}

        <div className="owner-shell-divider" />

        <div className="owner-shell-nav-link">
          Profile
        </div>
        <button
          type="button"
          className="owner-shell-nav-link"
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>
    </aside>
  );
}
