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

export function pharmacyInvestorsPath(companyId) {
  return `/workspace/${companyId}/pharmacy/investors`;
}

export function pharmacyDistributionPath(companyId, investmentId) {
  return `/workspace/${companyId}/pharmacy/investors/${investmentId}/distribution`;
}

export function pharmacyExpensesPath(companyId, { create = false } = {}) {
  const base = `/workspace/${companyId}/pharmacy/expenses`;
  return create ? `${base}?new=1` : base;
}
