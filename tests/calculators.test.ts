import { describe, it, expect } from "vitest";
import { calcDonorRetention } from "@/lib/donorRetention";
import { calcFinancialHealth, daysCashBand, reserveBand, worseTone } from "@/lib/financialHealth";
import { calcForm990, requiredForm990, parseISODate } from "@/lib/form990";
import { estimateTax, type EstimatorInput } from "@/lib/tax";

describe("Donor Retention", () => {
  const rate = (last: number, ret: number) => calcDonorRetention({ donorsLastYear: last, returningDonors: ret, newDonors: 0 });
  const label = (last: number, ret: number) => {
    const r = rate(last, ret);
    return r.status === "ok" ? r.label : r.status;
  };

  it("computes returning / last year x 100", () => {
    const r = rate(200, 86);
    expect(r.status === "ok" && r.ratePct).toBe(43);
  });

  it("bands at the 40% and 45% edges, both inclusive in 'at'", () => {
    expect(label(1000, 399)).toBe("Below sector average");
    expect(label(100, 40)).toBe("At sector average");
    expect(label(100, 45)).toBe("At sector average");
    expect(label(10000, 4504)).toBe("At sector average"); // 45.04 displays as 45.0
    expect(label(1000, 451)).toBe("Above sector average");
  });

  it("new donors never change the rate", () => {
    const a = calcDonorRetention({ donorsLastYear: 100, returningDonors: 50, newDonors: 0 });
    const b = calcDonorRetention({ donorsLastYear: 100, returningDonors: 50, newDonors: 500 });
    expect(a.status === "ok" && b.status === "ok" && a.ratePct === b.ratePct).toBe(true);
  });

  it("handles empty and impossible input", () => {
    expect(rate(0, 0).status).toBe("empty");
    expect(rate(100, 120).status).toBe("invalid");
  });
});

describe("Financial Health", () => {
  const calc = (cash: number, annualExpenses: number, reserveFunds = 0, reserveSameAsCash = false) =>
    calcFinancialHealth({ cash, annualExpenses, reserveFunds, reserveSameAsCash });

  it("computes days cash and reserve months", () => {
    const r = calc(60000, 365000, 150000);
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.daysCash).toBe(60);
      expect(r.reserveMonths).toBe(4.9);
    }
  });

  it("bands days cash: <30 critical, 30-89 tight, 90+ strong (on the rounded value)", () => {
    expect(daysCashBand(29).tone).toBe("critical");
    expect(daysCashBand(30).label).toBe("Workable, but tight");
    expect(daysCashBand(89).label).toBe("Workable, but tight");
    expect(daysCashBand(90).label).toBe("Strong cash position");
    const r = calc(89600, 365000); // 89.6 days rounds to 90
    expect(r.status === "ok" && r.daysLabel).toBe("Strong cash position");
  });

  it("bands reserve: <3 below, 3-6 healthy, >6 strong", () => {
    expect(reserveBand(2.9).label).toBe("Below recommended reserve");
    expect(reserveBand(3).label).toBe("Healthy reserve range");
    expect(reserveBand(6).label).toBe("Healthy reserve range");
    expect(reserveBand(6.1).label).toBe("Strong reserve position");
  });

  it("uses cash as the reserve when asked, ignoring the reserve field", () => {
    const r = calc(120000, 365000, 999999, true);
    expect(r.status === "ok" && r.reserveUsed).toBe(120000);
  });

  it("needs annual expenses", () => {
    expect(calc(50000, 0).status).toBe("empty");
  });

  it("worseTone picks the more urgent", () => {
    expect(worseTone("good", "critical")).toBe("critical");
    expect(worseTone("warning", "good")).toBe("warning");
  });
});

describe("990 Compliance", () => {
  const today = Date.UTC(2026, 8, 25); // Fri Sep 25, 2026
  const deadline = (fy: string, receipts = 100000, t = today) =>
    calcForm990({ grossReceipts: receipts, totalAssets: 0, fiscalYearEnd: fy }, t).deadline;

  it("picks the right form at each threshold", () => {
    expect(requiredForm990(50000, 900000)).toBe("990-N");
    expect(requiredForm990(50001, 0)).toBe("990-EZ");
    expect(requiredForm990(199999, 499999)).toBe("990-EZ");
    expect(requiredForm990(199999, 500000)).toBe("990");
    expect(requiredForm990(200000, 0)).toBe("990");
  });

  it("is due the 15th day of the 5th month after year end, rolling into the next year", () => {
    const d = deadline("2026-09-30");
    expect(d.status === "upcoming" && d.due).toBe(Date.UTC(2027, 1, 15));
  });

  it("bands days remaining at 29/30 and 90/91", () => {
    const due = Date.UTC(2026, 11, 15);
    const label = (days: number) => {
      const d = deadline("2026-07-31", 100000, due - days * 86_400_000);
      return d.status === "upcoming" ? d.label : d.status;
    };
    expect(label(29)).toBe("Deadline approaching - file soon");
    expect(label(30)).toBe("On track");
    expect(label(90)).toBe("On track");
    expect(label(91)).toBe("Plenty of time");
  });

  it("reports a passed deadline instead of a negative count, with the 8868 date except for the 990-N", () => {
    const d = deadline("2025-12-31");
    expect(d.status).toBe("passed");
    if (d.status === "passed") {
      expect(d.daysPast).toBe(133);
      expect(d.extendedDue).toBe(Date.UTC(2026, 10, 15));
    }
    const n = deadline("2025-12-31", 20000);
    expect(n.status === "passed" && n.extendedDue).toBe(null);
  });

  it("doesn't call a weekend due date missed until the next business day passes", () => {
    // FY 2026-12-31 -> due Sat May 15, 2027; accepted through Mon May 17
    expect(deadline("2026-12-31", 100000, Date.UTC(2027, 4, 16)).status).toBe("upcoming");
    expect(deadline("2026-12-31", 100000, Date.UTC(2027, 4, 17)).status).toBe("upcoming");
    expect(deadline("2026-12-31", 100000, Date.UTC(2027, 4, 18)).status).toBe("passed");
  });

  it("rejects dates that don't exist", () => {
    expect(parseISODate("2026-02-30")).toBe(null);
    expect(parseISODate("12/31/2025")).toBe(null);
    expect(deadline("").status).toBe("noDate");
  });
});

describe("Tax Estimator (smoke tests)", () => {
  const base: EstimatorInput = {
    status: "single",
    kids: 0,
    wages: 0,
    seProfit: 0,
    other: 0,
    itemized: 0,
    state: "PA",
    localRatePct: 0,
    localFlatFee: 0,
  };

  it("owes no federal income tax on zero income", () => {
    expect(estimateTax(base).federalTax).toBe(0);
  });

  it("charges more federal tax on more wages", () => {
    expect(estimateTax({ ...base, wages: 90000 }).federalTax).toBeGreaterThan(estimateTax({ ...base, wages: 60000 }).federalTax);
  });

  it("adds self-employment tax only on self-employment profit", () => {
    expect(estimateTax({ ...base, wages: 60000 }).seTax).toBe(0);
    expect(estimateTax({ ...base, seProfit: 60000 }).seTax).toBeGreaterThan(0);
  });

  it("never produces NaN", () => {
    const r = estimateTax({ ...base, wages: 75000, seProfit: 20000, kids: 2, status: "mfj" });
    for (const [k, v] of Object.entries(r)) if (typeof v === "number") expect(Number.isNaN(v), k).toBe(false);
  });
});
