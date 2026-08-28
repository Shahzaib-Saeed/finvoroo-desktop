import { HelpTip } from './HelpTip';
import { APPROVER_PRESETS, ROLE_OPTIONS } from '../constants';
import { applyApproverPreset, detectApproverPreset } from '../utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ApproverPicker({ step, onChange }) {
  const preset = detectApproverPreset(step);
  const customRole = step.roles?.[0] || 'manager';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold">Who approves?</Label>
        <HelpTip>Pick who must approve at this step. Prefer roles over individuals for coverage when people are away.</HelpTip>
      </div>
      <RadioGroup
        value={preset}
        onValueChange={(v) => onChange(applyApproverPreset(step, v, customRole))}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        {APPROVER_PRESETS.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
              preset === p.id ? 'border-foreground bg-muted/40' : 'hover:bg-muted/20'
            }`}
          >
            <RadioGroupItem value={p.id} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{p.description}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {preset === 'role' && (
        <div className="space-y-1.5 max-w-xs">
          <Label className="text-xs">Approver role</Label>
          <Select
            value={customRole}
            onValueChange={(v) => onChange(applyApproverPreset(step, 'role', v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
