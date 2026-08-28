import { format, parseISO } from "date-fns";

export const AGING_BUCKET_KEYS = [
  "current",
  "b1_30",
  "b31_60",
  "b61_90",
  "b91plus",
];

export const AGING_BUCKET_LABELS = {
  current: "Current",
  b1_30: "1–30",
  b31_60: "31–60",
  b61_90: "61–90",
  b91plus: "90+",
};

export const AGING_BUCKET_EXPORT_LABELS = {
  current: "Current",
  b1_30: "1-30 Days",
  b31_60: "31-60 Days",
  b61_90: "61-90 Days",
  b91plus: "Over 90 Days",
};

export function partyCodeSubtitle(name, code) {
  const label = String(name || "").trim();
  const id = String(code || "").trim();
  if (!id || id.toLowerCase() === label.toLowerCase()) return null;
  return id;
}

export function lineOpenBalance(line) {
  const raw = line?.balance_due ?? line?.amount_due;
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function isOpenLine(line) {
  if (line?.is_paid === true) return false;
  return lineOpenBalance(line) > 0.001;
}

export function filterOpenLines(lines) {
  return (lines || []).filter(isOpenLine);
}

export function hasOutstandingLines(party, lineKey) {
  return filterOpenLines(party[lineKey]).length > 0;
}

export function filterActiveParties(rows, lineKey) {
  return rows.filter((row) => hasOutstandingLines(row, lineKey));
}

export function sumBucketTotals(parties) {
  const totals = Object.fromEntries(AGING_BUCKET_KEYS.map((k) => [k, 0]));
  let grand = 0;

  for (const party of parties) {
    for (const key of AGING_BUCKET_KEYS) {
      totals[key] += Number(party[key] ?? 0);
    }
    grand += Number(party.total ?? party.balance ?? 0);
  }

  return { buckets: totals, total: grand };
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatExportDate(value) {
  if (!value) return "";
  try {
    return format(parseISO(String(value).slice(0, 10)), "yyyy-MM-dd");
  } catch {
    return String(value).slice(0, 10);
  }
}

function formatExportAmount(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

/**
 * Excel-compatible CSV export (UTF-8 BOM) with summary + detail sections.
 */
export function downloadAgingReportCsv({
  filename,
  reportTitle,
  companyName,
  asOf,
  currency,
  parties,
  lineKey,
  getPartyName,
  getPartyCode,
  getDocumentNumber,
  getDocumentDate,
  getDueDate,
  getReference,
}) {
  const active = filterActiveParties(parties, lineKey);
  const { buckets, total } = sumBucketTotals(active);
  const rows = [];

  rows.push([reportTitle]);
  rows.push([`Company: ${companyName || ""}`]);
  rows.push([`As of: ${formatExportDate(asOf)}`]);
  rows.push([`Currency: ${currency || ""}`]);
  rows.push([]);
  rows.push(["AGING SUMMARY"]);
  rows.push([
    "Name",
    "Code",
    ...AGING_BUCKET_KEYS.map((k) => AGING_BUCKET_EXPORT_LABELS[k]),
    "Total",
  ]);

  for (const party of active) {
    rows.push([
      getPartyName(party),
      getPartyCode(party) || "",
      ...AGING_BUCKET_KEYS.map((k) => formatExportAmount(party[k])),
      formatExportAmount(party.total ?? party.balance),
    ]);
  }

  rows.push([
    "REPORT TOTAL",
    "",
    ...AGING_BUCKET_KEYS.map((k) => formatExportAmount(buckets[k])),
    formatExportAmount(total),
  ]);

  rows.push([]);
  rows.push(["DETAIL"]);
  rows.push([
    "Name",
    "Code",
    "Document #",
    "Date",
    "Due Date",
    "Reference",
    "Amount Due",
    "Days Overdue",
    "Bucket",
  ]);

  for (const party of active) {
    const name = getPartyName(party);
    const code = getPartyCode(party) || "";
    const lines = filterOpenLines(party[lineKey]);

    for (const line of lines) {
      rows.push([
        name,
        code,
        getDocumentNumber(line),
        formatExportDate(getDocumentDate(line)),
        formatExportDate(getDueDate(line)),
        getReference(line) || "",
        formatExportAmount(lineOpenBalance(line)),
        line.age_days ?? line.days_late ?? "",
        line.aging_label || AGING_BUCKET_LABELS[line.bucket] || line.bucket || "",
      ]);
    }
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
