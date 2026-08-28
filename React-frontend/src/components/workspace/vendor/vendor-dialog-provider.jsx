import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { VendorFormSheet } from './vendor-form-dialog';
import { vendorsApi } from '@/pages/accounting/vendors/api/vendors.api';

const VendorDialogContext = createContext(null);

export function VendorDialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const onSuccessRef = useRef(null);

  const openCreate = useCallback((opts = {}) => {
    setVendor(null);
    onSuccessRef.current = opts.onSuccess || null;
    setOpen(true);
  }, []);

  const openEdit = useCallback(async (vendorToEdit, opts = {}) => {
    onSuccessRef.current = opts.onSuccess || null;
    const id = vendorToEdit?.id;
    setLoadingVendor(!!id);
    setVendor(vendorToEdit ?? null);
    setOpen(true);

    if (!id) {
      setLoadingVendor(false);
      return;
    }

    try {
      const res = await vendorsApi.show(id);
      setVendor(res.data?.data || vendorToEdit);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load vendor');
      setVendor(vendorToEdit);
    } finally {
      setLoadingVendor(false);
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const handleSuccess = (saved) => {
    if (onSuccessRef.current) onSuccessRef.current(saved);
    setOpen(false);
    setVendor(null);
    setLoadingVendor(false);
  };

  const value = { openCreate, openEdit, close };

  return (
    <VendorDialogContext.Provider value={value}>
      {children}
      <VendorFormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setVendor(null);
            setLoadingVendor(false);
          }
        }}
        vendor={vendor}
        loading={loadingVendor}
        onSuccess={handleSuccess}
      />
    </VendorDialogContext.Provider>
  );
}

export function useVendorDialog() {
  const ctx = useContext(VendorDialogContext);
  if (!ctx) {
    throw new Error('useVendorDialog must be used inside <VendorDialogProvider>');
  }
  return ctx;
}
