import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { documentOutputApi, unwrapDoc } from '@/pages/accounting/document-output/api/document-output.api';
import { useDocumentDesignerStore } from '../store/useDocumentDesignerStore';

const FORMAT_BY_TYPE = {
  money: { type: 'money' },
  number: { type: 'number' },
  date: { type: 'date', pattern: 'short' },
  boolean: { type: 'boolean' },
  text: { type: 'text' },
  image: undefined,
};

/** Every token click drops a new `field` (or `image`) element bound to it, cascading slightly so repeated clicks don't stack exactly on top of each other. */
export function FieldPalette() {
  const [catalog, setCatalog] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const addElement = useDocumentDesignerStore((s) => s.addElement);
  const dropCountRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    documentOutputApi
      .fieldCatalog()
      .then((res) => {
        if (!cancelled) setCatalog(unwrapDoc(res) || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = React.useMemo(() => {
    const byGroup = {};
    for (const f of catalog || []) {
      if (f.group === 'Line') continue; // line tokens are only valid inside items_table columns
      (byGroup[f.group] ||= []).push(f);
    }
    return byGroup;
  }, [catalog]);

  const insert = (field) => {
    const n = dropCountRef.current++;
    const offset = (n % 6) * 4;
    if (field.type === 'image') {
      addElement({ type: 'image', x: 12 + offset, y: 12 + offset, w: 40, h: 20, binding: field.token, objectFit: 'contain' });
      return;
    }
    const isCustom = String(field.token || '').startsWith('custom.');
    addElement({
      type: 'field',
      x: 12 + offset,
      y: 12 + offset,
      w: isCustom ? 80 : 60,
      h: 6,
      binding: field.token,
      label: isCustom ? field.label : `${field.label}:`,
      // Custom header fields default to aligned Label : value columns.
      ...(isCustom ? { label_layout: 'columns', label_width_mm: 32 } : {}),
      format: FORMAT_BY_TYPE[field.type] ?? { type: 'text', fallback: '—' },
      fontSize: 9,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading fields…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {Object.entries(groups).map(([group, fields]) => (
        <div key={group}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8a8a]">{group}</p>
          <div className="space-y-0.5">
            {fields.map((f) => (
              <button
                key={f.token}
                type="button"
                onClick={() => insert(f)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] text-[#333] hover:bg-[#efefef]"
                title={`{{${f.token}}}`}
              >
                <span className="font-medium">{f.label}</span>
                <span className="text-[10px] text-[#9a9a9a]">{f.type}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
