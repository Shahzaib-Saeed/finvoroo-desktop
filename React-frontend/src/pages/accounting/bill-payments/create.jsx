import { Navigate, useParams, useSearchParams } from 'react-router';

/** Legacy route — redirects to bill payments list and opens the offcanvas. */
export function BillPaymentCreatePage() {
  const { id: workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const qs = new URLSearchParams(searchParams);
  qs.set('record', '1');
  return (
    <Navigate
      to={`/workspace/${workspaceId}/accounting/bill-payments?${qs.toString()}`}
      replace
    />
  );
}
