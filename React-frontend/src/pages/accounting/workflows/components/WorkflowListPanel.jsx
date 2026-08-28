import {
  Archive,
  Copy,
  MoreHorizontal,
  Pencil,
  Search,
  Workflow,
} from 'lucide-react';
import { FlowBadge } from './FlowBadges';
import { moduleMeta } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function WorkflowListPanel({
  workflows,
  query,
  moduleFilter,
  statusFilter,
  onQueryChange,
  onModuleFilter,
  onStatusFilter,
  onEdit,
  onDuplicate,
  onArchive,
  selectedId,
}) {
  const filtered = workflows.filter((wf) => {
    const q = query.trim().toLowerCase();
    if (q && !String(wf.name || '').toLowerCase().includes(q) && !String(wf.module || '').includes(q)) {
      return false;
    }
    if (moduleFilter !== 'all' && wf.module !== moduleFilter) return false;
    if (statusFilter === 'active' && !wf.is_active) return false;
    if (statusFilter === 'inactive' && wf.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search workflows…"
            className="pl-8"
          />
        </div>
        <Select value={moduleFilter} onValueChange={onModuleFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {[...new Set(workflows.map((w) => w.module))].map((m) => (
              <SelectItem key={m} value={m}>
                {moduleMeta(m).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center px-6">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Workflow className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No workflows yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Create your first approval workflow, or start from a ready-made template below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map((wf) => {
            const meta = moduleMeta(wf.module);
            const stepCount = wf.steps?.length || 0;
            const selected = selectedId === wf.id;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => onEdit(wf)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                  selected ? 'border-foreground bg-muted/30' : 'bg-background hover:bg-muted/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{wf.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {wf.description || `Approvals for ${meta.label.toLowerCase()}`}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button type="button" size="icon" variant="ghost" className="shrink-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEdit(wf)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(wf)}>
                        <Copy className="size-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onArchive(wf)}
                      >
                        <Archive className="size-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <FlowBadge tone={wf.is_active ? 'manager' : 'muted'}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </FlowBadge>
                  <FlowBadge tone="muted">{meta.label}</FlowBadge>
                  <FlowBadge tone="muted">{stepCount} steps</FlowBadge>
                  <FlowBadge tone="muted">Priority {wf.priority}</FlowBadge>
                </div>

                <div className="mt-3 text-[11px] text-muted-foreground">
                  Updated {wf.updated_at ? new Date(wf.updated_at).toLocaleString() : '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
