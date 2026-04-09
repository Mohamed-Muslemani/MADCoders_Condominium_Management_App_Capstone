import type { OwnerHeaderAction, OwnerLayoutProps } from '../../types/owner';
import { OwnerSidebar } from './OwnerSidebar';
import {
  OwnerActionButton,
  OwnerPageHeader,
} from './OwnerUi';
import { OwnerTopbar } from './OwnerTopbar';
import './owner-shell.css';

function renderAction(action: OwnerHeaderAction) {
  if (action.href) {
    return (
      <a key={action.label} href={action.href}>
        <OwnerActionButton variant={action.variant}>
          {action.label}
        </OwnerActionButton>
      </a>
    );
  }

  return (
    <OwnerActionButton
      key={action.label}
      variant={action.variant}
      onClick={action.onClick}
    >
      {action.label}
    </OwnerActionButton>
  );
}

export function OwnerLayout({
  activeRoute,
  title,
  subtitle,
  user,
  unitLabel,
  navBadges,
  statusBadge,
  topbarActions,
  headerActions,
  showPageHeader = true,
  contentClassName,
  children,
}: OwnerLayoutProps) {
  return (
    <div className="owner-shell">
      <OwnerTopbar user={user} unitLabel={unitLabel} actions={topbarActions} />

      <div className="owner-shell-wrap">
        <OwnerSidebar activeRoute={activeRoute} badges={navBadges} />

        <main className="owner-shell-main">
          {showPageHeader ? (
            <OwnerPageHeader
              title={title}
              subtitle={subtitle}
              badge={statusBadge}
              actions={
                headerActions?.length ? (
                  <div className="owner-shell-header-actions">
                    {headerActions.map(renderAction)}
                  </div>
                ) : undefined
              }
            />
          ) : null}

          <div className={contentClassName ?? 'p-[14px]'}>{children}</div>
        </main>
      </div>
    </div>
  );
}
