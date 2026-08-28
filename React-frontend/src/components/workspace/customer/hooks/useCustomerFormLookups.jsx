import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { customersApi } from "@/pages/accounting/customers/api/customers.api";

const EMPTY_LOOKUPS = {
  receivable_accounts: [],
  revenue_accounts: [],
  invoice_templates: [],
  default_template_id: null,
  can_show_coa_quick_dialogs: false,
  custom_field_definitions: [],
};

const CustomerFormLookupsContext = createContext(null);

export function CustomerFormLookupsProvider({ children, skipInitialLoad = false }) {
  const [lookups, setLookups] = useState(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(null);
  const inflightRef = useRef(null);

  const loadLookups = useCallback(async (force = false) => {
    if (!force && cacheRef.current) return cacheRef.current;
    if (inflightRef.current) return inflightRef.current;

    setLoading(true);
    inflightRef.current = customersApi
      .formOptions()
      .then((res) => {
        const data = { ...EMPTY_LOOKUPS, ...(res.data?.data || {}) };
        cacheRef.current = data;
        setLookups(data);
        return data;
      })
      .catch(() => {
        if (!cacheRef.current) setLookups(EMPTY_LOOKUPS);
        return cacheRef.current || EMPTY_LOOKUPS;
      })
      .finally(() => {
        setLoading(false);
        inflightRef.current = null;
      });

    return inflightRef.current;
  }, []);

  useEffect(() => {
    if (skipInitialLoad) return;
    loadLookups();
  }, [loadLookups, skipInitialLoad]);

  const patchLookups = useCallback((patchOrFn) => {
    setLookups((prev) => {
      const patch =
        typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      const next = { ...prev, ...patch };
      cacheRef.current = next;
      return next;
    });
  }, []);

  const value = {
    lookups,
    loadingLookups: loading,
    loadLookups,
    patchLookups,
  };

  return (
    <CustomerFormLookupsContext.Provider value={value}>
      {children}
    </CustomerFormLookupsContext.Provider>
  );
}

export function useCustomerFormLookups() {
  const ctx = useContext(CustomerFormLookupsContext);
  if (!ctx) {
    throw new Error(
      "useCustomerFormLookups must be used inside <CustomerFormLookupsProvider>",
    );
  }
  return ctx;
}
