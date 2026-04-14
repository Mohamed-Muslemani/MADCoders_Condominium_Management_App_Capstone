import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUserProfile } from '../../api/users';
import { useAuth } from '../../context/auth-provider';
import type { User } from '../../types/user';
import { AppNav } from '../AppNav/AppNav';
import './AppShell.css';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const currentUser = await getCurrentUserProfile();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    }

    void loadCurrentUser();

    function handleProfileUpdated() {
      void loadCurrentUser();
    }

    window.addEventListener('admin-profile-updated', handleProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('admin-profile-updated', handleProfileUpdated);
    };
  }, []);

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  const adminName = user ? `${user.firstName} ${user.lastName}` : 'Admin Workspace';
  const adminInitial = user?.firstName.trim().charAt(0).toUpperCase() || 'A';
  const topAction = getTopAction(location.pathname);

  function handleTopAction() {
    if (topAction.type === 'event') {
      window.dispatchEvent(new Event(topAction.eventName));
      return;
    }

    navigate(topAction.to);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/dashboard" className="app-brand-link">
            <div className="app-logo h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[14px]">
              <img
                src="/CMLogo.png"
                alt="CondoManager logo"
                className="block h-full w-full object-cover"
              />
            </div>
            <div>
              <strong className="app-brand-name block text-[14px] text-white">
                CondoManager
              </strong>
              <span className="app-brand-sub block text-[12px] text-white">
                Admin Portal
              </span>
            </div>
          </Link>

          <div className="app-header-actions">
            <button
              type="button"
              className="app-btn app-btn-primary"
              onClick={handleTopAction}
            >
              {topAction.label}
            </button>

            <button
              type="button"
              className="app-profile"
              onClick={() => navigate('/profile')}
            >
              <div className="app-avatar">
                {adminInitial}
              </div>
              <div>
                <strong>{adminName}</strong>
                <span className="app-profile-sub">
                  Manage your account
                </span>
              </div>
            </button>

            <button
              className="app-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <AppNav />
        </aside>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getTopAction(pathname: string) {
  const pageActions: Array<{ match: string; label: string; eventName: string }> = [
    { match: '/announcements', label: '+ New Announcement', eventName: 'admin-announcements-create' },
    { match: '/users', label: '+ New User', eventName: 'admin-users-create' },
    { match: '/units', label: '+ Create Unit', eventName: 'admin-units-create' },
    { match: '/unit-dues', label: '+ Create Due', eventName: 'admin-payments-create' },
    { match: '/reserve-transactions', label: '+ Add Transaction', eventName: 'admin-expenses-create' },
    { match: '/expense-categories', label: '+ New Category', eventName: 'admin-categories-create' },
    { match: '/maintenance-requests', label: '+ New Request', eventName: 'admin-maintenance-create' },
    { match: '/meetings', label: '+ New Meeting', eventName: 'admin-meetings-create' },
    { match: '/ai-documents', label: '+ Upload', eventName: 'admin-documents-create' },
  ];

  const matchedAction = pageActions.find((action) => pathname.startsWith(action.match));

  if (matchedAction) {
    return {
      label: matchedAction.label,
      type: 'event' as const,
      eventName: matchedAction.eventName,
    };
  }

  return {
    label: 'Announcements',
    type: 'route' as const,
    to: '/announcements',
  };
}
