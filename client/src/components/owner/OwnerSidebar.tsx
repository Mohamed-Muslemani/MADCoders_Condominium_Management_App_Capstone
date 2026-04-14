import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getReserveTransactions } from '../../api/reserveTransactions';
import type { OwnerNavBadgeMap, OwnerRouteKey } from '../../types/owner';
import { ownerRoutePaths } from '../../types/owner';

const ownerNavGroups: Array<Array<{ key: OwnerRouteKey; label: string }>> = [
  [
    { key: 'dashboard', label: 'Dashboard' },
  ],
  [
    { key: 'dues',        label: 'Dues' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'documents',   label: 'Documents' },
  ],
];

export function OwnerSidebar({
  activeRoute,
  badges,
}: {
  activeRoute: OwnerRouteKey;
  badges?: OwnerNavBadgeMap;
}) {
  const [open, setOpen] = useState(false);
  const [transactionBadge, setTransactionBadge] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadTransactionBadge() {
      try {
        const transactions = await getReserveTransactions();

        if (!cancelled) {
          setTransactionBadge(`${transactions.length} total`);
        }
      } catch {
        if (!cancelled) {
          setTransactionBadge('');
        }
      }
    }

    void loadTransactionBadge();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedBadges = useMemo(
    () => ({
      ...badges,
      transactions: transactionBadge || badges?.transactions,
    }),
    [badges, transactionBadge],
  );

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
                const badge = resolvedBadges?.[item.key];
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
