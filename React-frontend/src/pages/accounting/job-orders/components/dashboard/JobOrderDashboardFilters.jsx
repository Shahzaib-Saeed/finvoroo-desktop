import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export function JobOrderDashboardFilters({
  filters,
  filterOptions,
  onChange,
  onReset,
  disabled,
}) {
  const customers = filterOptions?.customers || [];
  const employees = filterOptions?.employees || [];
  const statuses = filterOptions?.statuses || [];
  const priorities = filterOptions?.priorities || [];
  const jobTypes = filterOptions?.job_types || [];

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[140px]">
            <Label className="text-xs">From</Label>
            <DatePicker
              value={filters.from}
              onChange={(v) => onChange({ from: v || '' })}
              disabled={disabled}
              placeholder="Start date"
              className="w-full"
            />
          </div>
          <div className="space-y-1.5 min-w-[140px]">
            <Label className="text-xs">To</Label>
            <DatePicker
              value={filters.to}
              onChange={(v) => onChange({ to: v || '' })}
              disabled={disabled}
              placeholder="End date"
              className="w-full"
            />
          </div>
          <FilterSelect
            label="Customer"
            value={filters.customer_id}
            onChange={(v) => onChange({ customer_id: v === 'all' ? '' : v })}
            options={customers.map((c) => ({ value: String(c.id), label: c.name }))}
            disabled={disabled}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => onChange({ status: v === 'all' ? '' : v })}
            options={statuses.map((s) => ({ value: s.value, label: s.label }))}
            disabled={disabled}
          />
          <FilterSelect
            label="Job type"
            value={filters.job_type}
            onChange={(v) => onChange({ job_type: v === 'all' ? '' : v })}
            options={jobTypes.map((t) => ({ value: t.value, label: t.label }))}
            disabled={disabled}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => onChange({ priority: v === 'all' ? '' : v })}
            options={priorities.map((p) => ({ value: p.value, label: p.label }))}
            disabled={disabled}
          />
          <FilterSelect
            label="Assigned to"
            value={filters.assigned_to}
            onChange={(v) => onChange({ assigned_to: v === 'all' ? '' : v })}
            options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
            disabled={disabled}
          />
          <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={disabled}>
            <RotateCcw className="size-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <div className="space-y-1.5 min-w-[150px]">
      <Label className="text-xs">{label}</Label>
      <Select value={value || 'all'} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
