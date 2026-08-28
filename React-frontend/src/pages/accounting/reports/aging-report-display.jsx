export function isAgingRowPaid(row) {
  return Boolean(row?.is_paid) || row?.status === "paid";
}

export function agingRowAmount(row) {
  if (isAgingRowPaid(row)) {
    return row?.total ?? row?.amount_due ?? row?.amount ?? 0;
  }
  return row?.balance_due ?? row?.amount_due ?? row?.amount ?? 0;
}

export function PaidAgingMarker({ children, className = "" }) {
  return (
    <span title="Paid" className={`cursor-help ${className}`.trim()}>
      <span className="text-neutral-500 mr-0.5">*</span>
      {children}
    </span>
  );
}
