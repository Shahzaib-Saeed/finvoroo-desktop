import { productsApi } from '@/components/workspace/product/api/products.api';
import { applyPharmacyProductImage } from './pharmacy-catalog-store';

/**
 * Quick catalog photo update — shared product image field (FormData).
 */
export async function uploadMedicineImage(productId, file) {
  if (!productId || !file) throw new Error('Missing product or file');
  if (file.size > 4 * 1024 * 1024) throw new Error('Image must be under 4 MB');
  const fd = new FormData();
  fd.append('image', file);
  const res = await productsApi.update(productId, fd);
  const saved = res?.data?.data ?? res?.data ?? null;
  const url = resolveProductImage(saved);
  if (url) applyPharmacyProductImage(productId, url);
  return saved;
}

export function resolveProductImage(productOrLine) {
  if (!productOrLine) return null;
  return (
    productOrLine.image_url ||
    productOrLine.image ||
    productOrLine.product?.image_url ||
    productOrLine.product?.image ||
    null
  );
}
