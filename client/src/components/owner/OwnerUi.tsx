import type { ReactNode } from 'react';
import type {
  OwnerCardProps,
  OwnerEmptyStateProps,
  OwnerPageHeaderProps,
  OwnerStatCardProps,
  OwnerStatusBadge,
  OwnerTableProps,
  OwnerViewStateProps,
} from '../../types/owner';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function badgeToneClasses(tone: OwnerStatusBadge['tone'] = 'neutral') {
  if (tone === 'good') {
    return {
      dot: 'bg-[#16a34a] shadow-[0_0_0_3px_rgba(22,163,74,0.12)]',
      shell: '',
    };
  }

  if (tone === 'warn') {
    return {
      dot: 'bg-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
      shell: '',
    };
  }

  if (tone === 'bad') {
    return {
      dot: 'bg-[#dc2626] shadow-[0_0_0_3px_rgba(220,38,38,0.12)]',
      shell: '',
    };
  }

  return {
    dot: 'bg-slate-400',
    shell: '',
  };
}

export function OwnerStatusPill({ label, tone }: OwnerStatusBadge) {
  const styles = badgeToneClasses(tone);

  return (
    <span
      className={cx(
        'owner-shell-status-pill',
        styles.shell,
      )}
    >
      <span className={cx('owner-shell-status-dot', styles.dot)} />
      {label}
    </span>
  );
}

export function OwnerPageHeader({
  title,
  subtitle,
  badge,
  actions,
}: OwnerPageHeaderProps) {
  return (
    <section className="owner-shell-page-header">
      <div>
        <h2>{title}</h2>
        <div className="owner-shell-page-header-copy">{subtitle}</div>
      </div>

      <div className="owner-shell-header-actions">
        {badge ? <OwnerStatusPill {...badge} /> : null}
        {actions}
      </div>
    </section>
  );
}

export function OwnerCard({ title, badge, action, children }: OwnerCardProps) {
  return (
    <section className="owner-shell-card">
      <div className="owner-shell-card-head">
        <div className="flex items-center gap-2">
          <strong>{title}</strong>
          {badge ? (
            <span className="owner-shell-nav-pill">
              {badge}
            </span>
          ) : null}
        </div>

        {action}
      </div>

      <div className="owner-shell-card-body">{children}</div>
    </section>
  );
}

export function OwnerStatCard({ label, value }: OwnerStatCardProps) {
  return (
    <div className="owner-shell-stat-card">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

export function OwnerActionButton({
  children,
  variant = 'default',
  type = 'button',
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: 'default' | 'primary';
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        'owner-shell-button',
        variant === 'primary' && 'primary',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function OwnerEmptyState({
  title,
  description,
  action,
}: OwnerEmptyStateProps) {
  return (
    <div className="owner-shell-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function OwnerViewState({
  title,
  description,
  tone = 'empty',
  action,
}: OwnerViewStateProps) {
  const toneClasses =
    tone === 'error' ? 'error' : tone === 'loading' ? 'loading' : 'empty';

  return (
    <div className={cx('owner-shell-view-state', toneClasses)}>
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function OwnerDataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyState,
}: OwnerTableProps<T>) {
  if (rows.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="owner-shell-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="bg-white">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    column.align === 'right' && 'text-right',
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
