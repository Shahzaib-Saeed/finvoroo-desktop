import { Fragment } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReportEntityDetailsProvider } from './ReportEntityDetailsProvider';
import { ReportFavoriteToggle } from './ReportFavoriteToggle';

function ReportBreadcrumbNav({ items, compact = false }) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'no-print flex flex-wrap items-center gap-1 text-slate-500',
        compact ? 'mb-1 text-[11px]' : 'mb-2 text-xs',
      )}
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.to ? (
            <Link to={item.to} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-primary">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function ReportPageShell({
  workspaceId,
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
  breadcrumbs,
  backTo,
  backLabel = 'Back',
  compact = false,
  hideTitle = false,
  /** Breadcrumbs live in the workspace top bar; set true only for legacy/custom trails. */
  showBreadcrumb = false,
  standardReportKey,
  showFavorite = true,
}) {
  const reportsHub = workspaceId ? `/workspace/${workspaceId}/accounting/reports` : null;
  const pathname = globalThis.location?.pathname || '';
  const isCustomViewer = /\/accounting\/reports\/view\//.test(pathname);
  const inferredReportKey =
    standardReportKey ||
    pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', '_');
  const resolvedBreadcrumbs =
    breadcrumbs != null
      ? breadcrumbs
      : reportsHub
        ? [{ label: 'Reports', to: reportsHub }, { label: title }]
        : [];

  const headerActions = (
    <>
      {showFavorite && workspaceId && !isCustomViewer && inferredReportKey ? (
        <ReportFavoriteToggle
          standardReportKey={inferredReportKey}
          className="size-8 rounded-sm border border-border bg-background hover:bg-muted/50"
        />
      ) : null}
      {actions}
    </>
  );

  const titleBlock = (
    <div className="flex min-w-0 items-start gap-3">
      {backTo ? (
        <Button variant="outline" size="sm" asChild className="mt-0.5 shrink-0">
          <Link to={backTo}>
            <ArrowLeft className="mr-1 size-4" />
            {backLabel}
          </Link>
        </Button>
      ) : null}
      <div className="min-w-0">
        <h1
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              'mt-1 max-w-3xl text-slate-500',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  const shell = (
    <div className={cn(compact || hideTitle ? 'space-y-2' : 'space-y-3', 'min-w-0 max-w-full', className)}>
      {hideTitle ? (
        (backTo ||
          actions ||
          (showFavorite && workspaceId && !isCustomViewer && inferredReportKey)) && (
          <div className="no-print flex flex-wrap items-center justify-end gap-1.5">
            {headerActions}
          </div>
        )
      ) : (
        <>
          {showBreadcrumb && resolvedBreadcrumbs.length ? (
            <ReportBreadcrumbNav items={resolvedBreadcrumbs} compact={compact} />
          ) : null}

          <div
            className={cn(
              'no-print mb-4 flex flex-wrap items-start justify-between gap-3',
              compact && 'mb-2',
            )}
          >
            {titleBlock}
            {actions ||
            (showFavorite && workspaceId && !isCustomViewer && inferredReportKey) ? (
              <div className="flex shrink-0 w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
                {headerActions}
              </div>
            ) : null}
          </div>
        </>
      )}

      <div
        className={cn(
          compact || hideTitle ? 'space-y-2' : 'space-y-3',
          'report-print-root',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );

  if (!workspaceId) return shell;

  return (
    <ReportEntityDetailsProvider workspaceId={workspaceId}>{shell}</ReportEntityDetailsProvider>
  );
}
