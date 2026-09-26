import { describe, it, expect } from "vitest";
import { nec1099Threshold, nec1099DueDate, contractorStatus, calcContractorTotals, validContractors, type Contractor } from "@/lib/contractors";

const c = (patch: Partial<Contractor> = {}): Contractor => ({
  id: "x",
  name: "Test",
  amountPaid: 5000,
  w9OnFile: true,
  paidByCardOrApp: false,
  isCorporation: false,
  isAttorney: false,
  ...patch,
});

describe("1099 contractors", () => {
  it("uses $600 through 2025 and $2,000 from 2026, noting inflation adjustment after 2026", () => {
    expect(nec1099Threshold(2025).amount).toBe(600);
    expect(nec1099Threshold(2026)).toEqual({ amount: 2000, note: null });
    expect(nec1099Threshold(2027).note).toMatch(/inflation/);
  });

  it("requires a 1099 at or above the threshold only", () => {
    expect(contractorStatus(c({ amountPaid: 1999 }), 2000).needs1099).toBe(false);
    expect(contractorStatus(c({ amountPaid: 2000 }), 2000).needs1099).toBe(true);
  });

  it("skips card/app payments and corporations, but not incorporated attorneys", () => {
    expect(contractorStatus(c({ paidByCardOrApp: true }), 600).needs1099).toBe(false);
    expect(contractorStatus(c({ isCorporation: true }), 600).needs1099).toBe(false);
    expect(contractorStatus(c({ isCorporation: true, isAttorney: true }), 600).needs1099).toBe(true);
  });

  it("counts missing W-9s only among contractors who need a 1099", () => {
    const t = calcContractorTotals({
      taxYear: 2026,
      contractors: [c({ id: "a", w9OnFile: false }), c({ id: "b", w9OnFile: false, amountPaid: 100 }), c({ id: "c" })],
    });
    expect(t).toEqual({ count: 3, totalPaid: 10100, needing1099: 2, missingW9: 1 });
  });

  it("is due Jan 31, moved to Monday on a weekend", () => {
    expect(nec1099DueDate(2025)).toBe(Date.UTC(2026, 1, 2)); // Jan 31, 2026 is a Saturday
    expect(nec1099DueDate(2026)).toBe(Date.UTC(2027, 1, 1)); // Jan 31, 2027 is a Sunday
    expect(nec1099DueDate(2027)).toBe(Date.UTC(2028, 0, 31)); // Monday
  });

  it("skips malformed saved contractors", () => {
    expect(validContractors([c(), { id: 1 }, null, { ...c(), amountPaid: NaN }])).toHaveLength(1);
  });
});
