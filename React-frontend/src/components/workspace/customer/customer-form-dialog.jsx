import { CustomerForm } from '@/pages/accounting/customers/components/CustomerForm';

export function CustomerFormSheet(props) {
  return <CustomerForm variant="sheet" {...props} />;
}

/** @deprecated Use CustomerFormSheet */
export const CustomerFormDialog = CustomerFormSheet;
