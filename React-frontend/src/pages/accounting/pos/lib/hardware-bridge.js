/**
 * Hardware-independent POS bridge.
 * Default: browser print. Optional local agent via postMessage / fetch URL.
 */

const CHANNEL = 'finvoroo-pos-customer-display';

function bridgeUrl() {
  try {
    return localStorage.getItem('finvoroo.pos.bridge_url') || '';
  } catch {
    return '';
  }
}

async function postBridge(payload) {
  const url = bridgeUrl();
  if (!url) return { ok: false, reason: 'no_bridge' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, reason: e?.message || 'bridge_error' };
  }
}

/** ESC/POS open drawer pulse (common pin 2 kick). */
export function escPosOpenDrawerBytes() {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export const PosHardwareBridge = {
  async printReceipt({ elementId = 'pos-receipt-print', html } = {}) {
    const bridge = await postBridge({ type: 'print_receipt', html, elementId });
    if (bridge.ok) return bridge;

    const el = document.getElementById(elementId);
    if (!el && !html) {
      window.print();
      return { ok: true, via: 'window.print' };
    }

    const root = document.documentElement;
    root.classList.add('print-pos-receipt-only');
    const cleanup = () => {
      root.classList.remove('print-pos-receipt-only');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => window.print());
    return { ok: true, via: 'browser' };
  },

  async openCashDrawer() {
    const bytes = Array.from(escPosOpenDrawerBytes());
    const bridge = await postBridge({ type: 'open_drawer', escpos: bytes });
    if (bridge.ok) return bridge;
    // Soft signal for agents listening on the page
    window.dispatchEvent(new CustomEvent('pos:open-drawer', { detail: { bytes } }));
    return { ok: true, via: 'event' };
  },

  /**
   * Send raw ESC/POS bytes (base64) to the local print agent.
   * Falls back with { ok: false, reason: 'no_bridge' } when no agent URL is set.
   */
  async printEscPos({ bytesBase64, openDrawer = false } = {}) {
    if (!bytesBase64) return { ok: false, reason: 'no_bytes' };
    const bridge = await postBridge({
      type: 'escpos',
      bytes_base64: bytesBase64,
      open_drawer: openDrawer,
    });
    if (bridge.ok) return { ...bridge, via: 'bridge' };
    return { ok: false, reason: bridge.reason || 'bridge_error' };
  },

  showCustomerDisplay(cartSummary) {
    try {
      const ch = new BroadcastChannel(CHANNEL);
      ch.postMessage({ type: 'cart', payload: cartSummary });
      ch.close();
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent('pos:customer-display', { detail: cartSummary }),
    );
  },

  /** Seam for future offline sale sync — empty in Phase 1. */
  OfflineSaleQueue: {
    enqueue() {
      return null;
    },
    async flush() {
      return { flushed: 0 };
    },
  },
};
