import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { OwnerLayoutUser, OwnerNavBadgeMap, OwnerRouteKey } from '../../types/owner';
import { ownerRoutePaths } from '../../types/owner';

const ownerNavGroups: Array<Array<{ key: OwnerRouteKey; label: string }>> = [
  [
    { key: 'dashboard', label: 'Dashboard' },
  ],
  [
    { key: 'dues',        label: 'Dues' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'documents',   label: 'Documents' },
  ],
];

export function OwnerSidebar({
  activeRoute,
  badges,
  user,
  unitLabel,
}: {
  activeRoute: OwnerRouteKey;
  badges?: OwnerNavBadgeMap;
  user?: OwnerLayoutUser | null;
  unitLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <div className="owner-mobile-trigger">
        <button
          type="button"
          className="owner-mobile-btn"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="owner-mobile-title">
          <strong>CondoManager</strong>
          <span>Navigation</span>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`owner-sidebar-overlay ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`owner-shell-sidebar ${open ? 'open' : ''}`}>

        {/* Mobile drawer head */}
        <div className="owner-mobile-drawer-head">
          <div className="owner-mobile-drawer-brand">
            <div className="owner-mobile-drawer-logo overflow-hidden">
              <img
                src="/CMLogo.png"
                alt="CondoManager logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <strong>CondoManager</strong>
              <span>Owner Portal</span>
            </div>
          </div>
          <button
            type="button"
            className="owner-mobile-close-btn"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav groups with dividers */}
        <nav className="owner-shell-nav">
          {ownerNavGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {groupIndex > 0 && <div className="owner-shell-divider" />}
              {group.map((item) => {
                const badge = badges?.[item.key];
                return (
                  <NavLink
                    key={item.key}
                    to={ownerRoutePaths[item.key]}
                    end
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      ['owner-shell-nav-link', (isActive || activeRoute === item.key) && 'active']
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    <span>{item.label}</span>
                    {badge ? (
                      <span className="owner-shell-nav-pill">{badge}</span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

       
      </aside>
    </>
  );
}