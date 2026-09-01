import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  FINVOROO_TEST_PDF_BASE64,
  THERMAL_TEST_ESCPOS_BASE64,
  PRINT_AGENT_DOWNLOAD_URL,
  PRINT_AGENT_LATEST_VERSION,
  PRINT_DRIVERS,
  agentNotInstalledMessage,
  printerIsThermal,
  getInvoicePrinterId,
  getLabelPrinterId,
  getPrintAgentToken,
  getPrintDriver,
  getPrinters,
  getReceiptPrinterId,
  getReceiptPaper,
  getStatus,
  pair,
  printPdf,
  printZpl,
  printESCPOS,
  setInvoicePrinterId,
  setLabelPrinterId,
  setPrintAgentToken,
  setPrintDriver,
  setReceiptPrinterId,
  setReceiptPaper,
} from '@/lib/print-agent';

function StatusDot({ ok }) {
  return ok ? (
    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
  ) : (
    <Circle className="size-4 shrink-0 text-amber-500" />
  );
}

function PrinterSelect({ label, value, printers, disabled, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ''} disabled={disabled || !printers.length} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose printer" />
        </SelectTrigger>
        <SelectContent>
          {printers.map((p) => (
            <SelectItem key={p.id || p.systemName || p.name} value={p.id || p.systemName || p.name}>
              {p.name}
              {p.default ? ' (default)' : ''} · {p.type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function compareSemver(a, b) {
  const pa = String(a || '0').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '0').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function PrintAgentSetupPanel({ disabled = false, embedded = false }) {
  const [driver, setDriver] = useState(() => getPrintDriver());
  const [token, setToken] = useState(() => getPrintAgentToken());
  const [pairCode, setPairCode] = useState('');
  const [receiptPrinter, setReceiptPrinter] = useState(() => getReceiptPrinterId());
  const [receiptPaper, setReceiptPaperState] = useState(() => getReceiptPaper());
  const [invoicePrinter, setInvoicePrinter] = useState(() => getInvoicePrinterId());
  const [labelPrinter, setLabelPrinter] = useState(() => getLabelPrinterId());
  const [checking, setChecking] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState({
    running: false,
    installed: false,
    version: null,
    message: null,
    printers: [],
  });

  const enabled = driver === PRINT_DRIVERS.AGENT;

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const next = await getStatus();
      let printers = [];
      if (next.running && getPrintAgentToken()) {
        try {
          printers = await getPrinters();
        } catch (err) {
          next.message = err?.message || 'Token rejected by the agent';
        }
      }
      setStatus({ ...next, printers });
      if (!getReceiptPrinterId() && printers.length) {
        const def = printers.find((p) => p.default) || printers[0];
        const id = def?.id || def?.systemName || def?.name;
        if (id) {
          setReceiptPrinter(id);
          setReceiptPrinterId(id);
        }
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onToggle = (value) => {
    const next = value ? PRINT_DRIVERS.AGENT : PRINT_DRIVERS.BROWSER;
    setDriver(next);
    setPrintDriver(next);
  };

  const onPair = async () => {
    if (!pairCode.trim()) {
      toast.error('Enter the 6-digit code from the Print Agent window');
      return;
    }
    setPairing(true);
    try {
      const data = await pair(pairCode);
      setToken(data.token || getPrintAgentToken());
      setPairCode('');
      setDriver(PRINT_DRIVERS.AGENT);
      toast.success('Finvoroo paired with Print Agent');
      await refresh();
    } catch (err) {
      toast.error(err?.message || 'Pairing failed');
    } finally {
      setPairing(false);
    }
  };

  const onSaveToken = () => {
    setPrintAgentToken(token);
    setPrintDriver(PRINT_DRIVERS.AGENT);
    toast.success('Print Agent token saved on this PC');
    refresh();
  };

  const onTest = async () => {
    if (!receiptPrinter) {
      toast.error('Select a receipt printer first');
      return;
    }
    setReceiptPrinterId(receiptPrinter);
    setTesting(true);
    try {
      const printer = status.printers.find(
        (p) => (p.id || p.systemName || p.name) === receiptPrinter,
      );
      if (printer?.type === 'zebra') {
        await printZpl(
          receiptPrinter,
          '^XA^FO40,40^A0N,40,40^FDFinvoroo Print Agent^FS^FO40,100^A0N,24,24^FDTest print OK^FS^XZ',
        );
      } else if (!printer || printerIsThermal(printer)) {
        await printESCPOS(receiptPrinter, THERMAL_TEST_ESCPOS_BASE64, 'base64');
      } else {
        await printPdf(receiptPrinter, FINVOROO_TEST_PDF_BASE64);
      }
      toast.success(`Test sent to ${receiptPrinter}`);
    } catch (err) {
      toast.error(err?.message || 'Test print failed');
    } finally {
      setTesting(false);
    }
  };

  const running = status.running && !status.message?.includes('Token rejected');
  const installedVer = status.version || status.installedVersion;
  const previousVer = status.previousVersion;
  const updateAvailable =
    status.installed &&
    installedVer &&
    compareSemver(PRINT_AGENT_LATEST_VERSION, installedVer) > 0;

  return (
    <div
      className={cn(
        'space-y-4',
        !embedded && 'rounded-lg border border-sky-200/80 bg-sky-50/40 p-4',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {!embedded ? (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Printer className="size-4 text-sky-700" />
              Finvoroo Print Agent
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pair once, pick printers and paper width. Receipts print through the agent after
              checkout.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enable the agent on this till, pair with the code shown in the Print Agent window, then
            select your receipt printer and paper size.
          </p>
        )}
        <label className="flex shrink-0 items-center gap-2 text-xs">
          <span className="text-muted-foreground">Use agent</span>
          <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
        </label>
      </div>

      <div
        className={cn(
          'rounded-lg border px-3 py-2.5 text-xs',
          updateAvailable
            ? 'border-amber-200 bg-amber-50/80 text-amber-950'
            : embedded
              ? 'border-border bg-muted/20 text-foreground'
              : 'border-sky-200/80 bg-white/80 text-slate-800',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Latest Windows release
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">v{PRINT_AGENT_LATEST_VERSION}</p>
          </div>
          {status.installed ? (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                On this PC
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">
                v{installedVer || '—'}
                {updateAvailable ? (
                  <span className="ms-2 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Update
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>
        {status.installed && previousVer ? (
          <p className="mt-2 border-t border-black/5 pt-2 text-[11px] text-muted-foreground">
            Previous install: <span className="font-semibold text-slate-800">v{previousVer}</span>
            {installedVer && previousVer !== installedVer
              ? ` · updated to v${installedVer}`
              : ''}
          </p>
        ) : null}
        {updateAvailable ? (
          <p className="mt-2 text-[11px] leading-relaxed">
            Download the new installer below and run it on this till. Pairing and printers are kept.
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          'space-y-1.5 text-sm',
          embedded && 'grid gap-2 sm:grid-cols-3 sm:gap-3 sm:space-y-0',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusDot ok={status.installed} />
          <span>
            {status.installed
              ? `Agent running v${installedVer || PRINT_AGENT_LATEST_VERSION}`
              : agentNotInstalledMessage()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={Boolean(token)} />
          <span>{token ? 'This PC is paired' : 'Not paired yet'}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={running && status.printers.length > 0} />
          <span>
            {status.printers.length
              ? `${status.printers.length} printer(s) available`
              : 'Printers appear after pairing'}
          </span>
        </div>
      </div>

      {!status.installed ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{agentNotInstalledMessage()}</p>
          <p>
            Download FinvorooPrintAgent-Setup.exe (v{PRINT_AGENT_LATEST_VERSION}) on this PC and run
            it. Node.js and other developer tools are not required.
          </p>
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href={PRINT_AGENT_DOWNLOAD_URL} download="FinvorooPrintAgent-Setup.exe">
              <Download className="mr-1.5 size-3.5" />
              Download v{PRINT_AGENT_LATEST_VERSION} installer
            </a>
          </Button>
        </div>
      ) : null}

      {status.installed && !token ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Pairing code from the Print Agent window
          </Label>
          <div className="flex gap-2">
            <Input
              value={pairCode}
              disabled={disabled || pairing}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              onChange={(e) => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="button" disabled={disabled || pairing} onClick={onPair}>
              {pairing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Pair
            </Button>
          </div>
        </div>
      ) : null}

      {token ? (
        <div className={cn('space-y-3', embedded && 'sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0')}>
          <PrinterSelect
            label="Receipt printer"
            value={receiptPrinter}
            printers={status.printers}
            disabled={disabled}
            onChange={(value) => {
              setReceiptPrinter(value);
              setReceiptPrinterId(value);
            }}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Receipt paper width</Label>
            <Select
              value={receiptPaper}
              disabled={disabled}
              onValueChange={(value) => {
                setReceiptPaperState(value);
                setReceiptPaper(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal_80">80 mm (standard POS)</SelectItem>
                <SelectItem value="thermal_58">58 mm (narrow)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PrinterSelect
            label="Invoice printer"
            value={invoicePrinter}
            printers={status.printers}
            disabled={disabled}
            onChange={(value) => {
              setInvoicePrinter(value);
              setInvoicePrinterId(value);
            }}
          />
          <PrinterSelect
            label="Label printer"
            value={labelPrinter}
            printers={status.printers}
            disabled={disabled}
            onChange={(value) => {
              setLabelPrinter(value);
              setLabelPrinterId(value);
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={checking} onClick={refresh}>
          {checking ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || testing || !receiptPrinter || !status.installed}
          onClick={onTest}
        >
          {testing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          Test print
        </Button>
      </div>

      <button
        type="button"
        className="text-[11px] font-medium text-muted-foreground underline"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? 'Hide advanced token' : 'Advanced: paste token'}
      </button>
      {showAdvanced ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Installation token</Label>
          <div className="flex gap-2">
            <Input
              value={token}
              disabled={disabled}
              placeholder="Paste token from the agent settings window"
              onChange={(e) => setToken(e.target.value)}
            />
            <Button type="button" variant="outline" disabled={disabled} onClick={onSaveToken}>
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
