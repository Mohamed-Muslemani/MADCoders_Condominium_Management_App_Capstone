import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getOwnerProfile } from '../api/owner';
import { useAuth } from '../context/auth-provider';
import type { User } from '../types/user';

export function OwnerRoute() {
  const { isAuthenticated, clearToken } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const currentUser = await getOwnerProfile();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (requestError) {
        if (!cancelled) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load your account.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-6">
        <div className="rounded-[18px] border border-[#dbe7ff] bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          Loading your owner portal…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-6">
        <div className="max-w-lg rounded-[18px] border border-[#fecaca] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <h1 className="text-base font-black text-slate-900">
            Unable to open the owner portal
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            {error}
          </p>
          <button
            type="button"
            onClick={clearToken}
            className="mt-4 rounded-[14px] border border-[#e5eaf3] bg-white px-3 py-2 text-[13px] font-black text-slate-900"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (user?.role !== 'OWNER') {
    return <Navigate to="/users" replace />;
  }

  return <Outlet />;
}
