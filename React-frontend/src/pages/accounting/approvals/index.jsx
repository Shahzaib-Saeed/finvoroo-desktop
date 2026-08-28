import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Inbox, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { approvalsApi } from './api/approvals.api';
import { ApprovalActions } from './components/ApprovalActions';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCan } from '@/hooks/use-can';

export function ApprovalsHubPage() {
  const { id: workspaceId } = useParams();
  const canView = useCan('approvals.view');
  const canManage = useCan('approvals.manage');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [inboxRes, statsRes] = await Promise.all([
        approvalsApi.inbox(module === 'all' ? undefined : { module }),
        approvalsApi.stats(),
      ]);
      setItems(inboxRes.data?.data?.items || []);
      setStats(statsRes.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load approvals inbox');
    } finally {
      setLoading(false);
    }
  }, [canView, module]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (row) =>
        String(row.document_label || '').toLowerCase().includes(term) ||
        String(row.module || '').toLowerCase().includes(term) ||
        String(row.step_name || '').toLowerCase().includes(term),
    );
  }, [items, q]);

  if (!canView) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You do not have permission to view approvals.
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">Review pending documents assigned to you.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button asChild variant="outline">
              <Link to={`/workspace/${workspaceId}/accounting/workflows`}>Workflow designer</Link>
            </Button>
          )}
          <Button type="button" variant="mono" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="ml-1">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Pending', value: stats?.pending, icon: Inbox },
          { label: 'Waiting', value: stats?.waiting, icon: Inbox },
          { label: 'Approved today', value: stats?.approved_today, icon: CheckCircle2 },
          { label: 'Rejected today', value: stats?.rejected_today, icon: XCircle },
          { label: 'Returned today', value: stats?.returned_today, icon: RotateCcw },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <card.icon className="size-3.5" />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{card.value ?? '—'}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <CardTitle className="text-base">Inbox</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-48"
              />
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {[
                    'expense',
                    'bill',
                    'invoice',
                    'payment',
                    'bill_payment',
                    'purchase_order',
                    'vendor_credit',
                    'stock_adjustment',
                    'transfer',
                    'deposit',
                    'withdrawal',
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2 px-6">
              <div>No pending approvals.</div>
              <div className="text-xs max-w-md mx-auto">
                Documents appear here only when they are <span className="font-medium">pending</span> and
                assigned to your role. Company owners auto-approve on create. Enable the module in
                Settings → Approvals (or create an active workflow), then create the document as a
                manager/employee.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium">Document</th>
                    <th className="px-4 py-2.5 font-medium">Module</th>
                    <th className="px-4 py-2.5 font-medium">Step</th>
                    <th className="px-4 py-2.5 font-medium">Submitted</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.instance_id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {row.spa_path ? (
                          <Link className="font-medium hover:underline" to={row.spa_path}>
                            {row.document_label}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.document_label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{String(row.module || '').replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3">{row.step_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <ApprovalActions
                            type={row.document_type || row.module}
                            recordId={row.document_id}
                            status={row.approval_status || 'pending'}
                            onUpdated={load}
                            compact
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default ApprovalsHubPage;
