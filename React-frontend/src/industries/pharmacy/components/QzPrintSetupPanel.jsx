import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Printer, RefreshCw, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  clearQzUnavailable,
  getQzPrinterName,
  isQzPrintEnabled,
  probeQz,
  setQzPrintEnabled,
  setQzPrinterName,
  testQzPrint,
} from '@/lib/qz-print-service';

const STEPS = [
  { id: 'server', label: 'Server signing keys' },
  { id: 'desktop', label: 'QZ Tray on this PC' },
  { id: 'printers', label: 'Thermal printer' },
];

function StepRow({ label, state }) {
  const icon =
    state === 'done' ? (
      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
    ) : state === 'active' ? (
      <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
    ) : state === 'error' ? (
      <Circle className="size-4 text-amber-500 shrink-0" />
    ) : (
      <Circle className="size-4 text-muted-foreground/40 shrink-0" />
    );

  return (
    <div className="flex items-center gap-2.5 text-sm">
      {icon}
      <span className={state === 'done' ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}

export function QzPrintSetupPanel({ disabled = false }) {
  const [enabled, setEnabled] = useState(() => isQzPrintEnabled());
  const [printer, setPrinter] = useState(() => getQzPrinterName());
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [status, setStatus] = useState({
    connected: false,
    printers: [],
    defaultPrinter: null,
    reason: null,
    checked: false,
  });

  const stepState = (id) => {
    if (!connecting && !status.checked) return 'idle';
    if (status.connected) return 'done';
    if (activeStep === id) return 'active';
    const order = ['server', 'desktop', 'printers', 'ready'];
    const activeIdx = order.indexOf(activeStep);
    const idx = order.indexOf(id);
    if (activeIdx > idx) return 'done';
    if (status.reason && activeStep === id) return 'error';
    if (status.checked && !status.connected && id === 'desktop') return 'error';
    return 'idle';
  };

  const connect = useCallback(async () => {
    clearQzUnavailable();
    setConnecting(true);
    setActiveStep('server');
    setStatus((s) => ({ ...s, reason: null }));

    try {
      const result = await probeQz({
        force: true,
        onStep: (step) => setActiveStep(step),
      });

      setStatus({
        connected: !!result.ok,
        printers: result.printers || [],
        defaultPrinter: result.defaultPrinter || null,
        reason: result.reason || null,
        checked: true,
      });

      if (result.ok && result.selectedPrinter) {
        setPrinter((current) => {
          if (!current) {
            setQzPrinterName(result.selectedPrinter);
            return result.selectedPrinter;
          }
          return current;
        });
        toast.success('QZ Tray connected');
      } else if (result.reason) {
        toast.error(result.reason, { duration: 8000 });
      }
    } catch (err) {
      setStatus({
        connected: false,
        printers: [],
        defaultPrinter: null,
        reason: err?.message || 'Connection failed',
        checked: true,
      });
    } finally {
      setConnecting(false);
      setActiveStep(null);
    }
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const handleTestPrint = async () => {
    if (!printer) {
      toast.error('Select a printer first');
      return;
    }
    setQzPrinterName(printer);
    setTesting(true);
    try {
      const result = await testQzPrint();
      if (result.ok) toast.success(`Test sent to ${result.printer}`);
      else toast.error(result.reason || 'Test print failed');
    } finally {
      setTesting(false);
    }
  };

  const printerOptions =
    status.printers?.length > 0
      ? status.printers
      : [status.defaultPrinter, printer].filter(Boolean);

  return (
    <div className="rounded-xl border bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/40 dark:to-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b bg-white/70 dark:bg-slate-950/30 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Printer className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Silent receipt printing</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed max-w-md">
              Prints instantly after each sale — no Chrome popup. QZ demo working only means QZ is
              installed; you still must connect this website once.
            </p>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${
            status.connected
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : connecting
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
          }`}
        >
          <Wifi className="size-3" />
          {connecting ? 'Connecting…' : status.connected ? 'Connected' : 'Not connected'}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Use silent print (QZ Tray)</span>
          <Switch
            checked={enabled}
            disabled={disabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              setQzPrintEnabled(v);
            }}
          />
        </label>

        <div className="rounded-lg border bg-background/80 p-3.5 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Setup checklist
          </p>
          {STEPS.map((step) => (
            <StepRow key={step.id} label={step.label} state={stepState(step.id)} />
          ))}
        </div>

        {status.reason && !connecting ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-medium">Action needed</p>
            <p className="mt-1">{status.reason}</p>
            <p className="mt-2 text-[11px] opacity-90">
              Tip: Right-click the QZ icon in the Windows taskbar → Site Manager → add your ERP
              website → set to Trusted. Then click Connect again.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={connect} disabled={connecting || disabled}>
            {connecting ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            {connecting ? 'Connecting…' : 'Connect'}
          </Button>
          {status.connected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testing || !printer}
              onClick={handleTestPrint}
            >
              {testing ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Printer className="size-3.5 mr-1.5" />
              )}
              Test print
            </Button>
          ) : null}
        </div>

        {status.connected ? (
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs text-muted-foreground">Receipt printer on this PC</Label>
            <Select
              value={printer || status.defaultPrinter || ''}
              onValueChange={(v) => {
                setPrinter(v);
                setQzPrinterName(v);
                toast.success('Printer saved');
              }}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Choose printer (e.g. BC-95AC)" />
              </SelectTrigger>
              <SelectContent>
                {printerOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
