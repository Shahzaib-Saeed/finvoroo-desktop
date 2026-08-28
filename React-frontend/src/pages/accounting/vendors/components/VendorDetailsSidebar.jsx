import { Link } from 'react-router';
import { Edit3, Mail, MapPin, Paperclip, Phone, User, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatVendorAddress, vendorInitials } from '../constants';

const CARD_HEADER = 'px-4 pt-4 pb-3 border-b border-border/60';
const CARD_BODY = 'px-4 pt-4 pb-4';

export function VendorDetailsSidebar({
  vendor,
  workspaceId,
  onEdit,
  attachmentCount = 0,
  onViewAttachments,
}) {
  if (!vendor) return null;

  const address = formatVendorAddress(vendor);

  const linkedCustomer = vendor.linked_customer;
  const isCustomerLinked = !!vendor.also_use_as_customer;
  const customersBase = workspaceId
    ? `/workspace/${workspaceId}/accounting/customers`
    : null;

  return (
    <div className="space-y-4">
      <Card className="shadow-none overflow-hidden">
        <CardContent className="px-4 pt-5 pb-5 flex flex-col items-center text-center">
          <div
            className={cn(
              'size-20 rounded-full flex items-center justify-center text-xl font-semibold',
              'bg-primary/10 text-primary border border-primary/20',
            )}
          >
            {vendorInitials(vendor.name)}
          </div>
          <p className="mt-3 font-semibold text-foreground">{vendor.name}</p>
          {vendor.vendor_code ? (
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {vendor.vendor_code}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none overflow-hidden">
        <CardContent className="p-4 pt-4 space-y-3">
          {isCustomerLinked && linkedCustomer?.name ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Also used as customer</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{linkedCustomer.name}</span>
                {linkedCustomer.customer_code ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {linkedCustomer.customer_code}
                  </Badge>
                ) : null}
              </div>
              {customersBase && linkedCustomer.id ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1.5 text-xs"
                  asChild
                >
                  <Link
                    to={`${customersBase}?search=${encodeURIComponent(
                      linkedCustomer.customer_code || linkedCustomer.name || '',
                    )}`}
                  >
                    View in customers
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onEdit(vendor)}
            >
              <Edit3 className="size-3.5 mr-1.5" />
              Edit vendor profile
            </Button>
          ) : null}
          {onViewAttachments ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onViewAttachments}
            >
              <Paperclip className="size-3.5 mr-1.5" />
              {attachmentCount > 0
                ? `View attachments (${attachmentCount})`
                : 'View attachments'}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none overflow-hidden">
        <CardHeader className={CARD_HEADER}>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(CARD_BODY, 'space-y-3 text-sm')}>
          {vendor.email ? (
            <div className="flex gap-2">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <a href={`mailto:${vendor.email}`} className="hover:text-primary break-all">
                {vendor.email}
              </a>
            </div>
          ) : null}
          {vendor.phone ? (
            <div className="flex gap-2">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{vendor.phone}</span>
            </div>
          ) : null}
          {!vendor.email && !vendor.phone ? (
            <p className="text-muted-foreground text-xs">No contact details</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-none overflow-hidden">
        <CardHeader className={CARD_HEADER}>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(CARD_BODY, 'text-sm text-muted-foreground')}>
          {address || '—'}
        </CardContent>
      </Card>

      {(vendor.payment_terms || vendor.currency) && (
        <Card className="shadow-none overflow-hidden">
          <CardHeader className={CARD_HEADER}>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              Payment terms
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(CARD_BODY, 'text-sm space-y-2')}>
            {vendor.currency ? (
              <p>
                <span className="text-muted-foreground">Currency: </span>
                {vendor.currency}
              </p>
            ) : null}
            {vendor.payment_terms ? (
              <p>
                <span className="text-muted-foreground">Payment: </span>
                {vendor.payment_terms}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
