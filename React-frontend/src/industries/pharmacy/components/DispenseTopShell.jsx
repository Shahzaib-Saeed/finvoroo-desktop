import { DispenseHeaderBar } from './DispenseHeaderBar';

/** Top chrome — header only; customer/Rx live in the checkout rail. */
export function DispenseTopShell({ headerProps }) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <DispenseHeaderBar {...headerProps} />
    </div>
  );
}
