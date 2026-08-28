import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Monitor,
  Printer,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
import {
  documentOutputApi,
  printHtmlDocument,
  unwrapDoc,
} from '../api/document-output.api';
import { printEscPosPayload } from '@/lib/print-pos-receipt';
import { PRINT_DRIVERS, formatPrintAgentError, getPrintDriver } from '@/lib/print-agent';

function layoutPaper(layout) {
  const paper = String(layout?.paper || 'a4').toLowerCase();
  if (paper === 'a5') return 'a5';
  if (paper.startsWith('thermal')) return 'thermal';
  return 'a4';
}

/** schema_version 2 = free-position designer canvas (must use API render). */
function isCanvasLayout(layout) {
  return Number(layout?.schema_version) === 2;
}

function paperLabel(layout) {
  const paper = String(layout?.paper || 'a4').toLowerCase();
  if (paper === 'a5') return 'A5';
  if (paper.includes('58')) return '58mm';
  if (paper.includes('80')) return '80mm';
  if (paper.startsWith('thermal')) return 'Thermal';
  if (paper === 'letter') return 'Letter';
  return 'A4';
}

function LayoutIcon({ layout, className }) {
  if (layoutPaper(layout) === 'thermal') {
    return <Receipt className={cn('size-4', className)} />;
  }
  return <FileText className={cn('size-4', className)} />;
}

function sortLayouts(layouts, defaultLayoutId) {
  const weight = (l) => {
    if (l.id === defaultLayoutId) return 0;
    const p = layoutPaper(l);
    if (p === 'a4') return 1;
    if (p === 'a5') return 2;
    if (p === 'thermal') return 3;
    return 4;
  };
  return [...layouts].sort((a, b) => {
    const dw = weight(a) - weight(b);
    if (dw !== 0) return dw;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

/**
 * Print ▼ menu — default layout + templates + PDF export.
 * Designer/canvas layouts always render via document-output API with layout_id.
 */
export function DocumentPrintMenu({
  documentType = 'invoice',
  documentId,
  permission = 'invoices.print',
  label = 'Print',
  variant = 'outline',
  size = 'sm',
  className,
  onLegacyPrint,
  onScreenPrint,
  onThermalPrint,
}) {
  const canPrint = useCan(permission);
  const [layouts, setLayouts] = useState([]);
  const [defaultLayoutId, setDefaultLayoutId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const useScreenLayout = documentType === 'invoice' && typeof onScreenPrint === 'function';
  const useThermalScreen =
    typeof onThermalPrint === 'function' &&
    (documentType === 'invoice' || documentType === 'pos_receipt');

  const load = useCallback(async () => {
    if (!documentId) return;
    try {
      const [layoutRes, prefRes] = await Promise.all([
        documentOutputApi.layouts({ document_type: documentType }),
        documentOutputApi.preferences(),
      ]);
      const list = unwrapDoc(layoutRes) || [];
      setLayouts(Array.isArray(list) ? list : []);
      const prefs = unwrapDoc(prefRes);
      const def =
        prefs?.defaults?.[documentType]?.id ||
        prefs?.preferences?.find((p) => p.document_type === documentType)?.default_layout_id ||
        null;
      setDefaultLayoutId(def);
      setLoaded(true);
    } catch {
      setLayouts([]);
      setLoaded(true);
    }
  }, [documentId, documentType]);

  useEffect(() => {
    load();
  }, [load]);

  const runScreen = async (paper, mode = 'print') => {
    setBusy(true);
    try {
      await onScreenPrint({ paper, mode });
    } catch (e) {
      toast.error(e?.message || 'Print failed');
    } finally {
      setBusy(false);
    }
  };

  const runThermal = async (paper) => {
    setBusy(true);
    try {
      await onThermalPrint({ paper: paper || 'thermal_80' });
      toast.success('Print dialog opened');
    } catch (e) {
      toast.error(e?.message || 'Print failed');
    } finally {
      setBusy(false);
    }
  };

  const runThermalOrEscpos = async (layout) => {
    const paper = String(layout?.paper || 'thermal_80');
    if (useThermalScreen) {
      await runThermal(paper);
      return;
    }
    await runRender('escpos', layout?.id);
  };

  const runRender = async (adapter, layoutId, extra = {}) => {
    if (!documentId) return;
    setBusy(true);
    try {
      if (adapter === 'pdf') {
        const res = await documentOutputApi.render(
          documentType,
          documentId,
          {
            adapter: 'pdf',
            layout_id: layoutId || undefined,
            download: true,
          },
          { responseType: 'blob' },
        );
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}-${documentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded');
        return;
      }

      const res = await documentOutputApi.render(documentType, documentId, {
        adapter,
        layout_id: layoutId || undefined,
        options: extra.options || {},
      });

      const data = unwrapDoc(res);
      if (adapter === 'browser' || adapter === 'html') {
        printHtmlDocument(data?.body || '');
        toast.success('Print dialog opened');
        return;
      }
      if (adapter === 'escpos' || adapter === 'thermal') {
        const bytes =
          data?.encoding === 'base64' && typeof data?.body === 'string'
            ? data.body
            : typeof data?.body === 'string'
              ? data.body
              : null;

        if (bytes) {
          const result = await printEscPosPayload(bytes);
          if (result?.ok) {
            toast.success('Sent to thermal printer');
            return;
          }
          if (getPrintDriver() === PRINT_DRIVERS.AGENT) {
            toast.error(result?.reason || formatPrintAgentError(null));
            return;
          }
        }

        if (getPrintDriver() === PRINT_DRIVERS.AGENT) {
          toast.error('Printing failed. Please check the printer.');
          return;
        }

        const browser = unwrapDoc(
          await documentOutputApi.render(documentType, documentId, {
            adapter: 'browser',
            layout_id: layoutId || undefined,
          }),
        );
        printHtmlDocument(browser?.body || '');
        toast.message(
          bytes
            ? 'No thermal printer bridge — opened browser print'
            : 'Thermal bytes unavailable — opened browser print',
        );
        return;
      }
      toast.success('Document rendered');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Print failed';
      if (onLegacyPrint && (e?.response?.status === 404 || e?.response?.status === 403)) {
        onLegacyPrint();
        return;
      }
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleLayout = (layout, mode = 'print') => {
    const paper = layoutPaper(layout);
    if (paper === 'thermal') {
      runThermalOrEscpos(layout);
      return;
    }
    // Always honor the selected designer template (do not fall back to classic invoice DOM).
    if (isCanvasLayout(layout) || !useScreenLayout) {
      runRender(mode === 'pdf' ? 'pdf' : 'browser', layout?.id);
      return;
    }
    runScreen(paper, mode);
  };

  const defaultLayout = layouts.find((l) => l.id === defaultLayoutId) || layouts[0] || null;

  const sortedLayouts = useMemo(
    () => sortLayouts(layouts, defaultLayoutId),
    [layouts, defaultLayoutId],
  );

  const handleDefault = (mode = 'print') => {
    if (documentType === 'pos_receipt') {
      if (useThermalScreen && mode === 'print') {
        runThermal(String(defaultLayout?.paper || 'thermal_80'));
        return;
      }
      runRender('escpos', defaultLayoutId);
      return;
    }
    if (isCanvasLayout(defaultLayout) || !useScreenLayout) {
      runRender(mode === 'pdf' ? 'pdf' : 'browser', defaultLayout?.id || defaultLayoutId);
      return;
    }
    runScreen(layoutPaper(defaultLayout), mode);
  };

  if (!canPrint) return null;

  const defaultName = defaultLayout?.name || 'Default template';

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && !loaded) load();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={busy || !documentId}>
          {busy ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Printer className="size-4 mr-1" />}
          {label}
          <ChevronDown className="size-3.5 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[18.5rem] p-1.5">
        {/* Quick print */}
        <DropdownMenuItem
          className="items-start gap-2.5 py-2.5"
          onClick={() => handleDefault('print')}
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Printer className="size-4 opacity-100" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-tight">Print</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {loaded ? defaultName : 'Loading…'}
            </span>
          </span>
          {defaultLayout ? (
            <Badge variant="primary" appearance="light" size="xs" className="mt-0.5 shrink-0">
              Default
            </Badge>
          ) : null}
        </DropdownMenuItem>

        {loaded && sortedLayouts.length > 0 ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuLabel className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Templates
            </DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              {sortedLayouts.map((l) => {
                const isDefault = defaultLayoutId === l.id;
                const designer = isCanvasLayout(l);
                return (
                  <DropdownMenuItem
                    key={l.id}
                    className="items-start gap-2.5 py-2"
                    onClick={() => handleLayout(l, 'print')}
                  >
                    <LayoutIcon layout={l} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium leading-tight">{l.name}</span>
                        {isDefault ? (
                          <Check className="size-3.5 shrink-0 text-primary opacity-100" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {paperLabel(l)}
                        {designer ? ' · Designer' : ''}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </>
        ) : null}

        {!loaded ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading templates…
            </div>
          </>
        ) : null}

        {documentType !== 'pos_receipt' ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuLabel className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Export
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="gap-2.5 py-2"
              onClick={() => {
                if (defaultLayout) handleLayout(defaultLayout, 'pdf');
                else handleDefault('pdf');
              }}
            >
              <Download className="size-4" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">Download PDF</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Save using default template
                </span>
              </span>
            </DropdownMenuItem>
          </>
        ) : null}

        {onLegacyPrint ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="gap-2.5 py-2 text-muted-foreground" onClick={onLegacyPrint}>
              <Monitor className="size-4" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight text-foreground">
                  Browser print
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Print the on-screen preview
                </span>
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
