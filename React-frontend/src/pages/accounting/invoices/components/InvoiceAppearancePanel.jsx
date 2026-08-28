import { useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { buildCustomFieldSections } from "../invoice-print-display";

const SECTION_LABELS = {
  "company-header": "Company header",
  addresses: "Bill to / addresses",
  "line-items": "Line items & totals",
  "payment-terms": "Payment terms",
  notes: "Payment details",
  footer: "Footer",
};

function sectionLabel(id) {
  if (SECTION_LABELS[id]) return SECTION_LABELS[id];
  if (id.startsWith("custom-fields-")) {
    return "Custom fields";
  }
  return id;
}

function ToggleRow({ id, label, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function InvoiceAppearancePanel({
  invoice,
  display,
  onDisplayChange,
  sectionOrder,
  onSectionOrderChange,
  onSave,
  onReset,
  saving,
  canSave,
  hasNotes,
  anyLineDiscount,
  anyLineTax,
  sticky = true,
  className,
}) {
  const customSections = useMemo(
    () => buildCustomFieldSections(invoice),
    [invoice],
  );

  const moveSection = (index, direction) => {
    const next = [...sectionOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onSectionOrderChange(next);
  };

  const setDisplayKey = (key, value) => {
    onDisplayChange({ ...display, [key]: value });
  };

  const setColumn = (col, value) => {
    onDisplayChange({
      ...display,
      columns: { ...display.columns, [col]: value },
    });
  };

  const setBillPart = (key, value) => {
    onDisplayChange({ ...display, [key]: value });
  };

  return (
    <Card
      className={cn("print:hidden", sticky && "sticky top-[78px]", className)}
    >
      <CardHeader className="pb-3">
        {/* <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          Invoice appearance
        </CardTitle> */}
        <p className="text-xs text-muted-foreground font-normal">
          Choose what appears on screen, print, and PDF. Drag order with arrows.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Sections
          </p>
          <ToggleRow
            id="disp-company"
            label="Company header"
            checked={display.show_company_header}
            onCheckedChange={(v) => setDisplayKey("show_company_header", v)}
          />
          <ToggleRow
            id="disp-bill"
            label="Bill to"
            checked={display.show_bill_to}
            onCheckedChange={(v) => setDisplayKey("show_bill_to", v)}
          />
          {display.show_bill_to ? (
            <div className="ms-3 ps-3 border-s border-border/80 space-y-0.5 mb-2">
              <ToggleRow
                id="disp-bill-addr"
                label="Billing address"
                checked={display.bill_to_show_address}
                onCheckedChange={(v) => setBillPart("bill_to_show_address", v)}
              />
              <ToggleRow
                id="disp-bill-contact"
                label="Contact person"
                checked={display.bill_to_show_contact_person}
                onCheckedChange={(v) =>
                  setBillPart("bill_to_show_contact_person", v)
                }
              />
              <ToggleRow
                id="disp-bill-email"
                label="Contact email"
                checked={display.bill_to_show_contact_email}
                onCheckedChange={(v) =>
                  setBillPart("bill_to_show_contact_email", v)
                }
              />
              <ToggleRow
                id="disp-bill-phone"
                label="Phone"
                checked={display.bill_to_show_phone}
                onCheckedChange={(v) => setBillPart("bill_to_show_phone", v)}
              />
              <ToggleRow
                id="disp-bill-tax"
                label="Tax ID"
                checked={display.bill_to_show_tax_id}
                onCheckedChange={(v) => setBillPart("bill_to_show_tax_id", v)}
              />
            </div>
          ) : null}
          {customSections.length > 0 ? (
            <ToggleRow
              id="disp-cf"
              label="Template / custom fields"
              checked={display.show_custom_fields}
              onCheckedChange={(v) => setDisplayKey("show_custom_fields", v)}
            />
          ) : null}
          <ToggleRow
            id="disp-lines"
            label="Line items table"
            checked={display.show_line_items}
            onCheckedChange={(v) => setDisplayKey("show_line_items", v)}
          />
          <ToggleRow
            id="disp-terms"
            label="Payment terms"
            checked={display.show_payment_terms}
            onCheckedChange={(v) => setDisplayKey("show_payment_terms", v)}
          />
          {hasNotes ? (
            <ToggleRow
              id="disp-notes"
              label="Payment & banking details"
              checked={display.show_notes}
              onCheckedChange={(v) => setDisplayKey("show_notes", v)}
            />
          ) : null}
          <ToggleRow
            id="disp-footer"
            label="Footer line"
            checked={display.show_footer}
            onCheckedChange={(v) => setDisplayKey("show_footer", v)}
          />
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Line columns
          </p>
          <ToggleRow
            id="col-num"
            label="#"
            checked={display.columns?.number !== false}
            onCheckedChange={(v) => setColumn("number", v)}
            disabled={!display.show_line_items}
          />
          <ToggleRow
            id="col-desc"
            label="Description"
            checked={display.columns?.description !== false}
            onCheckedChange={(v) => setColumn("description", v)}
            disabled={!display.show_line_items}
          />
          <ToggleRow
            id="col-rate"
            label="Rate"
            checked={display.columns?.rate !== false}
            onCheckedChange={(v) => setColumn("rate", v)}
            disabled={!display.show_line_items}
          />
          <ToggleRow
            id="col-qty"
            label="Qty"
            checked={display.columns?.qty !== false}
            onCheckedChange={(v) => setColumn("qty", v)}
            disabled={!display.show_line_items}
          />
          {anyLineDiscount ? (
            <ToggleRow
              id="col-disc"
              label="Discount"
              checked={display.columns?.discount !== false}
              onCheckedChange={(v) => setColumn("discount", v)}
              disabled={!display.show_line_items}
            />
          ) : null}
          {anyLineTax ? (
            <ToggleRow
              id="col-tax"
              label="Tax"
              checked={display.columns?.tax !== false}
              onCheckedChange={(v) => setColumn("tax", v)}
              disabled={!display.show_line_items}
            />
          ) : null}
          <ToggleRow
            id="col-amt"
            label="Amount"
            checked={display.columns?.amount !== false}
            onCheckedChange={(v) => setColumn("amount", v)}
            disabled={!display.show_line_items}
          />
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Section order
          </p>
          <ul className="space-y-1">
            {sectionOrder.map((id, index) => (
              <li
                key={id}
                className="flex items-center justify-between gap-1 rounded-md border border-border/60 px-2 py-1.5 bg-muted/20"
              >
                <span className="text-xs truncate">{sectionLabel(id)}</span>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => moveSection(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === sectionOrder.length - 1}
                    onClick={() => moveSection(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {canSave ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 me-1 animate-spin" />
              ) : (
                <Save className="size-4 me-1" />
              )}
              Save for PDF & print
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onReset}
            disabled={saving}
          >
            <RotateCcw className="size-4 me-1" />
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
