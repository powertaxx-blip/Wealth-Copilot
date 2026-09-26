import { describe, it, expect } from "vitest";
import { nec1099Threshold, nec1099DueDate, contractorStatus, calcContractorTotals, validContractors, type Contractor } from "@/lib/contractors";
import { buildDeadlines, nextEstimatedTaxDate, type DeadlineSources } from "@/lib/deadlines";
import type { Grant } from "@/lib/grants";
import { buildForecast, monthLabel, validItems, type CashFlowInput } from "@/lib/cashFlow";

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

describe("Upcoming deadlines", () => {
  const today = Date.UTC(2026, 8, 25); // Fri Sep 25, 2026
  const none: DeadlineSources = { estimator: null, form990: null, grants: [], contractors: null, hasEmployees: false };
  const grant = (patch: Partial<Grant>): Grant => ({
    id: "g",
    grantName: "Arts Fund",
    funderName: "Foundation",
    amountRequested: 0,
    amountAwarded: 0,
    applicationDeadline: "",
    decisionDate: "",
    status: "drafting",
    ...patch,
  });

  it("is empty when nothing has a date", () => {
    expect(buildDeadlines(none, today)).toEqual([]);
  });

  it("finds the next estimated-tax date, including the January one for the prior year", () => {
    expect(nextEstimatedTaxDate(today).due).toBe(Date.UTC(2027, 0, 15));
    expect(nextEstimatedTaxDate(Date.UTC(2026, 8, 15)).due).toBe(Date.UTC(2026, 8, 15));
    expect(nextEstimatedTaxDate(Date.UTC(2026, 0, 10)).label).toBe("4th-quarter 2025 payment");
  });

  it("lists in-progress grant deadlines only, soonest first, within the window", () => {
    const items = buildDeadlines(
      {
        ...none,
        grants: [
          grant({ id: "a", applicationDeadline: "2026-11-01" }),
          grant({ id: "b", applicationDeadline: "2026-10-05", status: "researching" }),
          grant({ id: "c", applicationDeadline: "2026-10-01", status: "submitted" }), // already submitted
          grant({ id: "d", applicationDeadline: "2026-09-01" }), // past
          grant({ id: "e", applicationDeadline: "March 1" }), // not a date
          grant({ id: "f", applicationDeadline: "2027-06-01" }), // beyond 120 days
        ],
      },
      today
    );
    expect(items.map((i) => i.id)).toEqual(["grant-b", "grant-a"]);
  });

  it("shows the 990 extended date after the regular deadline, and overdue once both have passed", () => {
    const ext = buildDeadlines({ ...none, form990: { grossReceipts: 100000, totalAssets: 0, fiscalYearEnd: "2025-12-31" } }, today);
    expect(ext[0].id).toBe("form990-extended");
    expect(ext[0].due).toBe(Date.UTC(2026, 10, 15));
    const late = buildDeadlines({ ...none, form990: { grossReceipts: 20000, totalAssets: 0, fiscalYearEnd: "2025-12-31" } }, today);
    expect(late[0].overdue).toBe(true); // 990-N: no extension
  });

  it("puts overdue items first", () => {
    const items = buildDeadlines(
      { ...none, form990: { grossReceipts: 20000, totalAssets: 0, fiscalYearEnd: "2025-12-31" }, grants: [grant({ applicationDeadline: "2026-10-01" })] },
      today
    );
    expect(items[0].overdue).toBe(true);
  });

  it("adds 1099-NEC and W-2 dates when they apply", () => {
    const soon = Date.UTC(2026, 11, 1); // Dec 1, 2026 — Jan 31 is inside the window
    const items = buildDeadlines(
      { ...none, contractors: { taxYear: 2026, contractors: [c({ w9OnFile: false })] }, hasEmployees: true },
      soon
    );
    const nec = items.find((i) => i.id === "1099-nec")!;
    expect(nec.due).toBe(Date.UTC(2027, 1, 1));
    expect(nec.detail).toMatch(/missing a W-9/);
    expect(items.find((i) => i.id === "w2")!.detail).toMatch(/2026 wages/);
  });
});

describe("Cash-flow forecast", () => {
  const base: CashFlowInput = { startMonth: "2026-10", startingCash: 10000, monthlyIncome: 5000, monthlyExpenses: 6000, items: [] };

  it("runs the balance forward 12 months", () => {
    const f = buildForecast(base);
    expect(f.months).toHaveLength(12);
    expect(f.months[0].closing).toBe(9000);
    expect(f.endingCash).toBe(-2000);
    expect(f.months[0].label).toBe("Oct 2026");
    expect(f.months[11].label).toBe("Sep 2027");
  });

  it("flags the first month below zero as a shortfall", () => {
    const f = buildForecast(base);
    expect(f.tone).toBe("critical");
    expect(f.shortfallMonths[0].label).toBe("Aug 2027"); // 10,000 - 1,000/month goes negative in month 11
    expect(f.lowest.closing).toBe(-2000);
  });

  it("applies one-time items in their month", () => {
    const f = buildForecast({ ...base, items: [{ id: "g", monthOffset: 2, label: "Grant", amount: 20000, direction: "in" }] });
    expect(f.months[2].income).toBe(25000);
    expect(f.tone).toBe("good");
  });

  it("warns when the low point is under one month of expenses", () => {
    const f = buildForecast({ ...base, startingCash: 2000, monthlyIncome: 6000, items: [{ id: "i", monthOffset: 5, label: "Insurance", amount: 1500, direction: "out" }] });
    expect(f.tone).toBe("warning");
    expect(f.lowest.offset).toBe(5);
  });

  it("labels months across a year boundary and survives a bad start month", () => {
    expect(monthLabel("2026-12", 1)).toBe("Jan 2027");
    expect(monthLabel("garbage", 0)).toBe("Month 1");
  });

  it("skips malformed or out-of-range saved items", () => {
    expect(validItems([{ id: "a", monthOffset: 0, label: "x", amount: 1, direction: "in" }, { id: "b", monthOffset: 12, label: "x", amount: 1, direction: "in" }, { id: "c", monthOffset: 0, label: "x", amount: 1, direction: "sideways" }])).toHaveLength(1);
  });
});
