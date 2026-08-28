import { describe, expect, it } from "vitest";
import {
  compareAccountCodes,
  sortAccountGroups,
  sortIdsByAccountCode,
  sortRowsByAccountCode,
} from "./report-account-sort";

describe("report-account-sort", () => {
  it("orders numeric account codes ascending", () => {
    expect(compareAccountCodes("10000", "10001")).toBeLessThan(0);
    expect(compareAccountCodes("10001", "10010")).toBeLessThan(0);
    expect(compareAccountCodes("10010", "10002")).toBeGreaterThan(0);
  });

  it("sorts rows by code", () => {
    const rows = [
      { code: "10100", name: "Bank" },
      { code: "10000", name: "Cash" },
      { code: "10001", name: "Petty cash" },
    ];

    expect(sortRowsByAccountCode(rows).map((row) => row.code)).toEqual([
      "10000",
      "10001",
      "10100",
    ]);
  });

  it("sorts grouped accounts by code", () => {
    const groups = sortAccountGroups([
      { code: "20001", entries: [] },
      { code: "20000", entries: [] },
      { code: "10000", entries: [] },
    ]);

    expect(groups.map((group) => group.code)).toEqual([
      "10000",
      "20000",
      "20001",
    ]);
  it("sorts ids by account code using lookup map", () => {
    const codeById = new Map([
      [1, "10100"],
      [2, "10000"],
      [3, "10001"],
    ]);

    expect(sortIdsByAccountCode([1, 2, 3], codeById)).toEqual([2, 3, 1]);
  });
});
