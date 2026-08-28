import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2, MoreHorizontal, Plus, Copy, Trash2, Pencil, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { documentOutputApi, unwrapDoc } from '@/pages/accounting/document-output/api/document-output.api';

/**
 * "Invoice Form Designer" / "Document Designer" — list of print/PDF
 * layouts for invoices and POS receipts. Deliberately not named/routed
 * anywhere near "invoice-templates" (that's the unrelated data-entry-form
 * field customization feature).
 */
export default function DocumentDesignerListPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentType = searchParams.get('type') === 'pos_receipt' ? 'pos_receipt' : 'invoice';
  const [rows, setRows] = React.useState([]);
  const [defaultLayoutId, setDefaultLayoutId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [busyId, setBusyId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [layoutsRes, prefsRes] = await Promise.all([
        documentOutputApi.layouts({ document_type: documentType }),
        documentOutputApi.preferences(),
      ]);
      setRows(unwrapDoc(layoutsRes) || []);
      setDefaultLayoutId(unwrapDoc(prefsRes)?.defaults?.[documentType]?.id ?? null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  React.useEffect(() => {
    load();
  }, [load]);

  const typeQuery = documentType === 'pos_receipt' ? '?type=pos_receipt' : '';
  const openEditor = (id) => navigate(`/workspace/${workspaceId}/accounting/document-output/designer/${id}/edit${typeQuery}`);

  const duplicate = async (row) => {
    setBusyId(row.id);
    try {
      const res = await documentOutputApi.duplicateLayout(row.id);
      const copy = unwrapDoc(res);
      toast.success('Template duplicated');
      await load();
      if (Number(copy?.schema_version) === 2) openEditor(copy.id);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Duplicate failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await documentOutputApi.deleteLayout(confirmDelete.id);
      toast.success('Template deleted');
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Document Designer</h1>
          <p className="text-sm text-muted-foreground">
            Design the printed/PDF layout of your invoices and receipts — drag, resize, and bind live document data.
            This is separate from the invoice entry form fields.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/workspace/${workspaceId}/accounting/document-output/designer/new/edit${typeQuery}`)}
        >
          <Plus className="size-4" />
          New Template
        </Button>
      </div>

      <Tabs
        value={documentType}
        onValueChange={(v) => setSearchParams(v === 'pos_receipt' ? { type: 'pos_receipt' } : {})}
        className="mb-5"
      >
        <TabsList>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="pos_receipt">POS Receipt</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading templates…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const isCanvas = Number(row.schema_version) === 2;
            const isDefault = Number(defaultLayoutId) === Number(row.id);
            return (
              <div key={row.id} className="rounded-lg border bg-background p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.paper?.toUpperCase()} · {row.orientation}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" className="size-7" disabled={busyId === row.id}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isCanvas && !row.is_system && <DropdownMenuItem onClick={() => openEditor(row.id)}>Edit</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => duplicate(row)}>Duplicate</DropdownMenuItem>
                      {!row.is_system && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(row)}>
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {row.is_system && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="size-3" /> System
                    </Badge>
                  )}
                  {isDefault && <Badge className="text-[10px]">Default</Badge>}
                  <Badge variant="outline" className="text-[10px]">
                    {isCanvas ? 'Visual designer' : 'Legacy sections'}
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isCanvas && !row.is_system ? 'outline' : 'secondary'}
                  className="w-full gap-1.5"
                  onClick={() => (isCanvas ? (row.is_system ? duplicate(row) : openEditor(row.id)) : duplicate(row))}
                >
                  {row.is_system ? <Copy className="size-3.5" /> : isCanvas ? <Pencil className="size-3.5" /> : <Copy className="size-3.5" />}
                  {row.is_system ? 'Duplicate to customize' : isCanvas ? 'Edit design' : 'Duplicate as visual template'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{confirmDelete?.name}&rdquo;? This cannot be undone. If this template is currently set as the
              default, you must choose a different default first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === confirmDelete?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busyId === confirmDelete?.id}
              onClick={handleDelete}
            >
              {busyId === confirmDelete?.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
