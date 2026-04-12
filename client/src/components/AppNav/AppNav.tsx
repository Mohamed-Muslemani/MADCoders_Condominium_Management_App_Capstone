import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getAnnouncements } from '../../api/announcements';
import { getDocuments } from '../../api/documents';
import { getExpenseCategories } from '../../api/expenseCategories';
import { getMaintenanceRequests } from '../../api/maintenanceRequests';
import { getReserveTransactions } from '../../api/reserveTransactions';
import { getUnitDues } from '../../api/unitDues';
import { getUnitOwners } from '../../api/unitOwners';
import { getUnits } from '../../api/units';
import { getUsers } from '../../api/users';
import './AppNav.css';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/users', label: 'Users' },
  { to: '/units', label: 'Units' },
  { to: '/unit-owners', label: 'Ownerships' },
  { to: '/unit-dues', label: 'Dues' },
  { to: '/reserve-transactions', label: 'Expenses' },
  { to: '/expense-categories', label: 'Categories' },
  { to: '/maintenance-requests', label: 'Maintenance' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/ai-documents', label: 'AI Documents' },
] as const;

type AdminLinkPath = (typeof adminLinks)[number]['to'];
type NavBadgeMap = Partial<Record<AdminLinkPath, string>>;

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
  const [badges, setBadges] = useState<NavBadgeMap>({});
  const location = useLocation();

  function closeMenu() {
    setOpen(false);
  }

  function toggleMenu() {
    setOpen((prev) => !prev);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      try {
        const [
          users,
          units,
          unitOwners,
          dues,
          reserveTransactions,
          expenseCategories,
          maintenanceRequests,
          announcements,
          documents,
        ] = await Promise.all([
          getUsers(),
          getUnits(),
          getUnitOwners(),
          getUnitDues(),
          getReserveTransactions(),
          getExpenseCategories(),
          getMaintenanceRequests(),
          getAnnouncements(),
          getDocuments(),
        ]);

        if (cancelled) {
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setBadges({
          '/users': String(users.length),
          '/units': String(units.length),
          '/unit-owners': String(
            unitOwners.filter((owner) => {
              const start = new Date(owner.startDate);
              start.setHours(0, 0, 0, 0);
              const end = owner.endDate ? new Date(owner.endDate) : null;
              if (end) {
                end.setHours(0, 0, 0, 0);
              }

              return start <= today && (!end || end >= today);
            }).length,
          ),
          '/unit-dues': String(
            dues.filter((due) => due.status === 'UNPAID').length,
          ),
          '/reserve-transactions': String(reserveTransactions.length),
          '/expense-categories': String(expenseCategories.length),
          '/maintenance-requests': String(
            maintenanceRequests.filter(
              (request) =>
                request.status === 'OPEN' || request.status === 'IN_PROGRESS',
            ).length,
          ),
          '/announcements': String(announcements.length),
          '/ai-documents': String(documents.length),
        });
      } catch {
        if (!cancelled) {
          setBadges({});
        }
      }
    }

    void loadBadges();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const primaryLinks = useMemo(() => adminLinks.slice(0, 5), []);
  const operationsLinks = useMemo(() => adminLinks.slice(5, 9), []);
  const resourcesLinks = useMemo(() => adminLinks.slice(9), []);

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
              badge={badges[link.to]}
              onClick={closeMenu}
            />
          ))}

          <Divider />

          {operationsLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              badge={badges[link.to]}
              onClick={closeMenu}
            />
          ))}

          <Divider />

          {resourcesLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              badge={badges[link.to]}
              onClick={closeMenu}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
