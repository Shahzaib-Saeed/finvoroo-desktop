import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { toast } from 'sonner';
import { taxRatesApi } from '@/pages/accounting/taxes/api/tax-rates.api';
import { TaxFormDialog } from './tax-form-dialog';

const TaxDialogContext = createContext(null);

export function TaxDialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [tax, setTax] = useState(null);
  const [loadingTax, setLoadingTax] = useState(false);
  const onSuccessRef = useRef(null);

  const openCreate = useCallback((opts = {}) => {
    setTax(null);
    onSuccessRef.current = opts.onSuccess || null;
    setOpen(true);
  }, []);

  const openEdit = useCallback(async (taxToEdit, opts = {}) => {
    onSuccessRef.current = opts.onSuccess || null;
    setOpen(true);
    setLoadingTax(true);

    const id = taxToEdit?.id;
    if (!id) {
      setTax(taxToEdit);
      setLoadingTax(false);
      return;
    }

    try {
      const res = await taxRatesApi.show(id);
      setTax(res.data?.data || taxToEdit);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load tax rate');
      setTax(taxToEdit);
    } finally {
      setLoadingTax(false);
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const handleSuccess = (saved) => {
    onSuccessRef.current?.(saved);
    setTax(null);
  };

  const value = { openCreate, openEdit, close };

  return (
    <TaxDialogContext.Provider value={value}>
      {children}
      <TaxFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTax(null);
        }}
        tax={tax}
        loadingTax={loadingTax}
        onSuccess={handleSuccess}
      />
    </TaxDialogContext.Provider>
  );
}

export function useTaxDialog() {
  const ctx = useContext(TaxDialogContext);
  if (!ctx) {
    throw new Error('useTaxDialog must be used inside <TaxDialogProvider>');
  }
  return ctx;
}
