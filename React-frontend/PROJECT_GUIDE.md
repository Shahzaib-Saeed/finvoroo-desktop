# Project Component & Library Reference Guide

## Core UI Components (shadcn/ui based)

### Layout Components
| Component | Import Path | Usage |
|-----------|-------------|-------|
| Dialog | `@/components/ui/dialog` | Modal dialogs (CreateAccountDialog, AlertDialog) |
| AlertDialog | `@/components/ui/alert-dialog` | Confirmation dialogs (delete confirmations) |
| Popover | `@/components/ui/popover` | Dropdown suggestions (account search) |
| Sheet | `@/components/ui/sheet` | Side panels (AccountTypesSheet) |
| ScrollArea | `@/components/ui/scroll-area` | Scrollable containers |

### Form Components
| Component | Import Path | Usage |
|-----------|-------------|-------|
| Input | `@/components/ui/input` | Text inputs |
| Label | `@/components/ui/label` | Form labels |
| Select | `@/components/ui/select` | Dropdown selects |
| Switch | `@/components/ui/switch` | Toggle switches |
| Textarea | `@/components/ui/textarea` | Multi-line text |
| Button | `@/components/ui/button` | All buttons |

### Data Display Components
| Component | Import Path | Usage |
|-----------|-------------|-------|
| DataGrid | `@/components/ui/data-grid` | Main data table wrapper |
| DataGridTable | `@/components/ui/data-grid` | Table component |
| DataGridPagination | `@/components/ui/data-grid` | Pagination controls |
| Badge | `@/components/ui/badge` | Status badges (active/inactive) |

### Icons
```jsx
import { 
  Plus, Loader2, Search, Trash2, Edit3, 
  ChevronLeft, ChevronRight, Bell, UserCircle,
  Building2, ArrowLeft, FileText, CheckSquare,
  Clock, XOctagon, MoreHorizontal, Filter,
  Download, Eye, Printer, Send, CreditCard
} from 'lucide-react';
```

## Date Handling
- **Library**: `date-fns` (preferred) or native Date
- **Formatting**: Use `format(date, 'dd MMM yyyy')` from date-fns
- **API dates**: Always in `YYYY-MM-DD` format
- **Display dates**: Use `invoice_date_display` from API (already formatted)

## State Management Pattern
```jsx
// Standard pattern for list pages
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [pagination, setPagination] = useState({ page: 1, perPage: 15 });
const [filters, setFilters] = useState({ search: '', status: '' });
const [confirmDelete, setConfirmDelete] = useState(null);

// Fetch with debounce
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await api.get('/workspace/invoices', { 
      params: { ...pagination, ...filters } 
    });
    setData(res.data.data);
  } finally {
    setLoading(false);
  }
}, [pagination, filters]);

// Debounced filter change
const debouncedSearch = useMemo(
  () => debounce((val) => setFilters(f => ({...f, search: val})), 300),
  []
);
```

## API Integration
```jsx
import api from '@/lib/api';

// GET with params
const res = await api.get('/workspace/invoices', { 
  params: { search, status, per_page: 15, page: 1 } 
});

// POST
const res = await api.post('/workspace/invoices', payload);

// PUT
const res = await api.put(`/workspace/invoices/${id}`, payload);

// DELETE
await api.delete(`/workspace/invoices/${id}`);
```

## Toast Notifications
```jsx
import { toast } from 'sonner';

toast.success('Invoice created successfully.');
toast.error('Failed to create invoice.');
toast.info('Please select a customer.');
```

## Standard Page Structure
```jsx
// 1. Layout wrapper
<WorkspaceLayout>
  {/* 2. Header with title + actions */}
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-xl font-semibold">Invoices</h1>
    <Button onClick={() => setOpen(true)}>
      <Plus className="size-4 mr-1" /> Create Invoice
    </Button>
  </div>
  
  {/* 3. Stats cards (optional) */}
  <div className="grid grid-cols-4 gap-4 mb-6">...</div>
  
  {/* 4. Filters */}
  <div className="flex gap-3 mb-4">
    <Input placeholder="Search..." />
    <Select>...</Select>
    <Button variant="outline">Filters</Button>
  </div>
  
  {/* 5. Data table */}
  <DataGrid>...</DataGrid>
  
  {/* 6. Dialogs (at bottom) */}
  <CreateInvoiceDialog open={open} onOpenChange={setOpen} />
  <AlertDialog>...</AlertDialog>
</WorkspaceLayout>
```

## Status Badge Colors
```jsx
const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};
```

## Common Table Columns Pattern
```jsx
const columns = useMemo(() => [
  {
    accessorKey: 'invoice_number',
    header: 'Invoice #',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.invoice_number}</span>
    ),
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    cell: ({ row }) => row.original.customer?.name || '-',
  },
  {
    accessorKey: 'total',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.total),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(row.original)}>
          <Edit3 className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row.original)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    ),
  },
], []);
```

## Currency Formatting
```jsx
const formatCurrency = (value, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
};
```

## Session Expiry Handling
Token expiry is handled by axios interceptor in `api.js`. When 401 is received:
1. Token is cleared from localStorage
2. User is redirected to `/auth/signin`
3. Toast shows "Session expired. Please login again."
