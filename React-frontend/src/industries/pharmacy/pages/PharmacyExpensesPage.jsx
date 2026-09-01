import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DatePicker } from '@/components/ui/date-picker';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { expensesApi } from '@/pages/accounting/expenses/api/expenses.api';
import { vendorsApi } from '@/pages/accounting/vendors/api/vendors.api';
import { billPaymentsApi } from '@/pages/accounting/bill-payments/api/bill-payments.api';
import { transfersApi } from '@/pages/accounting/transfers/api/transfers.api';
import {
  APPROVAL_COLORS,
  EMPTY_EXPENSE_FORM,
  buildExpenseFormData,
  buildPharmacyExpenseFormDefaults,
  formatCurrency,
  formFromExpense,
  accountLabel,
} from '@/pages/accounting/expenses/constants';
import { PharmacyExpenseForm } from '../components/PharmacyExpenseForm';

function monthStartIso() {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd');
}

/** API caps per_page at 100 — paginate to build period summary totals. */
async function fetchPeriodExpenses(listParams) {
  const rows = [];
  let page = 1;
  let lastPage = 1;

  do {
    const res = await expensesApi.list(listParams(page, 100));
    const batch = res.data?.data ?? [];
    rows.push(...(Array.isArray(batch) ? batch : []));
    lastPage = Number(res.data?.meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);

  return rows;
}

function validateForm(form) {
  const errors = {};
  if (!form.expense_account_id) errors.expense_account_id = 'Expense account is required';
  if (!String(form.description || '').trim()) errors.description = 'Description is required';
  const amount = parseFloat(form.amount);
  if (!Number.isFinite(amount) || amount < 0.01) errors.amount = 'Amount must be at least 0.01';
  if (!form.expense_date) errors.expense_date = 'Date is required';
  return errors;
}

function newExpenseForm(currencies, expenseAccounts) {
  return {
    ...buildPharmacyExpenseFormDefaults(expenseAccounts, currencies[0] || 'PKR'),
    expense_date: todayIso(),
  };
}

function categoryBadgeClass(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('medicine') || n.includes('pharma')) {
    return 'border-violet-200 bg-violet-50 text-violet-800';
  }
  if (n.includes('general') || n.includes('store')) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function formatPeriodLabel(from, to) {
  if (!from && !to) return 'All dates';
  if (from && to) return `${from} → ${to}`;
  return from || to || 'All dates';
}

function SummaryStat({ label, value, hint, accent }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border border-border/70 bg-card px-3.5 py-2.5 shadow-xs',
        accent,
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PharmacyExpensesPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/pharmacy`;

  const [rows, setRows] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    lastPage: 1,
  });
  const [filters, setFilters] = useState({
    search: '',
    categoryId: 'all',
    dateFrom: monthStartIso(),
    dateTo: todayIso(),
  });
  const [searchInput, setSearchInput] = useState('');

  const [vendors, setVendors] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [currencies, setCurrencies] = useState(['PKR']);
  const [multiCurrency, setMultiCurrency] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_EXPENSE_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [vendorsRes, vendorOptsRes, billPayRes, transferRes, catRes] = await Promise.all([
        vendorsApi.list({ per_page: 100, page: 1 }),
        vendorsApi.formOptions(),
        billPaymentsApi.formOptions(),
        transfersApi.formOptions(),
        productsApi.listCategories(),
      ]);
      setVendors(vendorsRes.data?.data ?? []);
      setExpenseAccounts(vendorOptsRes.data?.data?.expense_accounts ?? []);
      setPaymentAccounts(billPayRes.data?.data?.deposit_accounts ?? []);
      const tData = transferRes.data?.data || {};
      setMultiCurrency(!!tData.multi_currency_enabled);
      const base = tData.base_currency || 'PKR';
      setCurrencies(tData.currencies?.length ? tData.currencies : [base]);
      setForm((f) => ({ ...f, currency: base }));
      const cats = catRes?.data?.data ?? catRes?.data ?? [];
      setCategories(Array.isArray(cats) ? cats.filter((c) => c.is_active !== false) : []);
    } catch {
      toast.error('Could not load expense options.');
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const listParams = useCallback(
    (page, perPage) => {
      const params = {
        page,
        per_page: perPage,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        search: filters.search || undefined,
      };
      if (filters.categoryId === 'shared') {
        params.category_id = 0;
      } else if (filters.categoryId !== 'all') {
        params.category_id = filters.categoryId;
      }
      return params;
    },
    [filters],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await expensesApi.list(listParams(pagination.page, pagination.perPage));
      const items = listRes.data?.data ?? [];
      const meta = listRes.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: Number(meta.total ?? items.length),
        lastPage: Number(meta.last_page ?? 1),
      }));

      try {
        const periodRows = await fetchPeriodExpenses(listParams);
        setSummaryRows(periodRows);
      } catch {
        setSummaryRows(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.per_page?.[0] ||
        'Could not load expenses.';
      toast.error(msg);
      setRows([]);
      setSummaryRows([]);
    } finally {
      setLoading(false);
    }
  }, [listParams, pagination.page, pagination.perPage]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (searchParams.get('new') !== '1' || optionsLoading) return;
    setEditId(null);
    setForm(newExpenseForm(currencies, expenseAccounts));
    setErrors({});
    setSheetOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, optionsLoading, currencies, expenseAccounts, setSearchParams]);

  const summary = useMemo(() => {
    const total = summaryRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const byCategory = {};
    for (const row of summaryRows) {
      const key = row.category?.name || 'Shared / split';
      byCategory[key] = (byCategory[key] || 0) + Number(row.amount || 0);
    }
    return { total, byCategory, count: summaryRows.length };
  }, [summaryRows]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      setFilters((f) => {
        if (f.search === next) return f;
        setPagination((p) => ({ ...p, page: 1 }));
        return { ...f, search: next };
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const periodLabel = useMemo(
    () => formatPeriodLabel(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo],
  );

  const categoryStats = useMemo(() => {
    const entries = Object.entries(summary.byCategory);
    const preferred = ['Medicines', 'General Store', 'Shared / split'];
    const ordered = [];
    for (const key of preferred) {
      if (summary.byCategory[key] != null) ordered.push([key, summary.byCategory[key]]);
    }
    for (const entry of entries) {
      if (!preferred.includes(entry[0])) ordered.push(entry);
    }
    return ordered.slice(0, 3);
  }, [summary.byCategory]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(newExpenseForm(currencies, expenseAccounts));
    setErrors({});
    setSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await expensesApi.destroy(confirmDelete.id);
      toast.success('Expense deleted.');
      setConfirmDelete(null);
      loadRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete expense.');
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = useCallback(async (id) => {
    setEditId(id);
    setSheetOpen(true);
    setLoadingExpense(true);
    setErrors({});
    try {
      const res = await expensesApi.show(id);
      const expense = res.data?.data;
      if (!expense) throw new Error('Not found');
      setForm(formFromExpense(expense));
    } catch {
      toast.error('Could not load expense.');
      setSheetOpen(false);
    } finally {
      setLoadingExpense(false);
    }
  }, []);

  useEffect(() => {
    const editIdParam = searchParams.get('edit');
    if (!editIdParam || optionsLoading) return;
    const id = Number(editIdParam);
    if (!Number.isFinite(id)) return;
    openEdit(id);
    setSearchParams({}, { replace: true });
  }, [searchParams, optionsLoading, openEdit, setSearchParams]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'expense_date_display',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.expense_date_display || row.original.expense_date || '—'}
          </span>
        ),
        size: 100,
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const name = row.original.category?.name;
          if (!name) {
            return (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Shared
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className={cn('font-normal', categoryBadgeClass(name))}>
              {name}
            </Badge>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-md">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.description || row.original.expense_account?.name || '—'}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {row.original.reference || accountLabel(row.original.expense_account)}
            </p>
          </div>
        ),
        size: 220,
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(row.original.amount, row.original.currency)}
          </span>
        ),
        size: 110,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.approval_status || 'approved';
          return (
            <Badge variant="outline" className={cn('font-normal capitalize', APPROVAL_COLORS[status])}>
              {status}
            </Badge>
          );
        },
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => openEdit(row.original.id)}
            >
              <Edit3 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
        size: 90,
      },
    ],
    [openEdit],
  );

  const closeSheet = () => {
    if (saving) return;
    setSheetOpen(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const fd = buildExpenseFormData(form);
      if (editId) {
        await expensesApi.update(editId, fd);
        toast.success('Expense updated.');
      } else {
        await expensesApi.create(fd);
        toast.success('Expense recorded.');
      }
      setSheetOpen(false);
      setEditId(null);
      loadRows();
    } catch (err) {
      const serverErrors = err?.response?.data?.errors || {};
      setErrors(serverErrors);
      toast.error(err?.response?.data?.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.perPage })
          : updater;
      setPagination((p) => ({
        ...p,
        page: next.pageIndex + 1,
        perPage: next.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <Container className="space-y-4 pb-8">
      <PageHeader
        title="Expenses"
        subtitle="Shop costs by category — Medicines, General Store, or shared overhead."
        actions={
          <Button size="sm" onClick={openCreate} disabled={optionsLoading}>
            <Plus className="me-1.5 size-4" />
            New expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryStat
          label="Period total"
          value={formatCurrency(summary.total, currencies[0])}
          hint={`${summary.count} expense${summary.count === 1 ? '' : 's'}`}
        />
        {categoryStats.map(([name, amount]) => (
          <SummaryStat
            key={name}
            label={name}
            value={formatCurrency(amount, currencies[0])}
            accent={
              name.toLowerCase().includes('medicine')
                ? 'border-violet-200/80 bg-violet-50/30'
                : name.toLowerCase().includes('general')
                  ? 'border-amber-200/80 bg-amber-50/30'
                  : undefined
            }
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-col gap-0 border-b p-0">
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Expense ledger</p>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading…' : `${pagination.total} record${pagination.total === 1 ? '' : 's'}`}
                {' · '}
                {periodLabel}
                {' · '}
                Shared costs use{' '}
                <Link to={`${base}/expense-allocation`} className="text-primary hover:underline">
                  allocation rules
                </Link>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={loading}
              onClick={() => loadRows()}
            >
              <RefreshCw className={cn('me-1.5 size-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_11rem_11rem] xl:items-center">
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search description or reference…"
                className="h-8 bg-background ps-8 pe-8 text-xs"
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 size-8"
                  onClick={() => setSearchInput('')}
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>

            <Select
              value={filters.categoryId}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, categoryId: v }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <SelectTrigger className="h-8 w-full bg-background text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="shared">Shared / split</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePicker
              value={filters.dateFrom}
              onChange={(v) => {
                setFilters((f) => ({ ...f, dateFrom: v }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              allowClear={false}
              placeholder="From date"
              triggerProps={{ className: 'h-8 bg-background text-xs' }}
            />

            <DatePicker
              value={filters.dateTo}
              onChange={(v) => {
                setFilters((f) => ({ ...f, dateTo: v }));
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              allowClear={false}
              placeholder="To date"
              triggerProps={{ className: 'h-8 bg-background text-xs' }}
            />
          </div>
        </CardHeader>

        <CardTable className="p-0">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
              <Loader2 className="me-2 size-4 animate-spin" />
              Loading expenses…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Wallet className="size-5 text-muted-foreground" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">No expenses in this period</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Record rent, utilities, chai, or category-specific costs.
                </p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="me-1.5 size-4" />
                New expense
              </Button>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <DataGrid table={table} recordCount={pagination.total} isLoading={loading}>
                <DataGridTable />
                <CardFooter className="border-t px-4 py-2">
                  <DataGridPagination />
                </CardFooter>
              </DataGrid>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 border-b border-slate-200 px-4 py-3 text-left">
            <div className="flex items-center gap-2.5 pe-8">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold">
                  {editId ? 'Edit expense' : 'New expense'}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Amount, date, description, and category. Change expense account if needed.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col bg-slate-50/30">
            {loadingExpense || optionsLoading ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="me-2 size-5 animate-spin" />
                Loading…
              </div>
            ) : (
              <PharmacyExpenseForm
                form={form}
                setField={setField}
                errors={errors}
                categories={categories}
                vendors={vendors}
                expenseAccounts={expenseAccounts}
                paymentAccounts={paymentAccounts}
                currencies={currencies}
                multiCurrency={multiCurrency}
                saving={saving}
                isEdit={Boolean(editId)}
                onSubmit={handleSubmit}
                onCancel={closeSheet}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        title="Delete expense?"
        description={
          confirmDelete
            ? `Remove ${formatCurrency(confirmDelete.amount, confirmDelete.currency)} expense${
                confirmDelete.reference ? ` (${confirmDelete.reference})` : ''
              }? Posted journals will be reversed.`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </Container>
  );
}
