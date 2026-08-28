import { Link } from "react-router";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Edit3,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentCreateRelatedDropdown } from "../../components/DocumentCreateRelatedDropdown";
import { printBillDocument } from "@/lib/print-bill";
import { cn } from "@/lib/utils";
import { resolveUiPack } from "@/industries";
import { pharmacyPurchasePath } from "@/industries/pharmacy/paths";
import { useAuthStore } from "@/store/authStore";

function ToolbarDivider() {
  return (
    <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />
  );
}

export function BillShowActions({
  workspaceId,
  billId,
  bill,
  base,
  canEdit,
  canPost,
  canRecordPayment,
  canCancel,
  canDelete,
  onPost,
  onRecordPayment,
  onCancel,
  onDelete,
  posting = false,
  busy = false,
}) {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const jobOrderBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const hasJob = Boolean(bill?.job_order?.id);
  const editTo =
    resolveUiPack(activeCompany) === "pharmacy"
      ? pharmacyPurchasePath(workspaceId, billId)
      : `${base}/${billId}/edit`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DocumentCreateRelatedDropdown
        workspaceId={workspaceId}
        sourceType="bill"
        sourceId={billId}
        targets={[
          { target: "quotation" },
          { target: "sales_order" },
          { target: "invoice" },
          { target: "bill" },
          { target: "purchase_order" },
        ]}
      />

      {(canEdit || canPost || canRecordPayment) && <ToolbarDivider />}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={busy}
        >
          <Link to={editTo}>
            <Edit3 className="size-4 mr-1" /> Edit
          </Link>
        </Button>
      )}

      {canPost && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPost}
          disabled={posting || busy}
        >
          <BadgeCheck className="size-4 mr-1" /> Post
        </Button>
      )}

      {canRecordPayment && (
        <Button
          size="sm"
          onClick={onRecordPayment}
          disabled={busy}
        >
          <Banknote className="size-4 mr-1" /> Record payment
        </Button>
      )}

      {hasJob && (
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link to={`${jobOrderBase}/${bill.job_order.id}`}>
            <Briefcase className="size-4 mr-1" /> View job
          </Link>
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={() => printBillDocument()}>
        <Printer className="size-4 mr-1" /> Print
      </Button>

      {canCancel && (
        <>
          <ToolbarDivider />
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600"
            onClick={onCancel}
            disabled={busy}
          >
            <XCircle className="size-4 mr-1" /> Cancel
          </Button>
        </>
      )}

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className={cn(busy && "opacity-70")}
        >
          <Trash2 className="size-4 mr-1" /> Delete
        </Button>
      )}
    </div>
  );
}
