import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { productsApi } from '../api/products.api';

const ProductLookupsContext = createContext(null);

const EMPTY_LOOKUPS = {
  tax_rates: [],
  categories: [],
  brands: [],
  warehouses: [],
  revenue_accounts: [],
  expense_accounts: [],
  asset_accounts: [],
  unit_options: [],
  type_options: {},
  company_inventory_model: 'fifo',
  custom_field_definitions: [],
};

export function ProductLookupsProvider({ children, skipInitialLoad = false }) {
  const [lookups, setLookups] = useState(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(null);
  const inflightRef = useRef(null);

  const loadLookups = useCallback(async (force = false) => {
    if (!force && cacheRef.current) return cacheRef.current;
    if (inflightRef.current) return inflightRef.current;

    setLoading(true);
    inflightRef.current = productsApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || EMPTY_LOOKUPS;
        cacheRef.current = data;
        setLookups(data);
        return data;
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
      const patch = typeof patchOrFn === 'function' ? patchOrFn(prev) : patchOrFn;
      const next = { ...prev, ...patch };
      cacheRef.current = next;
      return next;
    });
  }, []);

  const refreshCategories = useCallback(async () => {
    const res = await productsApi.listCategories();
    const categories = res.data?.data || [];
    patchLookups({ categories });
    return categories;
  }, [patchLookups]);

  const refreshBrands = useCallback(async () => {
    const res = await productsApi.listBrands();
    const brands = res.data?.data || [];
    patchLookups({ brands });
    return brands;
  }, [patchLookups]);

  const refreshUnits = useCallback(async () => {
    const res = await productsApi.listUnits();
    const units = res.data?.data || [];
    const unit_options = units.map((u) => ({
      value: u.value ?? (u.id ? `u:${u.id}` : u.label),
      label: u.label || u.name,
    }));
    patchLookups({ unit_options });
    return unit_options;
  }, [patchLookups]);

  const refreshAccounts = useCallback(async () => {
    const res = await productsApi.formOptions();
    const data = res.data?.data || {};
    patchLookups({
      revenue_accounts: data.revenue_accounts || [],
      expense_accounts: data.expense_accounts || [],
      asset_accounts: data.asset_accounts || [],
    });
    return data;
  }, [patchLookups]);

  const value = {
    lookups,
    loadingLookups: loading,
    loadLookups,
    patchLookups,
    refreshCategories,
    refreshBrands,
    refreshUnits,
    refreshAccounts,
  };

  return (
    <ProductLookupsContext.Provider value={value}>{children}</ProductLookupsContext.Provider>
  );
}

export function useProductLookups() {
  const ctx = useContext(ProductLookupsContext);
  if (!ctx) {
    throw new Error('useProductLookups must be used inside <ProductLookupsProvider>');
  }
  return ctx;
}
