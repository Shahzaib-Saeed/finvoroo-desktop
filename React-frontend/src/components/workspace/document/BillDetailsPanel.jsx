import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { billsApi } from '@/pages/accounting/bills/api/bills.api';
import { BillShowDetail } from '@/pages/accounting/bills/components/BillShowDetail';

export function BillDetailsPanel({ billId, workspaceId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBill = useCallback(async () => {
    if (!billId) return;
    setLoading(true);
    try {
      const res = await billsApi.show(billId);
      setBill(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load bill');
      setBill(null);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    setBill(null);
    fetchBill();
  }, [fetchBill]);

  if (!billId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="size-10 opacity-50" />
        <p className="text-sm">Bill not found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4">
        <BillShowDetail bill={bill} workspaceId={workspaceId} />
      </div>
    </ScrollArea>
  );
}
