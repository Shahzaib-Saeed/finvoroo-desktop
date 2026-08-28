import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CustomerDetailsSheet } from '@/pages/accounting/customers/components/CustomerDetailsSheet';
import { VendorDetailsSheet } from '@/pages/accounting/vendors/components/VendorDetailsSheet';

const ReportEntityDetailsContext = createContext(null);

export function ReportEntityDetailsProvider({ workspaceId, children }) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  const openCustomer = useCallback((id) => {
    const numericId = Number(id);
    if (!numericId) return;
    setCustomerId(numericId);
    setCustomerOpen(true);
  }, []);

  const openVendor = useCallback((id) => {
    const numericId = Number(id);
    if (!numericId) return;
    setVendorId(numericId);
    setVendorOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openCustomer, openVendor, workspaceId }),
    [openCustomer, openVendor, workspaceId],
  );

  return (
    <ReportEntityDetailsContext.Provider value={value}>
      {children}
      <CustomerDetailsSheet
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        customerId={customerId}
        workspaceId={workspaceId}
      />
      <VendorDetailsSheet
        open={vendorOpen}
        onOpenChange={setVendorOpen}
        vendorId={vendorId}
        workspaceId={workspaceId}
      />
    </ReportEntityDetailsContext.Provider>
  );
}

export function useReportEntityDetails() {
  return useContext(ReportEntityDetailsContext);
}
