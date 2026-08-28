import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ProductForm } from './components/ProductForm';
import { ProductTypePickerDialog } from './components/ProductTypePickerDialog';
import { useProductForm } from './hooks/useProductForm';
import { useProductLookups } from './hooks/useProductLookups';
import { productsApi } from './api/products.api';

const ProductDialogContext = createContext(null);

function ProductSheetHost({
  open,
  onOpenChange,
  product,
  initialType,
  loadingProduct,
  mode,
  onSuccess,
}) {
  const form = useProductForm({
    mode,
    productId: mode === 'edit' ? product?.id : undefined,
    // Create mode may receive a partial `prefill` product (e.g. OCR receive line).
    product: product || null,
    initialType: mode === 'create' ? initialType || product?.type : undefined,
    onSuccess: (saved) => {
      onSuccess?.(saved);
      onOpenChange(false);
    },
  });

  return (
    <ProductForm
      variant="sheet"
      open={open}
      onOpenChange={onOpenChange}
      loadingProduct={loadingProduct}
      pickedType={mode === 'create' ? initialType : null}
      {...form}
      onSubmit={form.handleSubmit}
      onCancel={() => onOpenChange(false)}
    />
  );
}

export function ProductDialogProvider({ children }) {
  const { lookups, loadLookups } = useProductLookups();
  const [open, setOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [initialType, setInitialType] = useState(null);
  const [sheetMode, setSheetMode] = useState('create');
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const onSuccessRef = useRef(null);

  const openSheet = useCallback((opts = {}) => {
    setSheetMode('create');
    setInitialType(opts.type || null);
    setProduct(opts.prefill || null);
    onSuccessRef.current = opts.onSuccess || null;
    setLoadingProduct(false);
    setSheetKey((k) => k + 1);
    setOpen(true);
  }, []);

  const openCreate = useCallback(
    (opts = {}) => {
      if (opts.type) {
        openSheet(opts);
        return;
      }
      if (opts.skipTypePicker) {
        openSheet({ ...opts, type: 'inventory' });
        return;
      }
      onSuccessRef.current = opts.onSuccess || null;
      loadLookups();
      setTypePickerOpen(true);
    },
    [loadLookups, openSheet],
  );

  const handleTypeSelected = useCallback(
    (type) => {
      setTypePickerOpen(false);
      openSheet({ type, onSuccess: onSuccessRef.current });
    },
    [openSheet],
  );

  const openEdit = useCallback(async (productToEdit, opts = {}) => {
    if (!productToEdit?.id) {
      toast.error('Cannot edit this product');
      return;
    }

    onSuccessRef.current = opts.onSuccess || null;
    // Set edit context before opening so the sheet never flashes "New product".
    setSheetMode('edit');
    setInitialType(null);
    setProduct(productToEdit);
    setLoadingProduct(true);
    setOpen(true);

    try {
      const res = await productsApi.show(productToEdit.id);
      setProduct(res.data?.data || productToEdit);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Failed to load product details',
      );
    } finally {
      setLoadingProduct(false);
    }
  }, []);

  const handleSuccess = (saved) => {
    onSuccessRef.current?.(saved);
    setProduct(null);
    setInitialType(null);
    setSheetMode('create');
  };

  const handleOpenChange = (v) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => {
        setProduct(null);
        setInitialType(null);
        setSheetMode('create');
        setLoadingProduct(false);
      }, 200);
    }
  };

  const value = { openCreate, openEdit, close: () => handleOpenChange(false) };

  return (
    <ProductDialogContext.Provider value={value}>
      {children}

      <ProductTypePickerDialog
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        typeOptions={lookups.type_options}
        onSelect={handleTypeSelected}
      />

      <ProductSheetHost
        key={
          sheetMode === 'edit'
            ? `edit-${product?.id ?? 'unknown'}`
            : `create-${sheetKey}-${initialType ?? 'new'}`
        }
        open={open}
        onOpenChange={handleOpenChange}
        product={product}
        initialType={initialType}
        loadingProduct={loadingProduct}
        mode={sheetMode}
        onSuccess={handleSuccess}
      />
    </ProductDialogContext.Provider>
  );
}

export function useProductDialog() {
  const ctx = useContext(ProductDialogContext);
  if (!ctx) {
    throw new Error('useProductDialog must be used inside ProductDialogProvider');
  }
  return ctx;
}
