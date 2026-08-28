import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { CustomerFormSheet } from "./customer-form-dialog";
import { customersApi } from "@/pages/accounting/customers/api/customers.api";
import {
  CustomerFormLookupsProvider,
  useCustomerFormLookups,
} from "./hooks/useCustomerFormLookups";

const CustomerDialogContext = createContext(null);

function CustomerDialogProviderInner({ children }) {
  const { loadLookups } = useCustomerFormLookups();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const onSuccessRef = useRef(null);

  const openCreate = useCallback(
    (opts = {}) => {
      setCustomer(null);
      onSuccessRef.current = opts.onSuccess || null;
      loadLookups();
      setOpen(true);
    },
    [loadLookups],
  );

  const openEdit = useCallback(
    async (customerToEdit, opts = {}) => {
      onSuccessRef.current = opts.onSuccess || null;
      setLoadingCustomer(!!customerToEdit?.id);
      setCustomer(customerToEdit ?? null);
      loadLookups();
      setOpen(true);

      const id = customerToEdit?.id;
      if (!id) {
        setLoadingCustomer(false);
        return;
      }

      try {
        const res = await customersApi.show(id);
        setCustomer(res.data?.data || customerToEdit);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load customer");
        setCustomer(customerToEdit);
      } finally {
        setLoadingCustomer(false);
      }
    },
    [loadLookups],
  );

  const close = useCallback(() => setOpen(false), []);

  const handleSuccess = (saved) => {
    if (onSuccessRef.current) onSuccessRef.current(saved);
    setOpen(false);
    setCustomer(null);
    setLoadingCustomer(false);
  };

  const value = { openCreate, openEdit, close };

  return (
    <CustomerDialogContext.Provider value={value}>
      {children}
      <CustomerFormSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setCustomer(null);
            setLoadingCustomer(false);
          }
        }}
        customer={customer}
        customerId={customer?.id}
        loading={loadingCustomer}
        onSuccess={handleSuccess}
      />
    </CustomerDialogContext.Provider>
  );
}

export function CustomerDialogProvider({ children }) {
  return (
    <CustomerFormLookupsProvider>
      <CustomerDialogProviderInner>{children}</CustomerDialogProviderInner>
    </CustomerFormLookupsProvider>
  );
}

export function useCustomerDialog() {
  const ctx = useContext(CustomerDialogContext);
  if (!ctx) {
    throw new Error(
      "useCustomerDialog must be used inside <CustomerDialogProvider>",
    );
  }
  return ctx;
}

export function useOptionalCustomerDialog() {
  return useContext(CustomerDialogContext);
}
