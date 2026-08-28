import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRINT_DRIVERS,
  resolvePrintDriver,
  formatPrintAgentError,
  agentOfflineMessage,
  agentNotInstalledMessage,
  printerIsThermal,
} from './print-agent-core.js';

describe('resolvePrintDriver', () => {
  it('honors an explicit stored driver', () => {
    assert.equal(
      resolvePrintDriver({ storedDriver: 'finvoroo-agent', agentEnabled: false, hasToken: false }),
      PRINT_DRIVERS.AGENT,
    );
    assert.equal(
      resolvePrintDriver({ storedDriver: 'qz', agentEnabled: true, hasToken: true }),
      PRINT_DRIVERS.QZ,
    );
    assert.equal(
      resolvePrintDriver({ storedDriver: 'browser', agentEnabled: true, hasToken: true }),
      PRINT_DRIVERS.BROWSER,
    );
  });

  it('maps legacy enabled+token to the agent driver', () => {
    assert.equal(
      resolvePrintDriver({ storedDriver: '', agentEnabled: true, hasToken: true }),
      PRINT_DRIVERS.AGENT,
    );
  });

  it('defaults to browser so existing tills keep Chrome print', () => {
    assert.equal(
      resolvePrintDriver({ storedDriver: '', agentEnabled: false, hasToken: false }),
      PRINT_DRIVERS.BROWSER,
    );
    assert.equal(
      resolvePrintDriver({ storedDriver: '', agentEnabled: true, hasToken: false }),
      PRINT_DRIVERS.BROWSER,
    );
  });
});

describe('formatPrintAgentError', () => {
  it('describes an offline agent', () => {
    assert.equal(
      formatPrintAgentError({ name: 'AbortError' }),
      agentOfflineMessage(),
    );
  });

  it('names an unavailable printer', () => {
    assert.equal(
      formatPrintAgentError(
        { status: 422, message: 'Printer "Zebra GK420d" is unavailable.' },
        'Zebra GK420d',
      ),
      'Printer "Zebra GK420d" is unavailable.',
    );
  });

  it('uses a generic printing failed message', () => {
    assert.equal(
      formatPrintAgentError({ status: 500 }),
      'Printing failed. Please check the printer.',
    );
  });

  it('surfaces WritePrinter failures instead of a generic message', () => {
    assert.equal(
      formatPrintAgentError({ status: 422, message: 'WritePrinter failed (wrote 0 of 80000 bytes)' }),
      'The printer rejected the receipt data (WritePrinter). Try Test print, then print the sale again.',
    );
  });
});

describe('install copy', () => {
  it('tells the cashier the agent is not installed', () => {
    assert.equal(agentNotInstalledMessage(), 'Finvoroo Print Agent is not installed.');
  });
});

describe('printerIsThermal', () => {
  it('treats Bixolon BC-95AC and POS 80 as thermal', () => {
    assert.equal(printerIsThermal({ name: 'BC-95AC', type: 'windows' }), true);
    assert.equal(printerIsThermal({ name: 'POS 80', type: 'windows' }), true);
    assert.equal(printerIsThermal({ name: 'HP LaserJet', type: 'windows' }), false);
  });
});
