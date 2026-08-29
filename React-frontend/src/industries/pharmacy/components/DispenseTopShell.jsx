import { DispenseHeaderBar } from './DispenseHeaderBar';
import { DispenseContextBar } from './DispenseContextBar';

/** Unified top chrome — header + customer row + brand stripe as one shell. */
export function DispenseTopShell({
  headerProps,
  customer,
  formatMoney,
  onOpenCustomer,
  needsRxNote,
  rxNote,
  onRxNoteChange,
}) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <DispenseHeaderBar {...headerProps} />
      <DispenseContextBar
        customer={customer}
        formatMoney={formatMoney}
        onOpenCustomer={onOpenCustomer}
        needsRxNote={needsRxNote}
        rxNote={rxNote}
        onRxNoteChange={onRxNoteChange}
      />
      <div
        className="h-0.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700"
        aria-hidden
      />
    </div>
  );
}
