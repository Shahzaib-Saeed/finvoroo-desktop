import { useParams } from 'react-router-dom';
import { PurchaseReceiveWorkspace } from '../components/PurchaseReceiveWorkspace';

export function ReceiveGrnPage() {
  const { id: companyId, billId: editBillId } = useParams();
  return <PurchaseReceiveWorkspace companyId={companyId} editBillId={editBillId} />;
}
