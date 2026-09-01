/**
 * Memo / narrative for account statement rows — customer/vendor first,
 * without repeating the statement account name (e.g. "Revenue — Revenue: …").
 */
export function formatStatementNarrative(entry, account) {
  const party = String(entry?.party_name ?? "").trim();
  let memo = String(
    entry?.line_description || entry?.entry_description || "",
  ).trim();

  memo = stripRedundantAccountMemo(memo, account?.name);

  if (party && memo) {
    const memoLower = memo.toLowerCase();
    const partyLower = party.toLowerCase();
    if (memoLower.includes(partyLower)) return party;
    return `${party} — ${memo}`;
  }

  if (party) return party;
  if (memo) return memo;
  return "—";
}

function stripRedundantAccountMemo(memo, accountName) {
  const generic = [
    /^Cost of Goods Sold$/i,
    /^Cost of Goods Returned$/i,
    /^COGS rounding parity$/i,
    /^COGS sale-cost true-up$/i,
  ];
  for (const pattern of generic) {
    if (pattern.test(memo)) return "";
  }

  const name = String(accountName ?? "").trim();
  if (!name) return memo;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(`^Revenue\\s*[—–-]\\s*${escaped}$`, "i"),
    new RegExp(`^${escaped}$`, "i"),
    new RegExp(`^Sales\\s*[—–-]\\s*${escaped}$`, "i"),
    new RegExp(`^Accounts Receivable$`, "i"),
  ];

  for (const pattern of patterns) {
    if (pattern.test(memo)) return "";
  }

  const revenueMatch = /^Revenue\s*[—–-]\s*(.+)$/i.exec(memo);
  if (revenueMatch && revenueMatch[1].trim().toLowerCase() === name.toLowerCase()) {
    return "";
  }

  return memo;
}
