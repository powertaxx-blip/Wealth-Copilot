/**
 * Mileage Tracker — new to this build, with no equivalent in the original
 * single-file prototype (see MIGRATION.md). Designed fresh in the same
 * list/CRUD shape Business Expenses and Debt Payoff Planner already use:
 * log one trip at a time, total the miles, then hand that total straight
 * to Schedule C's own "Business miles driven" field — the same
 * cross-panel pattern Business Expenses already uses to push category
 * totals into Schedule C. See lib/scheduleC.ts's file header for why
 * that's a localStorage merge instead of shared React state (these are
 * separate routes, not simultaneously mounted).
 *
 * Nonprofit Mode (lib/orgType.ts) adds a per-trip rate type: a
 * nonprofit's own staff still drive on the clock and get reimbursed at
 * the regular business rate, but *volunteers* driving on the
 * organization's behalf deduct their own mileage on their personal
 * return at the separate, much lower charitable rate — 14¢/mile, fixed
 * by statute (IRC §170(i)) rather than adjusted for inflation like the
 * business rate is every year. Every trip always carries a `rateType`
 * (defaulting to "business") so nothing about a for-profit user's trips
 * changes; the selector to switch a trip to "charitable" only appears in
 * Nonprofit Mode.
 */

export type MileageRateType = "business" | "charitable";

export type Trip = { id: string; date: string; purpose: string; miles: number; rateType: MileageRateType };

/** This panel's own saved trip log. */
export const MILEAGE_STORAGE_KEY = "wc.mileage";

/** IRS standard mileage rate, 2025 — the same default Schedule C already
 * uses for its own mileRate field, so the two panels agree unless someone
 * deliberately changes Schedule C's rate by hand afterward. */
export const IRS_MILEAGE_RATE_2025 = 0.7;

/** IRS charitable/volunteer mileage rate — set by statute, not the IRS,
 * so it doesn't move with inflation the way the business rate does. It
 * has held at 14¢/mile since 1998. */
export const CHARITABLE_MILEAGE_RATE = 0.14;

export type MileageTotals = {
  totalMiles: number;
  deduction: number;
  businessMiles: number;
  businessDeduction: number;
  charitableMiles: number;
  charitableDeduction: number;
};

/**
 * `nonprofit` gates whether a trip's `rateType` is honored at all — a
 * for-profit user's trips always use the business rate regardless of
 * what's stored in `rateType`, so toggling Nonprofit Mode off never
 * silently changes a for-profit total.
 */
export function calcMileageDeduction(trips: Trip[], nonprofit: boolean = false): MileageTotals {
  let businessMiles = 0;
  let charitableMiles = 0;
  for (const t of trips) {
    if (nonprofit && t.rateType === "charitable") {
      charitableMiles += t.miles;
    } else {
      businessMiles += t.miles;
    }
  }
  const businessDeduction = businessMiles * IRS_MILEAGE_RATE_2025;
  const charitableDeduction = charitableMiles * CHARITABLE_MILEAGE_RATE;
  return {
    totalMiles: businessMiles + charitableMiles,
    deduction: businessDeduction + charitableDeduction,
    businessMiles,
    businessDeduction,
    charitableMiles,
    charitableDeduction,
  };
}
