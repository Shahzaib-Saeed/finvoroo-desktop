import { useEffect, useMemo, useState } from "react";
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
    title: "Custom Layout Models",
    aside: (n) =>
      n ? `${n} saved custom view${n === 1 ? "" : "s"}` : "Build your own layouts",
    dot: "bg-blue-500",
  },
  financial: {
    title: "Financial Statements",
    aside: () => "GAAP / IFRS Compliant",
    dot: "bg-emerald-500",
  },
  ledger: {
    title: "General Ledger & Posting",
    aside: () => "Audit & Account Verification",
    dot: "bg-violet-500",
  },
  "ar-ap": {
    title: "Receivables & Payables",
    aside: () => "Collections & Vendor Payables",
    dot: "bg-teal-500",
  },
  inventory: {
    title: "Inventory",
    aside: () => "Stock & Valuation",
    dot: "bg-emerald-500",
  },
  compliance: {
    title: "Tax & Compliance",
    aside: () => "Statutory & Tax Summaries",
    dot: "bg-amber-500",
  },
  traceability: {
    title: "Traceability",
    aside: () => "Document & Job Trails",
    dot: "bg-sky-500",
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
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {meta.title}
        </h2>
      </div>
      {aside ? (
        <span className="shrink-0 text-[12px] font-medium text-slate-400">
          {aside}
        </span>
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

  useEffect(() => {
    setHubLoading(true);
    reportCenterApi
      .index()
      .then(({ data }) => setHub(data?.data ?? null))
      .catch(() => setHub(null))
      .finally(() => setHubLoading(false));
  }, []);

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

  const primarySectionIds = ["financial", "ledger", "ar-ap"];
  const allCustomCount = hub?.my_reports?.length ?? 0;

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
        label: "All Reports",
        count: standardTotal + customCount,
      },
      {
        id: "financial",
        label: "Financial Statements",
        count: countFor("financial"),
      },
      { id: "ledger", label: "General Ledger", count: countFor("ledger") },
      {
        id: "ar-ap",
        label: "Receivables & Payables",
        count: countFor("ar-ap"),
      },
      { id: "custom", label: "Custom Views", count: customCount },
    ];
  }, [filteredSections, customReports.length]);

  const showingCount = useMemo(() => {
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
  }, [categoryFilter, filteredSections, customReports.length]);

  const showCustom =
    (categoryFilter === "all" || categoryFilter === "custom") &&
    (!q || customReports.length > 0 || categoryFilter === "custom");

  const visibleStandardSections = filteredSections.filter((section) => {
    if (categoryFilter === "custom") return false;
    if (categoryFilter === "all") {
      return (
        primarySectionIds.includes(section.id) ||
        !primarySectionIds.includes(section.id)
      );
    }
    return section.id === categoryFilter;
  });

  const createPath = `${base}/accounting/reports/create`;
  const hasAnyResults =
    (showCustom && (customReports.length > 0 || !q)) ||
    visibleStandardSections.length > 0;

  return (
    <div className="w-full min-w-0 space-y-6 pt-1">
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
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
            <Inbox className="size-5" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No reports match “{search.trim()}”
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
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
        <div className="space-y-8">
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
                      className="min-h-[88px] rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50"
                    />
                  ))}
                </div>
              ) : (
                <div className={REPORT_HUB_GRID_CLASS}>
                  {!q ? <BuildNewCustomViewCard to={createPath} /> : null}
                  {customReports.map((def, index) => {
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
                {section.items.map((item) => (
                    <ReportTile
                      key={item.path}
                      title={item.title}
                      description={item.description}
                      path={item.path}
                      icon={item.icon}
                      iconClass={item.iconClass}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
