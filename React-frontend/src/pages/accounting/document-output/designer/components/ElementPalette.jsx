import * as React from 'react';
import { Type, Image as ImageIcon, Table2, Calculator, Minus, Square, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentDesignerStore } from '../store/useDocumentDesignerStore';

const DEFAULTS = {
  text: { type: 'text', x: 12, y: 12, w: 80, h: 8, content: 'New text', fontSize: 10, align: 'left' },
  field: { type: 'field', x: 12, y: 12, w: 60, h: 6, binding: 'invoice.number', label: 'Invoice No:', format: { type: 'text', fallback: '—' }, fontSize: 9 },
  image: { type: 'image', x: 12, y: 12, w: 40, h: 20, binding: 'company.logo_url', objectFit: 'contain' },
  items_table: {
    type: 'items_table',
    x: 12,
    y: 80,
    w: 186,
    h: 0,
    repeat_from: 'lines',
    row_height: { mode: 'auto', fixed_mm: 8, min_mm: 6, max_mm: 20, line_height_mm: 4.2 },
    columns: [
      { key: 'description', binding: 'line.description', label: 'Description', width_pct: 36, align: 'left', wrap: true, format: { type: 'text' } },
      { key: 'quantity', binding: 'line.quantity', label: 'Qty', width_pct: 10, align: 'right', format: { type: 'number' } },
      { key: 'unit', binding: 'line.unit', label: 'Unit', width_pct: 10, align: 'center', format: { type: 'text' } },
      { key: 'unit_price', binding: 'line.unit_price', label: 'Rate', width_pct: 14, align: 'right', format: { type: 'money' } },
      { key: 'line_total', binding: 'line.line_total', label: 'Amount', width_pct: 30, align: 'right', format: { type: 'money' } },
    ],
  },
  totals_block: {
    type: 'totals_block',
    x: 130,
    // Resolved to after:<itemsTableId> in the store when an items table exists.
    y: 'after:items',
    w: 68,
    h: 30,
    rows: [
      { label: 'Subtotal', binding: 'totals.subtotal', format: { type: 'money' } },
      { label: 'Tax', binding: 'totals.tax', format: { type: 'money' } },
    ],
    highlight_row: { label: 'Total', binding: 'totals.total', format: { type: 'money' } },
  },
  line: { type: 'line', x: 12, y: 40, w: 186, h: 0.5, strokeWidth: 0.3, color: '#000000' },
  rect: { type: 'rect', x: 12, y: 12, w: 60, h: 30, fill: '#f3f4f6', borderRadius: 0 },
};

const ITEMS = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'field', label: 'Field', icon: Tag },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'items_table', label: 'Items Table', icon: Table2, singleton: true },
  { type: 'totals_block', label: 'Totals', icon: Calculator },
  { type: 'line', label: 'Line', icon: Minus },
  { type: 'rect', label: 'Rectangle', icon: Square },
];

export function ElementPalette() {
  const addElement = useDocumentDesignerStore((s) => s.addElement);
  const elements = useDocumentDesignerStore((s) => s.elements);
  const hasTable = elements.some((e) => e.type === 'items_table');

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {ITEMS.map(({ type, label, icon: Icon, singleton }) => {
        const disabled = singleton && hasTable;
        return (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto flex-col gap-1.5 border-[#e4e4e4] bg-white py-3 shadow-none hover:border-[#cfcfcf] hover:bg-[#f7f7f7]"
            disabled={disabled}
            title={disabled ? 'Only one items table is supported per template' : undefined}
            onClick={() => addElement({ ...DEFAULTS[type] })}
          >
            <Icon className="size-4 text-[#444]" />
            <span className="text-[11px] font-medium leading-tight text-[#333]">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
