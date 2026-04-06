import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { AppNav } from '../AppNav/AppNav';
import './AppShell.css';


export function AppShell() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0f172a]">
      

      {/* HEADER */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 text-white"
        style={{ background: 'linear-gradient(90deg, #071a33, #0b2b55)' }}
      >
        <div className="app-header-inner mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-[18px] py-[14px]">

          {/* Brand */}
          <div className="flex min-w-[250px] shrink-0 items-center gap-3">
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
                Admin Portal • Building A
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="app-header-actions flex min-w-[320px] items-center justify-end gap-[10px]">
            <button className="app-btn app-btn-primary rounded-[12px] px-3 py-[10px] text-[13px] text-white">
              + Announcement
            </button>

            <div className="app-profile flex items-center gap-[10px] rounded-[14px] px-[10px] py-2">
              <div className="app-avatar grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px] font-black text-[#071a33]">
                B
              </div>
              <div>
                <strong className="block text-[13px] text-white">Name (Admin)</strong>
                <span className="app-profile-sub block text-[12px] text-white">
                  Windsor Condo
                </span>
              </div>
            </div>

            <button
              className="app-btn rounded-[12px] px-3 py-[10px] text-[13px] text-white"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      {/* BODY */}
      <div className="app-body mx-auto grid max-w-[1200px] grid-cols-[270px_1fr] gap-[14px] p-[18px]">

        {/* Sidebar */}
        <aside className="min-w-0">
          <AppNav />
        </aside>

        {/* Main */}
        <main className="min-w-0 rounded-[16px] border border-[#e5eaf3] bg-white p-[14px] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <Outlet />
        </main>

      </div>
    </div>
  );
}