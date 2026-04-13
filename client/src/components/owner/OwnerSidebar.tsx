import { NavLink } from 'react-router-dom';
import type { OwnerNavBadgeMap, OwnerRouteKey } from '../../types/owner';
import { ownerRoutePaths } from '../../types/owner';

const ownerNavItems: Array<{ key: OwnerRouteKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dues', label: 'Dues' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'documents', label: 'Documents' },
];

export function OwnerSidebar({
  activeRoute,
  badges,
}: {
  activeRoute: OwnerRouteKey;
  badges?: OwnerNavBadgeMap;
}) {
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
                ['owner-shell-nav-link', (isActive || activeRoute === item.key) && 'active']
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
      </nav>
    </aside>
  );
}
