import {
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  CreditCard,
  Printer,
  Briefcase,
  List,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function InvoiceFormActions({
  isEdit,
  saving,
  autoPostEnabled,
  fromJobOrder,
  onCancel,
  onPreview,
  onSave,
}) {
  const primaryLabel = isEdit ? 'Update' : 'Save';
  const closeLabel = isEdit ? 'Update & close' : 'Save & close';

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={saving}
        className="w-full sm:w-auto h-9 text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={saving}
          className="h-9"
          title="Preview (Ctrl+Shift+P)"
        >
          <Eye className="size-4" />
          Preview
        </Button>

        <div className="inline-flex">
          <Button
            type="button"
            disabled={saving}
            variant="mono"
            className="h-9 rounded-r-none px-4"
            title="Save (Ctrl+S)"
            onClick={() => onSave('view')}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                {primaryLabel}
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={saving}
                variant="mono"
                className="h-9 rounded-l-none border-l border-primary-foreground/20 px-2"
                aria-label={`More ${primaryLabel.toLowerCase()} options`}
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!isEdit ? (
                <DropdownMenuItem onClick={() => onSave('view')}>
                  <FileText className="size-4" />
                  Save draft
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => onSave('close')}>
                <List className="size-4" />
                {closeLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSave('new')}>
                <Plus className="size-4" />
                {isEdit ? 'Update & new' : 'Save & new'}
              </DropdownMenuItem>
              {fromJobOrder && !isEdit ? (
                <DropdownMenuItem onClick={() => onSave('job')}>
                  <Briefcase className="size-4" />
                  Return to job
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSave('payment')}>
                <CreditCard className="size-4" />
                {isEdit ? 'Update & record payment' : 'Save & record payment'}
              </DropdownMenuItem>
              {!isEdit ? (
                <>
                  <DropdownMenuItem onClick={() => onSave('print')}>
                    <Printer className="size-4" />
                    Save & print
                  </DropdownMenuItem>
                  {!autoPostEnabled ? (
                    <DropdownMenuItem onClick={() => onSave('post')}>
                      <Send className="size-4" />
                      Save & approve / post
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
