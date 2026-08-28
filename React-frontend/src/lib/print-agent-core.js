export const PRINT_DRIVERS = {
  AGENT: 'finvoroo-agent',
  QZ: 'qz',
  BROWSER: 'browser',
};

export function resolvePrintDriver({ storedDriver, agentEnabled, hasToken }) {
  const stored = String(storedDriver || '').trim();
  if (
    stored === PRINT_DRIVERS.AGENT ||
    stored === PRINT_DRIVERS.QZ ||
    stored === PRINT_DRIVERS.BROWSER
  ) {
    return stored;
  }
  if (agentEnabled && hasToken) return PRINT_DRIVERS.AGENT;
  return PRINT_DRIVERS.BROWSER;
}

export function formatPrintAgentError(err, printerName = '') {
  const status = err?.status;
  const raw = String(err?.data?.error || err?.message || '').trim();
  const printer = printerName || err?.printerName || '';

  if (status === 0 || err?.name === 'AbortError' || /failed to fetch|network|offline/i.test(raw)) {
    return 'Finvoroo Print Agent is offline. Please start Finvoroo Print Agent.';
  }
  if (status === 401 || /invalid or missing/i.test(raw) || /pairing/i.test(raw)) {
    return 'Finvoroo Print Agent is not paired on this PC.';
  }
  if (/unavailable/i.test(raw)) {
    return printer ? `Printer "${printer}" is unavailable.` : raw;
  }
  if (/WritePrinter/i.test(raw)) {
    return 'The printer rejected the receipt data (WritePrinter). Try Test print, then print the sale again.';
  }
  if (/already in progress/i.test(raw)) {
    return 'A print job is already running. Wait a second and try again.';
  }
  if (raw && !/^print agent http/i.test(raw)) {
    return raw;
  }
  return 'Printing failed. Please check the printer.';
}

export function agentOfflineMessage() {
  return 'Finvoroo Print Agent is offline. Please start Finvoroo Print Agent.';
}

export function agentNotInstalledMessage() {
  return 'Finvoroo Print Agent is not installed.';
}

export function printerIsThermal(printer) {
  const hay = [
    printer?.type,
    printer?.name,
    printer?.id,
    printer?.systemName,
    printer?.driver,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (printer?.type === 'thermal' || printer?.type === 'zebra') return true;
  return /bixolon|bc-?95|epson|star |tm-t|thermal|receipt|xprinter|citizen|pos[\s\-]?80|pos[\s\-]?58|pos80|pos58/.test(
    hay,
  );
}
