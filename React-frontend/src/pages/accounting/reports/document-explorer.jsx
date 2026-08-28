import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Files,
  GitBranch,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        // Auto-select first row if no selection or previous selection no longer visible
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
      subtitle="Search every business document and trace linked payments, credits, journal entries, inventory movement, and audit history."
      contentClassName="w-full"
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-10">
        {/* Left: List Pane */}
        <div className="min-w-0 lg:col-span-6">
          <Card className="mb-5 overflow-hidden">
            <CardHeader className="border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-base">Find documents</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Search and narrow the complete document history.
                  </p>
                </div>
              </div>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  <RotateCcw className="size-3.5" />
                  Reset filters
                </Button>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-2 xl:col-span-4">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Search
                  </Label>
                  <InputWrapper className="h-10 border-input bg-background shadow-none">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Number, party, reference or product…"
                      className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </InputWrapper>
                </div>

                <div className="space-y-1.5 xl:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    From date
                  </Label>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="Start date"
                    className="h-10 w-full bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5 xl:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    To date
                  </Label>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="End date"
                    className="h-10 w-full bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5 xl:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={status || "all"}
                    onValueChange={(value) =>
                      setStatus(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-10 w-full bg-background text-sm">
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

                <div className="space-y-1.5 xl:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Document type
                  </Label>
                  <Select
                    value={documentType || "all"}
                    onValueChange={(value) =>
                      setDocumentType(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-10 w-full bg-background text-sm">
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
            </CardContent>
          </Card>

          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <Files className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {hasFilters ? "Search results" : "Recent documents"}
              </span>
              {!loading ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {total} {total === 1 ? "document" : "documents"}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {total > 0 ? (
                <span className="font-medium tabular-nums">
                  Page {currentPage} of {lastPage}
                </span>
              ) : null}
            </div>
          </div>

          {/* List */}
          {rows.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <GitBranch className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No documents found
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasFilters
                  ? "Try adjusting your search or filters to find what you need."
                  : "Documents will appear here as you create invoices, bills, payments, and more."}
              </p>
              {hasFilters ? (
                <Button
                  className="mt-4"
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
            />
          )}

          {/* Pagination */}
          {total > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border px-1 pt-4 text-xs text-muted-foreground">
              <span className="font-medium tabular-nums">
                Showing {(currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={currentPage >= lastPage || loading}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Inspect Panel */}
        <div className="min-w-0 lg:col-span-4">
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
