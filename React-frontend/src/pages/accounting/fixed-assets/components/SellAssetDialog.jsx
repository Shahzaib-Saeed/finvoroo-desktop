import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import { billPaymentsApi } from '../../bill-payments/api/bill-payments.api';
import { formatCurrency, accountLabel } from '../constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const today = () => new Date().toISOString().slice(0, 10);

export function SellAssetDialog({ asset, open, onOpenChange, onSuccess }) {
  const [saleDate, setSaleDate] = useState(today());
  const [salePrice, setSalePrice] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaleDate(today());
    setSalePrice('');
    setPaymentAccountId('');
    billPaymentsApi
      .formOptions()
      .then((res) => {
        const accounts = res.data?.data?.deposit_accounts ?? [];
        setDepositAccounts(Array.isArray(accounts) ? accounts : []);
      })
      .catch(() => {});
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = parseFloat(salePrice);
    if (!saleDate) {
      toast.error('Sale date is required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Valid sale price is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sale_date: saleDate,
        sale_price: price,
      };
      if (paymentAccountId) payload.payment_account_id = parseInt(paymentAccountId, 10);
      const res = await fixedAssetsApi.sell(asset.id, payload);
      toast.success(res.data?.message || 'Asset sold');
      onOpenChange(false);
      onSuccess?.(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not sell asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Sell asset</DialogTitle>
            <DialogDescription>
              Net book value:{' '}
              <strong className="text-foreground">
                {formatCurrency(asset?.net_book_value)}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>
                Sale date <span className="text-destructive">*</span>
              </Label>
              <DatePicker value={saleDate} onChange={setSaleDate} />
            </div>
            <div className="space-y-2">
              <Label>
                Sale price <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit to (bank / cash)</Label>
              <Select
                value={paymentAccountId || 'default'}
                onValueChange={(v) => setPaymentAccountId(v === 'default' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  {depositAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {accountLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Sell asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
