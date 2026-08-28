import { cn } from '@/lib/utils';
import { CustomerDrillLink } from './CustomerDrillLink';
import { VendorDrillLink } from './VendorDrillLink';

/**
 * Opens customer or vendor details based on party_kind from inventory activity rows.
 */
export function ReportPartyDrillLink({
  partyKind,
  partyId,
  children,
  className,
  onOpenCustomer,
  onOpenVendor,
}) {
  const label = children ?? '—';
  const kind = String(partyKind || '').toLowerCase();

  if (kind === 'customer' && partyId) {
    return (
      <CustomerDrillLink
        customerId={partyId}
        onOpen={onOpenCustomer}
        className={cn('text-sm font-medium', className)}
      >
        {label}
      </CustomerDrillLink>
    );
  }

  if (kind === 'vendor' && partyId) {
    return (
      <VendorDrillLink
        vendorId={partyId}
        onOpen={onOpenVendor}
        className={cn('text-sm font-medium', className)}
      >
        {label}
      </VendorDrillLink>
    );
  }

  return <span className={className}>{label}</span>;
}
