import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export const DEFAULT_FORMATTING = {
  decimalPlaces: 2,
  thousandsSeparator: true,
  negativeStyle: 'minus',
  dateFormat: 'short',
};

/**
 * Cosmetic display preferences for the live preview grid — decimal
 * places, thousands separators, negative-number style, date style.
 * Stored alongside the definition JSON (a `formatting` key the executor
 * simply ignores) so it round-trips with Save, but only ever affects
 * client-side rendering here; exports keep the dataset's standard
 * formatting, which is why that's called out explicitly below.
 */
export function FormattingPanel({ formatting, onChange }) {
  const value = { ...DEFAULT_FORMATTING, ...formatting };
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="text-xs">Decimal places</Label>
        <Select value={String(value.decimalPlaces)} onValueChange={(v) => update({ decimalPlaces: Number(v) })}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Thousands separator</Label>
        <Switch checked={value.thousandsSeparator} onCheckedChange={(checked) => update({ thousandsSeparator: checked })} />
      </div>

      <div>
        <Label className="text-xs">Negative numbers</Label>
        <Select value={value.negativeStyle} onValueChange={(v) => update({ negativeStyle: v })}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minus">-1,234.00</SelectItem>
            <SelectItem value="parentheses">(1,234.00)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Date style</Label>
        <Select value={value.dateFormat} onValueChange={(v) => update({ dateFormat: v })}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iso">2026-01-31</SelectItem>
            <SelectItem value="short">Jan 31, 2026</SelectItem>
            <SelectItem value="long">31 January 2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start gap-1.5 rounded-md bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 size-3 shrink-0 text-slate-400" />
        Formatting affects this preview only — exported files use standard number and date formatting.
      </div>
    </div>
  );
}
