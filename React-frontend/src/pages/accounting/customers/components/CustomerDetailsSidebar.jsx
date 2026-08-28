import { Link } from 'react-router';
import { Loader2, Mail, MapPin, Paperclip, Phone, User, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCustomerAddress } from '../constants';
import { CustomerVendorSupplierToggle } from './CustomerVendorSupplierToggle';

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarSection({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="px-3 py-3 text-sm">{children}</div>
    </div>
  );
}

export function CustomerDetailsSidebar({
  customer,
  workspaceId,
  vendorLinkBusy = false,
  onVendorLinkChange,
  onEdit,
  attachmentCount = 0,
  onViewAttachments,
}) {
  if (!customer) return null;

  const address = formatCustomerAddress(customer);
  const linkedVendor = customer.linked_vendor;
  const isVendorLinked = !!customer.also_use_as_vendor;
  const vendorsBase = workspaceId
    ? `/workspace/${workspaceId}/accounting/vendors`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center rounded-lg border border-border/70 bg-background px-4 py-5 text-center">
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-full text-lg font-semibold',
            'bg-primary/8 text-primary ring-2 ring-primary/10',
          )}
        >
          {initials(customer.name)}
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground leading-tight">
          {customer.name}
        </p>
        {customer.customer_code ? (
          <p className="mt-1 text-[11px] font-mono text-muted-foreground">
            {customer.customer_code}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-border/70 bg-background p-3 space-y-3">
        <CustomerVendorSupplierToggle
          compact
          checked={isVendorLinked}
          disabled={vendorLinkBusy}
          onChange={onVendorLinkChange}
        />
        {vendorLinkBusy ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Updating…
          </div>
        ) : null}
        {isVendorLinked && linkedVendor?.name ? (
          <div className="rounded-md bg-muted/40 px-2.5 py-2 text-xs">
            <p className="text-muted-foreground mb-1">Linked vendor</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground">{linkedVendor.name}</span>
              {linkedVendor.vendor_code ? (
                <Badge variant="outline" className="font-mono text-[10px] h-5">
                  {linkedVendor.vendor_code}
                </Badge>
              ) : null}
            </div>
            {vendorsBase && linkedVendor.id ? (
              <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs" asChild>
                <Link
                  to={`${vendorsBase}?search=${encodeURIComponent(linkedVendor.vendor_code || linkedVendor.name || '')}`}
                >
                  View vendor
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        {onViewAttachments ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={onViewAttachments}
          >
            <Paperclip className="size-3.5 mr-1.5" />
            Attachments{attachmentCount > 0 ? ` (${attachmentCount})` : ''}
          </Button>
        ) : null}
        {onEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => onEdit(customer)}
          >
            Edit profile
          </Button>
        ) : null}
      </div>

      <SidebarSection icon={User} title="Contact">
        {customer.email ? (
          <div className="flex gap-2 mb-2">
            <Mail className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <a href={`mailto:${customer.email}`} className="hover:text-primary break-all text-xs">
              {customer.email}
            </a>
          </div>
        ) : null}
        {customer.phone ? (
          <div className="flex gap-2 mb-2">
            <Phone className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-xs">{customer.phone}</span>
          </div>
        ) : null}
        {customer.mobile && customer.mobile !== customer.phone ? (
          <div className="flex gap-2">
            <Phone className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-xs">{customer.mobile}</span>
          </div>
        ) : null}
        {!customer.email && !customer.phone && !customer.mobile ? (
          <p className="text-xs text-muted-foreground">No contact details</p>
        ) : null}
      </SidebarSection>

      <SidebarSection icon={MapPin} title="Billing address">
        <p className="text-xs text-muted-foreground leading-relaxed">{address || '—'}</p>
      </SidebarSection>

      {(customer.payment_terms || customer.currency) && (
        <SidebarSection icon={Wallet} title="Payment terms">
          {customer.currency ? (
            <p className="text-xs mb-1.5">
              <span className="text-muted-foreground">Currency · </span>
              {customer.currency}
            </p>
          ) : null}
          {customer.payment_terms ? (
            <p className="text-xs">
              <span className="text-muted-foreground">Terms · </span>
              {customer.payment_terms}
            </p>
          ) : null}
        </SidebarSection>
      )}
    </div>
  );
}
