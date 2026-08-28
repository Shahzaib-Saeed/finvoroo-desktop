/**
 * Numeric COA ordering for reports — 10000 before 10001 (not lexicographic).
 */

export function compareAccountCodes(codeA, codeB) {
  const a = String(codeA ?? "").trim();
  const b = String(codeB ?? "").trim();

  const numA = Number(a);
  const numB = Number(b);
  const aNumeric = a !== "" && Number.isFinite(numA);
  const bNumeric = b !== "" && Number.isFinite(numB);

  if (aNumeric && bNumeric && numA !== numB) {
    return numA - numB;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortRowsByAccountCode(rows, codeKey = "code") {
  if (!Array.isArray(rows) || rows.length < 2) {
    return rows ?? [];
  }

  return [...rows].sort((left, right) =>
    compareAccountCodes(left?.[codeKey], right?.[codeKey]),
  );
}

export function sortAccountGroups(groups, codeKey = "code") {
  if (!Array.isArray(groups) || groups.length < 2) {
    return groups ?? [];
  }

  return [...groups].sort((left, right) =>
    compareAccountCodes(left?.[codeKey], right?.[codeKey]),
  );
}

/** Order account ids by their chart codes (requires a code lookup map). */
export function sortIdsByAccountCode(ids, codeById) {
  if (!Array.isArray(ids) || ids.length < 2) {
    return ids ?? [];
  }

  return [...ids].sort((left, right) =>
    compareAccountCodes(
      codeById?.get(Number(left)),
      codeById?.get(Number(right)),
    ),
  );
}
