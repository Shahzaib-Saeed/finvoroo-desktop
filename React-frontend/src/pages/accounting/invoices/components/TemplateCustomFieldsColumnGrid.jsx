import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const MAIN_COLS = 3;

/** 1 col mobile, 2 cols sm, 3 cols lg — aligned with invoice/bill detail grids. */
function useFormFieldColumnCount() {
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 1;
    if (window.matchMedia('(min-width: 1024px)').matches) return MAIN_COLS;
    if (window.matchMedia('(min-width: 640px)').matches) return 2;
    return 1;
  });

  useEffect(() => {
    const mqSm = window.matchMedia('(min-width: 640px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');

    const update = () => {
      if (mqLg.matches) setColumnCount(MAIN_COLS);
      else if (mqSm.matches) setColumnCount(2);
      else setColumnCount(1);
    };

    update();
    mqSm.addEventListener('change', update);
    mqLg.addEventListener('change', update);
    return () => {
      mqSm.removeEventListener('change', update);
      mqLg.removeEventListener('change', update);
    };
  }, []);

  return columnCount;
}

/**
 * Template custom fields in a 3-column grid (each field ≈ one third width).
 * Fills top-to-bottom in column 1, then column 2, then column 3 — matching template sort_order.
 */
export function TemplateCustomFieldsColumnGrid({ fields, renderField, className }) {
  const columnCount = useFormFieldColumnCount();

  const rowCount = useMemo(() => {
    if (!fields?.length) return 0;
    if (columnCount <= 1) return fields.length;
    return Math.ceil(fields.length / columnCount);
  }, [fields?.length, columnCount]);

  if (!fields?.length) return null;

  const columnFlow = columnCount > 1;

  return (
    <div
      className={cn(
        'grid gap-3 w-full',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
      style={
        columnFlow
          ? {
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(${rowCount}, minmax(0, auto))`,
            }
          : undefined
      }
    >
      {fields.map((field) => (
        <div
          key={field.definition_id ? `def-${field.definition_id}` : field.field_key}
          className="min-w-0 w-full"
        >
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}

export { MAIN_COLS as TEMPLATE_CUSTOM_FIELD_MAIN_COLUMNS };
