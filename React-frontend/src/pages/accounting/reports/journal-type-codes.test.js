import { describe, expect, it } from "vitest";
import {
  formatJournalTypeCode,
  getJournalTypeMeta,
  getLedgerEntryTypeMeta,
} from "./journal-type-codes";

describe("journal-type-codes", () => {
  it("maps sales and purchase documents to SJ / PJ", () => {
    expect(formatJournalTypeCode("invoice")).toBe("SJ");
    expect(formatJournalTypeCode("credit_note")).toBe("SJ");
    expect(formatJournalTypeCode("bill")).toBe("PJ");
    expect(formatJournalTypeCode("vendor_credit")).toBe("PJ");
  });

  it("maps cash journals", () => {
    expect(formatJournalTypeCode("payment_received")).toBe("CRJ");
    expect(formatJournalTypeCode("bill_payment")).toBe("CDJ");
    expect(formatJournalTypeCode("deposit")).toBe("CRJ");
    expect(formatJournalTypeCode("withdrawal")).toBe("CDJ");
  });

  it("maps payroll, general, and inventory hints", () => {
    expect(formatJournalTypeCode("payroll")).toBe("PRJ");
    expect(formatJournalTypeCode("general")).toBe("GJ");
    expect(formatJournalTypeCode("adjustment")).toBe("GJ");
    expect(
      formatJournalTypeCode("adjustment", {
        reference: "ADJ-12",
      }),
    ).toBe("IJ");
    expect(
      getJournalTypeMeta("adjustment", {
        sourceKind: "inventory_gl_parity_round",
      }).code,
    ).toBe("IJ");
  });

  it("maps party ledger entry types", () => {
    expect(getLedgerEntryTypeMeta({ entry_type: "invoice" }, "ar").code).toBe(
      "SJ",
    );
    expect(getLedgerEntryTypeMeta({ entry_type: "payment" }, "ar").code).toBe(
      "CRJ",
    );
    expect(getLedgerEntryTypeMeta({ entry_type: "bill" }, "ap").code).toBe(
      "PJ",
    );
    expect(getLedgerEntryTypeMeta({ entry_type: "payment" }, "ap").code).toBe(
      "CDJ",
    );
  });
});
