import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { pharmacyApi } from '../api/pharmacy.api';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

export function BatchExpiryPage() {
  const { id: companyId } = useParams();
  const [mode, setMode] = useState('near');
  const [withinDays, setWithinDays] = useState(90);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap(
        await pharmacyApi.expiryReport({ mode, within_days: withinDays }),
      );
      setRows(data?.rows || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load expiry report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode, withinDays]);

  const loadSettings = useCallback(async () => {
    try {
      const data = unwrap(await pharmacyApi.settings());
      setSettings(data?.settings || data || null);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSetting = async (patch) => {
    setSavingSettings(true);
    try {
      const data = unwrap(await pharmacyApi.updateSettings(patch));
      setSettings(data?.settings || data);
      toast.success('Pharmacy settings saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Container className="py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            Batch &amp; Expiry
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Near-expiry and expired batch balances. Stock still posts through shared bills and
            inventory transactions.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/workspace/${companyId}/accounting/products`}>Medicines</Link>
        </Button>
      </div>

      {settings ? (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Sale policies</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.block_expired_sales}
                disabled={savingSettings}
                onCheckedChange={(v) => saveSetting({ block_expired_sales: v })}
              />
              Block expired sales
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.fefo_strict}
                disabled={savingSettings}
                onCheckedChange={(v) => saveSetting({ fefo_strict: v })}
              />
              Strict FEFO picking
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.warn_below_cost}
                disabled={savingSettings}
                onCheckedChange={(v) => saveSetting({ warn_below_cost: v })}
              />
              Warn below cost
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.warn_above_mrp}
                disabled={savingSettings}
                onCheckedChange={(v) => saveSetting({ warn_above_mrp: v })}
              />
              Warn above MRP
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.block_controlled_without_permission}
                disabled={savingSettings}
                onCheckedChange={(v) =>
                  saveSetting({ block_controlled_without_permission: v })
                }
              />
              Block controlled without permission
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!settings.require_rx_note_for_rx}
                disabled={savingSettings}
                onCheckedChange={(v) => saveSetting({ require_rx_note_for_rx: v })}
              />
              Require Rx note on checkout
            </label>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <div>
            <Label className="text-xs text-muted-foreground">Report</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-[160px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="near">Near expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'near' ? (
            <div>
              <Label className="text-xs text-muted-foreground">Within days</Label>
              <Input
                type="number"
                min={1}
                max={365}
                className="w-[120px] mt-1"
                value={withinDays}
                onChange={(e) => setWithinDays(Number(e.target.value) || 90)}
              />
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={loadReport} disabled={loading}>
            {loading ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1" />
            )}
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    <Loader2 className="size-4 inline animate-spin mr-2" />
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No batches in this window.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isExpired =
                    mode === 'expired' ||
                    (row.expiry_date &&
                      String(row.expiry_date).slice(0, 10) < new Date().toISOString().slice(0, 10));
                  return (
                    <TableRow key={`${row.batch_id || row.id}-${row.warehouse_id || ''}`}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {row.product_name || row.name || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.sku || row.product_sku || ''}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {row.batch_number || '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {row.expiry_date || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.quantity_on_hand ?? row.quantity ?? row.qty_on_hand ?? '—'}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="size-3" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Near expiry</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Container>
  );
}
