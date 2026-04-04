
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/ai-documents', label: 'AI Documents' },
  { to: '/units', label: 'Units' },
  { to: '/users', label: 'Users' },
  { to: '/unit-owners', label: 'Unit Owners' },
  { to: '/unit-dues', label: 'Unit Dues' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/maintenance-requests', label: 'Maintenance Requests' },
  { to: '/reserve-transactions', label: 'Reserve Transactions' },
];

export function AppNav() {
  return (
    <nav className="panel nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
