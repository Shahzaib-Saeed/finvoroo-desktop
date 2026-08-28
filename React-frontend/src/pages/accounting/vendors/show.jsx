import { useNavigate, useParams } from 'react-router';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { VendorDetailsSheet } from './components/VendorDetailsSheet';

/** Deep link: opens vendor details offcanvas; closing returns to the list. */
export function VendorShowPage() {
  const { id: workspaceId, vendorId } = useParams();
  const navigate = useNavigate();
  const vendorDialog = useVendorDialog();
  const listPath = `/workspace/${workspaceId}/accounting/vendors`;

  const handleEdit = (vendor) => {
    navigate(listPath);
    window.setTimeout(() => {
      vendorDialog.openEdit(vendor, {
        onSuccess: () => navigate(listPath),
      });
    }, 0);
  };

  return (
    <VendorDetailsSheet
      open
      onOpenChange={(open) => {
        if (!open) navigate(listPath);
      }}
      vendorId={vendorId}
      workspaceId={workspaceId}
      onEdit={handleEdit}
    />
  );
}
