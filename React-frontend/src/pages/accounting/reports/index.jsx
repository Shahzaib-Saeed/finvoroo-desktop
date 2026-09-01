import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileSpreadsheet, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getReportHubSections } from "./constants";
import {
  ReportTile,
  BuildNewCustomViewCard,
  REPORT_HUB_GRID_CLASS,
} from "./components/ReportCard";
import { ReportsHubHeader } from "./components/ReportsHubHeader";
import {
  definitionEditPath,
  definitionOpenPath,
  recordViewPayload,
} from "./lib/report-definition-links";
import { reportCenterApi } from "./api/report-center.api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function norm(s) {
  return (s || "").toLowerCase().trim();
}

const SECTION_META = {
  custom: {
    title: "Custom views",
    aside: (n) =>
      n ? `${n} saved layout${n === 1 ? "" : "s"}` : "Build your own layouts",
  },
  financial: {
    title: "Financial statements",
    aside: () => "Income, position & cash flow",
  },
  ledger: {
    title: "General ledger & posting",
    aside: () => "Trial balance & account detail",
  },
  "ar-ap": {
    title: "Receivables & payables",
    aside: () => "Customer & vendor balances",
  },
  inventory: {
    title: "Inventory",
    aside: () => "Stock, movement & valuation",
  },
  compliance: {
    title: "Tax & compliance",
    aside: () => "VAT summaries & audit trail",
  },
  traceability: {
    title: "Traceability",
    aside: () => "Document trails",
  },
};

function favoriteKeyForPath(path) {
  const last = (path || "").split("/").filter(Boolean).pop() || "";
  return last.replace(/-/g, "_");
}

function SectionHeading({ sectionId, count }) {
  const meta = SECTION_META[sectionId];
  if (!meta) return null;
  const aside = meta.aside(count ?? 0);
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground">{meta.title}</h2>
      {aside ? (
        <span className="shrink-0 text-xs text-muted-foreground">{aside}</span>
      ) : null}
    </div>
  );
}

export function AccountingReportsHubPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}`;

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [hub, setHub] = useState(null);
  const [hubLoading, setHubLoading] = useState(true);

  const loadHub = useCallback(() => {
    setHubLoading(true);
    return reportCenterApi
      .index()
      .then(({ data }) => setHub(data?.data ?? null))
      .catch(() => setHub(null))
      .finally(() => setHubLoading(false));
  }, []);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  const sections = useMemo(
    () => getReportHubSections(workspaceId),
    [workspaceId],
  );

  const allItems = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          sectionId: section.id,
        })),
      ),
    [sections],
  );

  const standardItemsByKey = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => map.set(favoriteKeyForPath(item.path), item));
    return map;
  }, [allItems]);

  const favoritedStandardKeys = useMemo(() => {
    const set = new Set();
    (hub?.favorites ?? []).forEach((f) => {
      if (f.favoritable_kind === "standard" && f.standard_report_key) {
        set.add(f.standard_report_key);
      }
    });
    return set;
  }, [hub?.favorites]);

  const q = norm(search);

  const customReports = useMemo(() => {
    const list = hub?.my_reports ?? [];
    if (!q) return list;
    return list.filter(
      (r) =>
        norm(r.name).includes(q) ||
        norm(r.description).includes(q) ||
        norm(r.dataset_key).includes(q),
    );
  }, [hub?.my_reports, q]);

  const handleDefinitionArchived = (definitionId) => {
    setHub((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        my_reports: (prev.my_reports || []).filter(
          (r) => r.id !== definitionId,
        ),
        shared_reports: (prev.shared_reports || []).filter(
          (r) => r.id !== definitionId,
        ),
        favorites: (prev.favorites || []).filter(
          (f) =>
            !(
              f.favoritable_kind === "definition" &&
              f.report_definition?.id === definitionId
            ),
        ),
      };
    });
  };

  const handleDeleteDefinition = async (def) => {
    try {
      await reportCenterApi.archiveDefinition(def.id);
      toast.success(`"${def.name}" deleted`);
      handleDefinitionArchived(def.id);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not delete this report.",
      );
    }
  };

  const allCustomCount = hub?.my_reports?.length ?? 0;
  const favoritesCount = hub?.favorites?.length ?? 0;

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => {
        const items = q
          ? section.items.filter(
              (item) =>
                norm(item.title).includes(q) ||
                norm(item.description).includes(q),
            )
          : section.items;
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [sections, q]);

  const filters = useMemo(() => {
    const countFor = (id) =>
      filteredSections.find((s) => s.id === id)?.items.length ?? 0;
    const customCount = customReports.length;
    const standardTotal = filteredSections.reduce(
      (n, s) => n + s.items.length,
      0,
    );

    return [
      {
        id: "all",
        label: "All",
        count: standardTotal + customCount,
      },
      {
        id: "favorites",
        label: "Favorites",
        count: favoritesCount,
      },
      {
        id: "financial",
        label: "Financial",
        count: countFor("financial"),
      },
      { id: "ledger", label: "Ledger", count: countFor("ledger") },
      {
        id: "ar-ap",
        label: "AR / AP",
        count: countFor("ar-ap"),
      },
      {
        id: "inventory",
        label: "Inventory",
        count: countFor("inventory"),
      },
      {
        id: "compliance",
        label: "Compliance",
        count: countFor("compliance"),
      },
      { id: "custom", label: "Custom", count: customCount },
    ];
  }, [filteredSections, customReports.length, favoritesCount]);

  const showingCount = useMemo(() => {
    if (categoryFilter === "favorites") return favoritesCount;
    if (categoryFilter === "all") {
      return (
        filteredSections.reduce((n, s) => n + s.items.length, 0) +
        customReports.length
      );
    }
    if (categoryFilter === "custom") return customReports.length;
    return (
      filteredSections.find((s) => s.id === categoryFilter)?.items.length ?? 0
    );
  }, [categoryFilter, filteredSections, customReports.length, favoritesCount]);

  const showCustom =
    (categoryFilter === "all" || categoryFilter === "custom") &&
    (!q || customReports.length > 0 || categoryFilter === "custom");

  const visibleStandardSections = filteredSections.filter((section) => {
    if (categoryFilter === "custom" || categoryFilter === "favorites")
      return false;
    if (categoryFilter === "all") return true;
    return section.id === categoryFilter;
  });

  const createPath = `${base}/accounting/reports/create`;

  const favoriteItemsForGrid = useMemo(() => {
    if (categoryFilter !== "favorites") return [];
    return (hub?.favorites ?? [])
      .map((fav, idx) => {
        if (fav.favoritable_kind === "standard") {
          const item = standardItemsByKey.get(fav.standard_report_key);
          if (!item) return null;
          return {
            key: `fav-std-${fav.standard_report_key}-${idx}`,
            type: "standard",
            item,
          };
        }
        if (!fav.report_definition) return null;
        return {
          key: `fav-def-${fav.report_definition.id}`,
          type: "definition",
          def: fav.report_definition,
        };
      })
      .filter(Boolean);
  }, [categoryFilter, hub?.favorites, standardItemsByKey]);

  const hasAnyResults =
    categoryFilter === "favorites"
      ? favoriteItemsForGrid.length > 0
      : (showCustom && (customReports.length > 0 || !q)) ||
        visibleStandardSections.length > 0;

  const renderStandardTile = (item) => {
    const reportKey = favoriteKeyForPath(item.path);
    return (
      <ReportTile
        key={item.path}
        title={item.title}
        description={item.description}
        path={item.path}
        icon={item.icon}
        iconClass={item.iconClass}
        standardReportKey={reportKey}
        isFavorited={favoritedStandardKeys.has(reportKey)}
        onFavoriteChange={() => loadHub()}
      />
    );
  };

  return (
    <div className="w-full min-w-0 space-y-5 pt-1">
      <ReportsHubHeader
        base={base}
        filters={filters}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        showingCount={showingCount}
        totalCount={allItems.length + allCustomCount}
        search={search}
        onSearchChange={setSearch}
      />

      {!hasAnyResults && q ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card py-14 text-center shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border/70 bg-muted text-muted-foreground">
            <Inbox className="size-5" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            No reports match “{search.trim()}”
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Try another keyword, or clear search to browse all reports.
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={() => setSearch("")}
          >
            Show all reports
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryFilter === "favorites" ? (
            <section>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
                <span className="text-xs text-muted-foreground">
                  {favoriteItemsForGrid.length} pinned
                </span>
              </div>
              {favoriteItemsForGrid.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Star any report from the browse view to pin it here.
                  </p>
                </div>
              ) : (
                <div className={cn(REPORT_HUB_GRID_CLASS, "gap-2")}>
                  {favoriteItemsForGrid.map((entry) => {
                    if (entry.type === "standard") {
                      return renderStandardTile(entry.item);
                    }
                    const def = entry.def;
                    const openPath = definitionOpenPath(
                      def,
                      base,
                      standardItemsByKey,
                    );
                    const editPath = definitionEditPath(def, base);
                    return (
                      <ReportTile
                        key={entry.key}
                        title={def.name}
                        description={
                          def.description ||
                          "Saved custom layout with your filters and columns"
                        }
                        path={openPath}
                        editPath={editPath}
                        icon={FileSpreadsheet}
                        reportDefinitionId={def.id}
                        isFavorited
                        onFavoriteChange={() => loadHub()}
                        onNavigate={() => {
                          const payload = recordViewPayload(def);
                          if (payload)
                            reportCenterApi.recordView(payload).catch(() => {});
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {showCustom ? (
            <section>
              <SectionHeading
                sectionId="custom"
                count={customReports.length}
              />
              {hubLoading && customReports.length === 0 && !q ? (
                <div className={REPORT_HUB_GRID_CLASS}>
                  <BuildNewCustomViewCard to={createPath} />
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="min-h-[72px] animate-pulse rounded-xl border border-border/70 bg-muted/40"
                    />
                  ))}
                </div>
              ) : (
                <div className={REPORT_HUB_GRID_CLASS}>
                  {!q ? <BuildNewCustomViewCard to={createPath} /> : null}
                  {customReports.map((def) => {
                    const openPath = definitionOpenPath(
                      def,
                      base,
                      standardItemsByKey,
                    );
                    const editPath = definitionEditPath(def, base);
                    return (
                      <ReportTile
                        key={def.id}
                        title={def.name}
                        description={
                          def.description ||
                          "Saved custom layout with your filters and columns"
                        }
                        path={openPath}
                        editPath={editPath}
                        icon={FileSpreadsheet}
                        onDelete={() => handleDeleteDefinition(def)}
                        onNavigate={() => {
                          const payload = recordViewPayload(def);
                          if (payload)
                            reportCenterApi.recordView(payload).catch(() => {});
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {visibleStandardSections.map((section) => (
            <section key={section.id}>
              <SectionHeading
                sectionId={section.id}
                count={section.items.length}
              />
              <div className={REPORT_HUB_GRID_CLASS}>
                {section.items.map((item) => renderStandardTile(item))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
