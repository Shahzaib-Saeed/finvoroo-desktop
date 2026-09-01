import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanyCurrency } from "@/hooks/use-company-currency";
import { documentExplorerApi } from "./api/document-explorer.api";
import { ReportPageShell } from "./components/ReportPageShell";
import {
  DocumentExplorerList,
  documentRowKey,
} from "./document-explorer/DocumentExplorerList";
import { DocumentInspectPanel } from "./document-explorer/DocumentInspectPanel";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "approved", label: "Approved" },
  { value: "posted", label: "Posted" },
  { value: "paid", label: "Paid" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function DocumentExplorerPage() {
  const { id: workspaceId } = useParams();
  const { formatMoney } = useCompanyCurrency(workspaceId);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [documentType, setDocumentType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRow, setSelectedRow] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, documentType, dateFrom, dateTo, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentExplorerApi
      .list({
        search: debouncedSearch || undefined,
        document_type: documentType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        page,
        per_page: 25,
      })
      .then((res) => {
        if (cancelled) return;
        const nextRows = Array.isArray(res.data?.data) ? res.data.data : [];
        setRows(nextRows);
        setMeta(res.data?.meta || null);
        if (Array.isArray(res.data?.meta?.document_types)) {
          setDocumentTypes(res.data.meta.document_types);
        }
        setSelectedRow((prev) => {
          if (!nextRows.length) return null;
          if (
            prev &&
            nextRows.some((r) => documentRowKey(r) === documentRowKey(prev))
          ) {
            return prev;
          }
          return nextRows[0];
        });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message || "Failed to load documents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, documentType, dateFrom, dateTo, status, page]);

  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? rows.length;
  const perPage = meta?.per_page ?? 12;

  const hasFilters = Boolean(
    search || documentType || dateFrom || dateTo || status,
  );

  const clearFilters = () => {
    setSearch("");
    setDocumentType("");
    setDateFrom("");
    setDateTo("");
    setStatus("");
  };

  const selectedKey = selectedRow ? documentRowKey(selectedRow) : null;

  useEffect(() => {
    if (!selectedRow) {
      setDetailData(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    documentExplorerApi
      .show(selectedRow.doc_type, selectedRow.id)
      .then((res) => {
        if (cancelled) return;
        setDetailData(res.data?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err?.response?.data?.message || "Failed to load document details",
        );
        setDetailData(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRow]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Document Explorer"
      subtitle="Search documents and trace linked payments, journal entries, inventory, and audit history."
      contentClassName="w-full"
      standardReportKey="document_explorer"
    >
      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
            <div className="border-b border-border/60 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
                <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                  <Label className="text-[11px] text-muted-foreground">Search</Label>
                  <InputWrapper className="h-9 border-border/70 bg-background">
                    <Search className="size-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Number, party, reference…"
                      className="h-8 text-sm"
                    />
                  </InputWrapper>
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="Start"
                    className="h-9 w-full text-sm"
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="End"
                    className="h-9 w-full text-sm"
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <Select
                    value={status || "all"}
                    onValueChange={(value) =>
                      setStatus(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Type</Label>
                  <Select
                    value={documentType || "all"}
                    onValueChange={(value) =>
                      setDocumentType(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  <span className="font-medium text-foreground">
                    {hasFilters ? "Results" : "Recent documents"}
                  </span>
                  {!loading ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 tabular-nums">
                      {total}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {hasFilters ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <RotateCcw className="size-3" />
                      Reset
                    </Button>
                  ) : null}
                  {total > 0 ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      Page {currentPage} of {lastPage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {rows.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
                  <GitBranch className="size-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No documents found
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {hasFilters
                    ? "Try adjusting your search or filters."
                    : "Documents appear here as you create invoices, bills, payments, and more."}
                </p>
                {hasFilters ? (
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <DocumentExplorerList
                rows={rows}
                formatMoney={formatMoney}
                loading={loading}
                perPage={perPage}
                selectedKey={selectedKey}
                onSelect={setSelectedRow}
                embedded
              />
            )}

            {total > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 text-[11px] text-muted-foreground">
                <span className="tabular-nums">
                  {(currentPage - 1) * perPage + 1}–
                  {Math.min(currentPage * perPage, total)} of {total}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={currentPage >= lastPage || loading}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 xl:col-span-5">
          <DocumentInspectPanel
            data={detailData}
            loading={detailLoading}
            workspaceId={workspaceId}
            formatMoney={formatMoney}
          />
        </div>
      </div>
    </ReportPageShell>
  );
}
