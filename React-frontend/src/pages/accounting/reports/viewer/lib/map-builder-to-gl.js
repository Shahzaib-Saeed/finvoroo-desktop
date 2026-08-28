import {
  GL_MONEY_COLUMN_IDS,
  GL_STANDARD_COLUMNS,
  mergeGlReportColumns,
  sortGlReportColumns,
} from '../../constants/report-columns';
import { deriveMoneyTotals } from './viewer-presentation';

/** Builder dataset field keys → GeneralLedgerTable column ids. */
const BUILDER_KEY_TO_GL_ID = {
  entry_date: 'date',
  date: 'date',
  reference: 'reference',
  journal_type: 'journal',
  journal: 'journal',
  entry_description: 'description',
  line_description: 'description',
  description: 'description',
  debit: 'debit',
  credit: 'credit',
  balance: 'balance',
  running_balance: 'balance',
  aging_label: 'aging',
  aging: 'aging',
  code: 'account',
  account_code: 'account',
  account_name: 'account',
};

const GL_STANDARD_BY_ID = Object.fromEntries(
  GL_STANDARD_COLUMNS.map((col) => [col.id, col]),
);

function builderKeyToGlId(key) {
  const k = String(key || '');
  if (k.startsWith('cf:')) return k;
  return BUILDER_KEY_TO_GL_ID[k] || null;
}

export function extractCustomFieldColumns(builderColumns = []) {
  return builderColumns
    .filter((c) => {
      const key = String(c?.key || '');
      return key.startsWith('cf:') || c.custom_field_id;
    })
    .map((c) => {
      const key = String(c.key || '');
      const id = key.startsWith('cf:') ? key : `cf:${c.custom_field_id}`;
      const customFieldId = key.startsWith('cf:')
        ? key.slice(3)
        : c.custom_field_id;
      return {
        id,
        label: c.label,
        can_hide: true,
        custom_field_id: Number(customFieldId) || customFieldId,
      };
    });
}

/** Build GL column definitions from builder result columns. */
export function mapBuilderColumnsToGlAvailable(builderColumns = []) {
  const customCols = extractCustomFieldColumns(builderColumns);
  return sortGlReportColumns(
    mergeGlReportColumns(GL_STANDARD_COLUMNS, customCols).filter(
      (col) => col.id !== 'account',
    ),
  );
}

/**
 * Columns configured in the saved report definition (builder column picker).
 * Always includes Account first so groups show account names like standard GL.
 */
export function mapSavedDefinitionToGlColumns(
  savedColumnKeys = [],
  datasetFields = [],
  resultColumns = [],
) {
  const fieldByKey = new Map(
    (datasetFields || []).map((f) => [String(f.key), f]),
  );
  const resultByKey = new Map(
    (resultColumns || []).map((c) => [String(c.key), c]),
  );

  const seen = new Set();
  const cols = [];

  // Account is required for peachtree-style grouping labels (not optional).
  const accountCol = GL_STANDARD_BY_ID.account;
  if (accountCol) {
    cols.push({ ...accountCol, can_hide: false });
    seen.add('account');
  }

  for (const rawKey of savedColumnKeys) {
    const key = String(rawKey || '');
    if (!key) continue;

    const glId = builderKeyToGlId(key);
    if (!glId || glId === 'account') continue;
    if (seen.has(glId)) continue;

    if (key.startsWith('cf:')) {
      const field = fieldByKey.get(key);
      const resultCol = resultByKey.get(key);
      cols.push({
        id: key,
        label: resultCol?.label || field?.label || key.slice(3),
        can_hide: true,
        custom_field_id: key.slice(3),
      });
      seen.add(key);
      continue;
    }

    const standard = GL_STANDARD_BY_ID[glId];
    if (standard) {
      cols.push({ ...standard });
      seen.add(glId);
    }
  }

  for (const id of GL_MONEY_COLUMN_IDS) {
    if (seen.has(id)) continue;
    const standard = GL_STANDARD_BY_ID[id];
    if (standard) {
      cols.push({ ...standard });
      seen.add(id);
    }
  }

  return sortGlReportColumns(cols);
}

/** @returns {string[]} GL column ids (and cf: keys) for builder-selected columns. */
export function savedDefinitionGlColumnIds(savedColumnKeys = []) {
  const ids = ['account'];
  const seen = new Set(['account']);
  for (const rawKey of savedColumnKeys || []) {
    const glId = builderKeyToGlId(String(rawKey || ''));
    if (!glId || glId === 'account' || seen.has(glId)) continue;
    seen.add(glId);
    ids.push(glId);
  }
  return ids;
}

/** Normalize builder rows for GeneralLedgerTable / GeneralLedgerStatement. */
export function mapBuilderRowsToGlRows(rows = []) {
  return rows.map((row) => {
    const custom_fields = { ...(row.custom_fields || {}) };

    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('cf:')) {
        custom_fields[key.slice(3)] = value;
      }
    }

    return {
      ...row,
      entry_date: row.entry_date ?? row.date,
      line_description:
        row.line_description ??
        row.entry_description ??
        row.description ??
        '',
      entry_description:
        row.entry_description ??
        row.line_description ??
        row.description ??
        '',
      journal_type: row.journal_type ?? row.journal,
      debit: row.debit,
      credit: row.credit,
      balance: row.balance ?? row.running_balance,
      code: row.code ?? row.account_code,
      account_name: row.account_name ?? row.name,
      party_name:
        row.party_name ?? row.customer_name ?? row.vendor_name ?? row.contact_name,
      display_reference: row.display_reference,
      source_document_number: row.source_document_number,
      reference_no: row.reference_no,
      source_payment_id: row.source_payment_id,
      source_bill_payment_id: row.source_bill_payment_id,
      source_invoice_id: row.source_invoice_id,
      source_bill_id: row.source_bill_id,
      source_credit_note_id: row.source_credit_note_id,
      source_vendor_credit_id: row.source_vendor_credit_id,
      source_kind: row.source_kind,
      source_id: row.source_id,
      journal_entry_id: row.journal_entry_id,
      line_id: row.line_id,
      payment_number: row.payment_number,
      receipt_number: row.receipt_number,
      custom_fields,
    };
  });
}

export function builderResultToGlMeta(result, currency, page, perPage) {
  const total = Number(result?.total) || 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const totals = deriveMoneyTotals(result);

  return {
    total,
    current_page: page,
    last_page: lastPage,
    base_currency: currency,
    totals: totals
      ? { total_debit: totals.total_debit, total_credit: totals.total_credit }
      : { total_debit: 0, total_credit: 0 },
  };
}
