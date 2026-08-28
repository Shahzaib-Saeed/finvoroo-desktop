import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, ExternalLink, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../api/superadmin.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { setPageTitle } from '@/lib/page-title';
import { authCookies } from '@/auth/auth-cookies';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isCompanyActive(row) {
  return row?.is_active !== false && row?.is_active !== 0;
}

export function SuperAdminOwnerCompaniesPage() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const { setSuperAdminBrowsing } = useAuthStore();

  const [owner, setOwner] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const res = await superadminApi.ownerCompanies(ownerId);
      const data = res.data?.data || {};
      setOwner(data.owner || null);
      setRows(Array.isArray(data.companies) ? data.companies : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load companies');
      setOwner(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    setPageTitle(owner?.name ? `${owner.name} — Companies` : 'Owner companies');
    load();
  }, [load, owner?.name]);

  const handleEnterWorkspace = useCallback(
    (company) => {
      if (!isCompanyActive(company)) {
        toast.error('That company is not active.');
        return;
      }
      authCookies.setCompanyId(company.id);
      setSuperAdminBrowsing(ownerId);
      navigate(`/workspace/${company.id}`);
    },
    [navigate, ownerId, setSuperAdminBrowsing],
  );

  const columns = useMemo(
    () => [
      {
        id: 'company',
        header: 'Company',
        accessorKey: 'name',
        cell: ({ row }) => {
          const company = row.original;
          return (
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.type || '—'}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
          const { city, country } = row.original;
          if (!city && !country) return '—';
          return [city, country].filter(Boolean).join(', ');
        },
      },
      {
        id: 'currency',
        header: 'Currency',
        accessorKey: 'currency',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          isCompanyActive(row.original) ? (
            <Badge variant="success" appearance="light">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      {
        id: 'created_at',
        header: 'Created',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const company = row.original;
          return (
            <Button
              variant="outline"
              size="sm"
              disabled={!isCompanyActive(company)}
              onClick={() => handleEnterWorkspace(company)}
            >
              <ExternalLink className="size-4" />
              Enter workspace
            </Button>
          );
        },
      },
    ],
    [handleEnterWorkspace],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <>
      <PageHeader
        title={owner?.name ? `${owner.name}'s companies` : 'Owner companies'}
        subtitle={owner?.email || 'Companies owned by this account'}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/account-owners">Back to account owners</Link>
          </Button>
        }
      />

      <DataGrid table={table} recordCount={table.getFilteredRowModel().rows.length} loading={loading}>
        <Card>
          <CardHeader className="py-4">
            <CardToolbar>
              <div className="relative w-full max-w-xs">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies…"
                  className="ps-9"
                />
              </div>
            </CardToolbar>
          </CardHeader>

          <CardTable>
            <ScrollArea className="w-full">
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          <CardFooter className="py-3">
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>
    </>
  );
}
