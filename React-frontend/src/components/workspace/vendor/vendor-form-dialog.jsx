import { VendorForm } from '@/pages/accounting/vendors/components/VendorForm';

export function VendorFormSheet(props) {
  return <VendorForm variant="sheet" {...props} />;
}

/** @deprecated Use VendorFormSheet */
export const VendorFormDialog = VendorFormSheet;
