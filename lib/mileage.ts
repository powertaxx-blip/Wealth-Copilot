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
 */

export type Trip = { id: string; date: string; purpose: string; miles: number };

/** This panel's own saved trip log. */
export const MILEAGE_STORAGE_KEY = "wc.mileage";

/** IRS standard mileage rate, 2025 — the same default Schedule C already
 * uses for its own mileRate field, so the two panels agree unless someone
 * deliberately changes Schedule C's rate by hand afterward. */
export const IRS_MILEAGE_RATE_2025 = 0.7;

export type MileageTotals = { totalMiles: number; deduction: number };

export function calcMileageDeduction(trips: Trip[], rate: number = IRS_MILEAGE_RATE_2025): MileageTotals {
  const totalMiles = trips.reduce((s, t) => s + t.miles, 0);
  return { totalMiles, deduction: totalMiles * rate };
}
