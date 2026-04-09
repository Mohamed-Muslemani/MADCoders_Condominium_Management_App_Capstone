import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppNav.css';

function Divider() {
  return <div className="nav-divider" />;
}

function SidebarLink({
  to,
  label,
  badge,
  onClick,
}: {
  to: string;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </NavLink>
  );
}

export function AppNav() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  function toggleMenu() {
    setOpen((prev) => !prev);
  }

  return (
    <>
      {/* mobile top trigger */}
      <div className="mobile-nav-trigger">
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={toggleMenu}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div className="mobile-nav-title">
          <strong>CondoManager</strong>
          <span>Navigation</span>
        </div>
      </div>

      {/* overlay */}
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={closeMenu}
      />

      {/* sidebar / drawer */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="mobile-drawer-head">
          <div className="mobile-drawer-brand">
          <div className="mobile-drawer-logo overflow-hidden">
  <img
    src="/CMLogo.png"
    alt="CondoManager logo"
    className="h-full w-full object-cover"
  />
</div>
            <div>
              <strong>CondoManager</strong>
              <span>Admin Portal</span>
            </div>
          </div>

          <button
            type="button"
            className="mobile-close-btn"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <SidebarLink to="/dashboard" label="Dashboard" onClick={closeMenu} />
          <SidebarLink to="/units" label="Units" badge="124" onClick={closeMenu} />
          <SidebarLink
            to="/unit-owners"
            label="Owners"
            badge="206"
            onClick={closeMenu}
          />

          <Divider />

          <SidebarLink to="/unit-dues" label="Payments" onClick={closeMenu} />
          <SidebarLink to="/reserve-transactions" label="Expenses" onClick={closeMenu} />
          
     

          <Divider />

          <SidebarLink
            to="/maintenance-requests"
            label="Maintenance"
            badge="3"
            onClick={closeMenu}
          />
          <SidebarLink
            to="/announcements"
            label="Announcements"
            badge="3"
            onClick={closeMenu}
          />

          <Divider />

          <SidebarLink to="/documents" label="Documents" onClick={closeMenu} />
          <SidebarLink to="/reports" label="Reports" onClick={closeMenu} />
         
        </nav>
      </aside>
    </>
  );
}