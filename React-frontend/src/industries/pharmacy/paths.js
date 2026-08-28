/** Pharmacy purchase screen — create or edit a vendor bill. */
export function pharmacyPurchasePath(companyId, billId = null) {
  const base = `/workspace/${companyId}/pharmacy/receive`;
  return billId ? `${base}/${billId}` : base;
}

export function pharmacyDispensePath(companyId) {
  return `/workspace/${companyId}/pharmacy/pos`;
}

export function pharmacyLoosePurchasePath(companyId) {
  return `/workspace/${companyId}/pharmacy/loose-purchase`;
}

export function pharmacyLooseSaleReturnPath(companyId) {
  return `/workspace/${companyId}/pharmacy/loose-sale-return`;
}
