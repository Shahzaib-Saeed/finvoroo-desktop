import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  FileText,
  HandCoins,
  Landmark,
  Plus,
  Receipt,
  User,
  Wallet,
} from 'lucide-react';

const SOURCE_DEFS = [
  {
    key: 'invoice_id',
    kind: 'invoice',
    label: 'Invoice',
    viewLabel: 'View invoice',
    editLabel: 'Edit invoice',
    icon: FileText,
    draftUsesEdit: true,
  },
  {
    key: 'bill_id',
    kind: 'bill',
    label: 'Bill',
    viewLabel: 'View bill',
    editLabel: 'Edit bill',
    icon: Receipt,
    draftUsesEdit: true,
  },
  {
    key: 'payment_id',
    kind: 'payment',
    label: 'Payment',
    viewLabel: 'View payment',
    editLabel: 'Edit payment',
    icon: HandCoins,
    draftUsesEdit: true,
  },
  {
    key: 'credit_note_id',
    kind: 'credit_note',
    label: 'Credit note',
    viewLabel: 'View credit note',
    editLabel: 'View credit note',
    icon: FileText,
    draftUsesEdit: false,
  },
  {
    key: 'vendor_credit_id',
    kind: 'vendor_credit',
    label: 'Vendor credit',
    viewLabel: 'View vendor credit',
    editLabel: 'View vendor credit',
    icon: Wallet,
    draftUsesEdit: false,
  },
  {
    key: 'bill_payment_id',
    kind: 'bill_payment',
    label: 'Bill payment',
    viewLabel: 'View bill payment',
    editLabel: 'View bill payment',
    icon: Banknote,
    draftUsesEdit: false,
    listOnly: true,
  },
  {
    key: 'expense_id',
    kind: 'expense',
    label: 'Expense',
    viewLabel: 'Expenses',
    editLabel: 'Expenses',
    icon: Receipt,
    listOnly: true,
  },
  {
    key: 'deposit_id',
    kind: 'deposit',
    label: 'Deposit',
    viewLabel: 'Deposits',
    editLabel: 'Deposits',
    icon: Wallet,
    listOnly: true,
  },
  {
    key: 'withdrawal_id',
    kind: 'withdrawal',
    label: 'Withdrawal',
    viewLabel: 'Withdrawals',
    editLabel: 'Withdrawals',
    icon: Wallet,
    listOnly: true,
  },
  {
    key: 'transfer_id',
    kind: 'transfer',
    label: 'Transfer',
    viewLabel: 'Transfers',
    editLabel: 'Transfers',
    icon: ArrowLeftRight,
    listOnly: true,
  },
];

const GUIDANCE_ICON = {
  invoice: FileText,
  bill: Receipt,
  payment: HandCoins,
  bill_payment: Banknote,
  credit_note: FileText,
  vendor_credit: Wallet,
  expense: Receipt,
  deposit: Wallet,
  withdrawal: Wallet,
  transfer: ArrowLeftRight,
  bank_account: Landmark,
  bank_accounts: Landmark,
  chart_of_accounts: BookOpen,
  customer: User,
  journal: BookOpen,
  journal_create: Plus,
  invoices: FileText,
  bills: Receipt,
  payments: HandCoins,
  expenses: Receipt,
  credit_notes: FileText,
  vendor_credits: Wallet,
};

function accountingBase(workspaceId) {
  return `/workspace/${workspaceId}/accounting`;
}

function hrefForSource(kind, id, workspaceId, isDraft, def) {
  const base = accountingBase(workspaceId);
  const useEdit = isDraft && def?.draftUsesEdit;

  switch (kind) {
    case 'invoice':
      return useEdit ? `${base}/invoices/${id}/edit` : `${base}/invoices/${id}`;
    case 'bill':
      return useEdit ? `${base}/bills/${id}/edit` : `${base}/bills/${id}`;
    case 'payment':
      return useEdit ? `${base}/payments/${id}/edit` : `${base}/payments/${id}`;
    case 'credit_note':
      return `${base}/credit-notes/${id}`;
    case 'vendor_credit':
      return `${base}/vendor-credits/${id}`;
    case 'bill_payment':
      return `${base}/bill-payments/${id}`;
    case 'expense':
      return `${base}/expenses`;
    case 'deposit':
      return `${base}/deposits`;
    case 'withdrawal':
      return `${base}/withdrawals`;
    case 'transfer':
      return `${base}/transfers`;
    default:
      return null;
  }
}

function hrefForGuidance(kind, id, workspaceId) {
  const base = accountingBase(workspaceId);

  switch (kind) {
    case 'invoice':
      return id ? `${base}/invoices/${id}` : `${base}/invoices`;
    case 'bill':
      return id ? `${base}/bills/${id}` : `${base}/bills`;
    case 'payment':
      return id ? `${base}/payments/${id}` : `${base}/payments`;
    case 'bill_payment':
      return id ? `${base}/bill-payments/${id}` : `${base}/bill-payments`;
    case 'credit_note':
      return id ? `${base}/credit-notes/${id}` : `${base}/credit-notes`;
    case 'vendor_credit':
      return id ? `${base}/vendor-credits/${id}` : `${base}/vendor-credits`;
    case 'expense':
    case 'expenses':
      return `${base}/expenses`;
    case 'deposit':
    case 'deposits':
      return `${base}/deposits`;
    case 'withdrawal':
    case 'withdrawals':
      return `${base}/withdrawals`;
    case 'transfer':
    case 'transfers':
      return `${base}/transfers`;
    case 'bank_account':
      return id ? `${base}/bank-accounts/${id}/edit` : `${base}/bank-accounts`;
    case 'bank_accounts':
      return `${base}/bank-accounts`;
    case 'chart_of_accounts':
      return `${base}/chart-of-accounts`;
    case 'customer':
      return id ? `${base}/customers/${id}` : `${base}/customers`;
    case 'journal':
      return id ? `${base}/journal/${id}` : `${base}/journal`;
    case 'journal_create':
      return `${base}/journal/create`;
    case 'invoices':
      return `${base}/invoices`;
    case 'bills':
      return `${base}/bills`;
    case 'payments':
      return `${base}/payments`;
    case 'credit_notes':
      return `${base}/credit-notes`;
    case 'vendor_credits':
      return `${base}/vendor-credits`;
    default:
      return null;
  }
}

export function getJournalSourceLinks(entry, workspaceId) {
  const sources = entry?.sources || {};
  const isDraft = (entry?.status || 'draft') === 'draft';

  return SOURCE_DEFS.flatMap((def) => {
    const id = sources[def.key];
    if (!id) return [];

    const href = hrefForSource(def.kind, id, workspaceId, isDraft, def);
    if (!href) return [];

    return [
      {
        kind: def.kind,
        id,
        label: isDraft && def.draftUsesEdit ? def.editLabel : def.viewLabel,
        shortLabel: def.label,
        href,
        icon: def.icon,
      },
    ];
  });
}

/**
 * Where to edit when this journal row cannot be changed directly.
 * Prefers server `edit_guidance`, falls back to client heuristics.
 */
export function getJournalEditGuidance(entry, workspaceId) {
  if (!entry) return [];

  const fromApi = Array.isArray(entry.edit_guidance) ? entry.edit_guidance : [];
  const links = fromApi
    .map((item) => {
      const kind = item?.kind;
      const id = item?.id;
      const href = hrefForGuidance(kind, id, workspaceId);
      if (!href) return null;
      return {
        kind,
        id,
        label: item.label || kind,
        href,
        icon: GUIDANCE_ICON[kind] || BookOpen,
      };
    })
    .filter(Boolean);

  if (links.length > 0) {
    return links;
  }

  const fallback = [];
  const base = accountingBase(workspaceId);

  if (entry.customer_id) {
    fallback.push({
      kind: 'customer',
      id: entry.customer_id,
      label: 'Edit on customer',
      href: `${base}/customers/${entry.customer_id}`,
      icon: User,
    });
  }

  if (entry.voided_journal_id) {
    fallback.push({
      kind: 'journal',
      id: entry.voided_journal_id,
      label: 'View voided journal',
      href: `${base}/journal/${entry.voided_journal_id}`,
      icon: BookOpen,
    });
  }

  if (entry.reversal_entry_id) {
    fallback.push({
      kind: 'journal',
      id: entry.reversal_entry_id,
      label: 'View void reversal',
      href: `${base}/journal/${entry.reversal_entry_id}`,
      icon: BookOpen,
    });
  }

  if (entry.is_opening_balance) {
    fallback.push(
      {
        kind: 'bank_accounts',
        label: 'Bank accounts',
        href: `${base}/bank-accounts`,
        icon: Landmark,
      },
      {
        kind: 'chart_of_accounts',
        label: 'Chart of accounts',
        href: `${base}/chart-of-accounts`,
        icon: BookOpen,
      },
    );
  }

  const sourceLinks = getJournalSourceLinks(entry, workspaceId);
  sourceLinks.forEach((source) => {
    fallback.push({
      kind: source.kind,
      id: source.id,
      label: source.label,
      href: source.href,
      icon: source.icon,
    });
  });

  const seen = new Set();
  return fallback.filter((link) => {
    const key = `${link.kind}|${link.id || ''}|${link.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getJournalEditBlockedMessage(entry) {
  const flags = entry?.flags || {};
  return (
    flags.edit_blocked_reason ||
    flags.delete_blocked_reason ||
    (entry?.is_void_reversal
      ? 'This is an automatic void reversal — it keeps the audit trail and cannot be edited here.'
      : entry?.status === 'voided'
        ? 'This journal was voided. Open the void reversal or create a new entry instead of editing here.'
        : entry?.is_opening_balance
          ? 'Opening balance amounts are edited on the bank account or chart of accounts — not on this journal.'
          : entry?.source_kind
            ? 'This entry was posted from another document. Edit it from that source page.'
            : null)
  );
}

export function getJournalPrimarySource(entry, workspaceId) {
  const links = getJournalSourceLinks(entry, workspaceId);
  return links.find((l) => l.kind === 'invoice' || l.kind === 'bill') || links[0] || null;
}

export function getJournalReferenceHref(entry, workspaceId, journalHref) {
  const primary = getJournalPrimarySource(entry, workspaceId);
  return primary?.href || journalHref;
}

/** Human document number (e.g. INV-2026-0015) instead of internal GL ref (INV-108). */
export function getJournalDisplayReference(entry) {
  if (entry?.display_reference) {
    return entry.display_reference;
  }
  if (entry?.source_document_number) {
    return entry.source_document_number;
  }
  // Source document is gone (see is_archived) — show its number as it was
  // at delete time instead of the internal reversal/superseded GL reference.
  if (entry?.is_archived && entry?.deleted_source_number) {
    return entry.deleted_source_number;
  }
  return entry?.reference || entry?.journal_number || (entry?.id ? `#${entry.id}` : '—');
}
