import { Navigate, useParams } from 'react-router';

/**
 * The receipt edit experience now lives in an offcanvas sheet on the receipts
 * list. This route is kept so existing links/bookmarks still work — it simply
 * redirects to the list and opens the edit sheet via the `?edit=` param.
 */
export function PaymentEditPage() {
  const { id: workspaceId, paymentId } = useParams();
  return (
    <Navigate
      to={`/workspace/${workspaceId}/accounting/payments?edit=${paymentId}`}
      replace
    />
  );
}
