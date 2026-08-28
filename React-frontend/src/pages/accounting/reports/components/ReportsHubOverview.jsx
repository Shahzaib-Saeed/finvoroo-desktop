import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_TEMPLATES, TEMPLATE_CATEGORY_LABELS } from '../builder/report-templates';
import { OverviewStatCard, OverviewStatsSkeleton } from './overview/OverviewStatCard';
import { TemplatePreviewCard } from './overview/TemplatePreviewCard';
import {
  OverviewCreateCard,
  OverviewReportCard,
  OverviewSharedCard,
} from './overview/OverviewReportCard';
import { ReportHubRow } from './ReportHubRow';
import { definitionOpenPath } from '../lib/report-definition-links';

const MY_PREVIEW = 6;

const TEMPLATE_FILTERS = [
  { id: 'all', label: 'All' },
  ...Object.entries(TEMPLATE_CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
];

export function ReportsHubOverview({
  hub,
  hubLoading,
  workspaceBase,
  standardItemsByKey,
  standardReportCount = 0,
  favoritedDefinitionIds,
  onFavoriteDefinitionChange,
  onUseTemplate,
  onViewAll,
}) {
  const [templateFilter, setTemplateFilter] = useState('all');

  const recent = hub?.recent ?? [];
  const favorites = hub?.favorites ?? [];
  const myReports = hub?.my_reports ?? [];
  const sharedReports = hub?.shared_reports ?? [];

  const totalReports = myReports.length + sharedReports.length + standardReportCount;

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return REPORT_TEMPLATES;
    return REPORT_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  const lastOpenedByDefId = useMemo(() => {
    const map = new Map();
    recent.forEach((view) => {
      const id = view.report_definition?.id;
      if (id && !map.has(id)) map.set(id, view.viewed_at);
    });
    return map;
  }, [recent]);

  const highlightedDefId = useMemo(() => {
    const first = recent.find((v) => v.report_definition?.id);
    return first?.report_definition?.id ?? myReports[0]?.id ?? null;
  }, [recent, myReports]);

  const stats = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total Reports',
        value: totalReports,
        accent: 'blue',
        badge: { text: `${standardReportCount} std`, tone: 'green' },
        onClick: () => onViewAll?.('browse'),
      },
      {
        id: 'my',
        label: 'My Saved',
        value: myReports.length,
        accent: 'purple',
        badge:
          myReports.length > 0
            ? { text: String(myReports.length), tone: 'blue' }
            : undefined,
        onClick: () => onViewAll?.('my'),
      },
      {
        id: 'favorites',
        label: 'Favorites',
        value: favorites.length,
        accent: 'amber',
        badge: {
          text: '',
          tone: 'amber',
          icon: <Star className="size-3 fill-current" />,
        },
        onClick: () => onViewAll?.('favorites'),
      },
      {
        id: 'shared',
        label: 'Shared',
        value: sharedReports.length,
        accent: 'sky',
        badge: {
          text: '',
          tone: 'blue',
          icon: <Users className="size-3" />,
        },
        onClick: () => onViewAll?.('shared'),
      },
      {
        id: 'templates',
        label: 'Templates',
        value: REPORT_TEMPLATES.length,
        accent: 'emerald',
        badge: { text: String(REPORT_TEMPLATES.length), tone: 'green' },
        onClick: () => {
          document.getElementById('overview-templates')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        },
      },
    ],
    [
      totalReports,
      standardReportCount,
      myReports.length,
      favorites.length,
      sharedReports.length,
      onViewAll,
    ],
  );

  if (hubLoading) {
    return (
      <div className="space-y-8">
        <OverviewStatsSkeleton />
        <div className="h-56 animate-pulse rounded-xl bg-slate-50" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <OverviewStatCard key={s.id} {...s} />
        ))}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Custom Reports
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {myReports.length} Saved
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sorted by: <span className="font-medium text-slate-700">Recently Updated</span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {myReports.slice(0, MY_PREVIEW).map((def) => (
            <OverviewReportCard
              key={def.id}
              definition={def}
              workspaceBase={workspaceBase}
              standardItemsByKey={standardItemsByKey}
              isFavorited={favoritedDefinitionIds?.has(def.id)}
              onFavoriteChange={(next) => onFavoriteDefinitionChange?.(def.id, next)}
              highlighted={def.id === highlightedDefId}
              lastOpenedAt={lastOpenedByDefId.get(def.id)}
            />
          ))}

          <OverviewCreateCard to={`${workspaceBase}/accounting/reports/create`} />

          {sharedReports.length === 0 ? (
            <OverviewSharedCard inviteTo={`${workspaceBase}/accounting/permissions`} />
          ) : (
            sharedReports.slice(0, 2).map((def) => (
              <OverviewReportCard
                key={`shared-${def.id}`}
                definition={def}
                workspaceBase={workspaceBase}
                standardItemsByKey={standardItemsByKey}
              />
            ))
          )}
        </div>

        {myReports.length > MY_PREVIEW ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onViewAll?.('my')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all my reports →
            </button>
          </div>
        ) : null}
      </section>

      {favorites.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Favorites
            </h2>
            <button
              type="button"
              onClick={() => onViewAll?.('favorites')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              View all
            </button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.slice(0, 3).map((fav, idx) => {
              if (fav.favoritable_kind === 'standard') {
                const item = standardItemsByKey.get(fav.standard_report_key);
                if (!item) return null;
                return (
                  <ReportHubRow
                    key={`fav-std-${fav.standard_report_key}-${idx}`}
                    title={item.title}
                    description={item.description}
                    to={item.path}
                    icon={item.icon}
                    badge="Standard"
                  />
                );
              }
              if (!fav.report_definition) return null;
              return (
                <ReportHubRow
                  key={`fav-def-${fav.report_definition.id}`}
                  title={fav.report_definition.name}
                  description={fav.report_definition.description}
                  to={definitionOpenPath(fav.report_definition, workspaceBase, standardItemsByKey)}
                  datasetKey={fav.report_definition.dataset_key}
                  badge="Favorite"
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section id="overview-templates">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Standard Templates
              </h2>
              <span className="text-[11px] font-medium text-slate-500">
                ({filteredTemplates.length})
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Start from a ready-made layout for common financial reports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {TEMPLATE_FILTERS.map((f) => {
              const active = templateFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTemplateFilter(f.id)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-slate-800 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((t, i) => (
            <TemplatePreviewCard key={t.id} template={t} index={i} onUse={onUseTemplate} />
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <Link
            to={`${workspaceBase}/accounting/reports/create`}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
          >
            Or use the guided wizard →
          </Link>
        </div>
      </section>
    </div>
  );
}
