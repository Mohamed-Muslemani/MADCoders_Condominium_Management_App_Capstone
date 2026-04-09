import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppNav.css';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/units', label: 'Units' },
  { to: '/unit-owners', label: 'Owners' },
  { to: '/unit-dues', label: 'Payments' },
  { to: '/reserve-transactions', label: 'Expenses' },
  { to: '/maintenance-requests', label: 'Maintenance' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/ai-documents', label: 'AI Documents' },
] as const;

function Divider() {
  return <div className="nav-divider" />;
}

function SidebarLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      <span>{label}</span>
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

  const primaryLinks = adminLinks.slice(0, 4);
  const operationsLinks = adminLinks.slice(4, 7);
  const resourcesLinks = adminLinks.slice(7);

  return (
    <>
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

      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={closeMenu}
      />

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
          {primaryLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              onClick={closeMenu}
            />
          ))}

          <Divider />

          {operationsLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              onClick={closeMenu}
            />
          ))}

          <Divider />

          {resourcesLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              onClick={closeMenu}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
