import { Link } from 'react-router';
import { Box, Coins, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { INVENTORY_MODELS } from '../constants';
import { SettingsStatTile } from './settings-ui';

export function SettingsCompanySummary({
  company,
  approvalModules = {},
  workspaceId,
  compact = false,
}) {
  const inventoryLabel =
    INVENTORY_MODELS.find((m) => m.value === company?.inventory_model)?.label ||
    company?.inventory_model ||
    '—';

  const approvalOn = Object.values(approvalModules).filter(Boolean).length;
  const approvalTotal = Object.keys(approvalModules).length;
  const base = workspaceId ? `/workspace/${workspaceId}/accounting` : '#';

  if (compact) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="px-4 py-3 border-b bg-gradient-to-br from-muted/50 to-background">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            At a glance
          </p>
          <p className="text-sm font-semibold truncate mt-1">{company?.name || 'Company'}</p>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          <SettingsStatTile icon={Coins} label="Currency" value={company?.currency || '—'} />
          <SettingsStatTile
            icon={Zap}
            label="Auto-post"
            value={company?.auto_post_to_accounting ? 'On' : 'Off'}
            tone={company?.auto_post_to_accounting ? 'success' : 'default'}
          />
          <SettingsStatTile icon={Box} label="Inventory" value={inventoryLabel.split(' ')[0]} />
          <SettingsStatTile icon={ShieldCheck} label="Approvals" value={`${approvalOn}/${approvalTotal}`} />
        </div>
        {workspaceId ? (
          <div className="px-4 py-3 border-t bg-muted/10">
            <Link
              to={`${base}/chart-of-accounts`}
              className="text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Open chart of accounts →
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="px-5 py-4 border-b bg-gradient-to-br from-muted/40 to-background">
        <p className="text-sm font-semibold">{company?.name || 'Company'}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[company?.city, company?.country].filter(Boolean).join(', ') || 'Workspace settings'}
        </p>
      </div>
      <div className="p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Currency</span>
          <span className="font-medium">{company?.currency || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Box className="size-3.5" />
            Inventory
          </span>
          <span className="font-medium text-xs text-right">{inventoryLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3.5" />
            Auto-post
          </span>
          <Badge variant={company?.auto_post_to_accounting ? 'success' : 'outline'} appearance="light">
            {company?.auto_post_to_accounting ? 'On' : 'Off'}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            Approvals
          </span>
          <Badge variant="secondary" className="tabular-nums">
            {approvalOn}/{approvalTotal}
          </Badge>
        </div>
      </div>
      {workspaceId ? (
        <div className="px-5 py-3 border-t bg-muted/10">
          <Link to={`${base}/chart-of-accounts`} className="text-xs font-medium text-primary hover:underline">
            Chart of accounts →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
