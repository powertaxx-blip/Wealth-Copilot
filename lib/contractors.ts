/**
 * 1099 Contractor Tracker — who you paid as an independent contractor,
 * whether you have their W-9, and which of them need a Form 1099-NEC.
 * Pairs with Schedule C's "Contract labor" line and with Employees &
 * Payroll (a W-2 employee is a different thing entirely — payroll taxes
 * apply; a contractor gets a 1099-NEC instead).
 *
 * Who needs a 1099-NEC (IRS rules, simplified):
 *   - paid at or above the year's threshold for services, AND
 *   - not paid entirely by card or a payment app (card networks and
 *     apps like PayPal report those payments on Form 1099-K instead), AND
 *   - not a corporation — except attorneys, who get a 1099 even when
 *     incorporated.
 * Threshold: $600 for payments made through 2025; the One Big Beautiful
 * Bill Act (2025) raised it to $2,000 for payments made in 2026 onward,
 * adjusted for inflation after 2026 — later years fall back to $2,000
 * with a note to check the IRS figure.
 *
 * Due January 31 of the following year, to both the IRS and the
 * contractor (the next business day if that's a weekend).
 */

export const CONTRACTORS_STORAGE_KEY = "wc.contractors";

export type Contractor = {
  id: string;
  name: string;
  amountPaid: number; // total paid for services in the tax year
  w9OnFile: boolean;
  paidByCardOrApp: boolean; // all payments by card / payment app (reported on 1099-K instead)
  isCorporation: boolean;
  isAttorney: boolean;
};

export type ContractorsState = {
  taxYear: number;
  contractors: Contractor[];
};

export function defaultContractorsState(now: Date = new Date()): ContractorsState {
  return { taxYear: now.getFullYear(), contractors: [] };
}
export const DEFAULT_CONTRACTORS_STATE: ContractorsState = defaultContractorsState();

/**
 * The 1099-NEC filing threshold for payments made in `taxYear`.
 *
 * Source: the One Big Beautiful Bill Act (signed July 4, 2025) raised the
 * threshold from $600 to $2,000 for payments made after December 31, 2025,
 * with inflation adjustments starting after 2026. So:
 *   - payments made in 2025 or earlier → $600 (the long-standing rule)
 *   - payments made in 2026            → $2,000
 *   - 2027 onward                      → $2,000 until the IRS publishes the
 *     inflation-adjusted figure, with a note telling the user to check it
 * The threshold is chosen by the tax year the user selects on the page.
 */
export function nec1099Threshold(taxYear: number): { amount: number; note: string | null } {
  if (taxYear <= 2025) return { amount: 600, note: null };
  if (taxYear === 2026) return { amount: 2000, note: null };
  return {
    amount: 2000,
    note: `The $2,000 threshold is adjusted for inflation after 2026 — check the IRS instructions for Form 1099-NEC for the ${taxYear} figure.`,
  };
}

export type ContractorStatus =
  | { needs1099: true; reason: string; missingW9: boolean }
  | { needs1099: false; reason: string };

export function contractorStatus(c: Contractor, threshold: number): ContractorStatus {
  if (c.amountPaid < threshold) return { needs1099: false, reason: "Paid under the threshold" };
  if (c.paidByCardOrApp) return { needs1099: false, reason: "Paid by card or payment app (reported on a 1099-K instead)" };
  if (c.isCorporation && !c.isAttorney) return { needs1099: false, reason: "Corporation (not an attorney)" };
  return {
    needs1099: true,
    reason: c.isCorporation ? "Attorney — needs a 1099 even though incorporated" : "Paid at or above the threshold",
    missingW9: !c.w9OnFile,
  };
}

/** Jan 31 of the year after `taxYear`, moved to Monday if it's a weekend
 * (UTC calendar date, same convention as lib/form990.ts). */
export function nec1099DueDate(taxYear: number): number {
  const jan31 = Date.UTC(taxYear + 1, 0, 31);
  const dow = new Date(jan31).getUTCDay();
  return jan31 + (dow === 6 ? 2 : dow === 0 ? 1 : 0) * 86_400_000;
}

export type ContractorTotals = {
  count: number;
  totalPaid: number;
  needing1099: number;
  missingW9: number; // among those needing a 1099
};

export function calcContractorTotals(state: ContractorsState): ContractorTotals {
  const { amount } = nec1099Threshold(state.taxYear);
  let totalPaid = 0;
  let needing1099 = 0;
  let missingW9 = 0;
  for (const c of state.contractors) {
    totalPaid += Math.max(0, c.amountPaid);
    const s = contractorStatus(c, amount);
    if (s.needs1099) {
      needing1099++;
      if (s.missingW9) missingW9++;
    }
  }
  return { count: state.contractors.length, totalPaid, needing1099, missingW9 };
}

/** Skips malformed saved entries (same posture as lib/creditHealth.ts). */
export function validContractors(list: unknown): Contractor[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (c): c is Contractor =>
      typeof c === "object" &&
      c !== null &&
      typeof c.id === "string" &&
      typeof c.name === "string" &&
      typeof c.amountPaid === "number" &&
      Number.isFinite(c.amountPaid)
  ).map((c) => ({
    ...c,
    w9OnFile: Boolean(c.w9OnFile),
    paidByCardOrApp: Boolean(c.paidByCardOrApp),
    isCorporation: Boolean(c.isCorporation),
    isAttorney: Boolean(c.isAttorney),
  }));
}
