/**
 * Schedule C — Profit or Loss From Business. Direct port of the vanilla-JS
 * SC_EXPENSE_LINES array and calcScheduleC() from the original prototype,
 * unchanged in value: same 15 IRS expense categories, same mileage-rate
 * math, same net-profit formula.
 *
 * Cross-panel bridge, ported from the prototype's `window.SCHEDULE_C_NET_PROFIT`
 * global: the original app was one page, so a plain JS global was enough to
 * pass a number from one tab to another. This app is real routes (each panel
 * is its own URL, possibly not mounted at the same time as the other), so
 * there's no shared React state to read directly. Instead, Schedule C writes
 * its computed net profit to a small dedicated localStorage key every time it
 * changes (SCHEDULE_C_NET_PROFIT_KEY, a plain number — not the full form,
 * which lives under its own key and only saves on the usual debounce), and
 * the Tax Estimator reads that one key on demand when the person clicks
 * "pull net profit in." A dedicated key (instead of recomputing from the
 * full saved form) keeps the Tax Estimator from needing to know anything
 * about Schedule C's internal shape, and avoids a race with the debounced
 * full-form save.
 */

export const SC_EXPENSE_LINES: { id: string; label: string }[] = [
  { id: "advertising", label: "Advertising" },
  { id: "commissions", label: "Commissions & fees" },
  { id: "contractlabor", label: "Contract labor" },
  { id: "insurance", label: "Insurance (other than health)" },
  { id: "legal", label: "Legal & professional services" },
  { id: "officeexp", label: "Office expense" },
  { id: "rent", label: "Rent (equipment/other business property)" },
  { id: "repairs", label: "Repairs & maintenance" },
  { id: "supplies", label: "Supplies" },
  { id: "taxeslicenses", label: "Taxes & licenses" },
  { id: "travel", label: "Travel" },
  { id: "meals", label: "Meals (50% deductible portion)" },
  { id: "utilities", label: "Utilities" },
  { id: "wages", label: "Wages paid to employees" },
  { id: "other", label: "Other expenses" },
];

export type ScheduleCInput = {
  businessName: string;
  profession: string;
  gross: number;
  returns: number;
  miles: number;
  mileRate: number;
  categoryAmounts: Record<string, number>;
};

export const INITIAL_SCHEDULE_C: ScheduleCInput = {
  businessName: "",
  profession: "",
  gross: 0,
  returns: 0,
  miles: 0,
  mileRate: 0.7,
  categoryAmounts: Object.fromEntries(SC_EXPENSE_LINES.map((l) => [l.id, 0])),
};

export type ScheduleCLineItem = { label: string; val: number };

export type ScheduleCResult = {
  netReceipts: number;
  carExpense: number;
  totalExpenses: number;
  netProfit: number;
  lineItems: ScheduleCLineItem[];
};

export function calcScheduleC(input: ScheduleCInput): ScheduleCResult {
  const netReceipts = input.gross - input.returns;
  const carExpense = input.miles * input.mileRate;

  const lineItems: ScheduleCLineItem[] = [{ label: "Car & truck expenses (mileage)", val: carExpense }];
  let totalExpenses = carExpense;
  for (const line of SC_EXPENSE_LINES) {
    const v = input.categoryAmounts[line.id] || 0;
    totalExpenses += v;
    lineItems.push({ label: line.label, val: v });
  }

  const netProfit = netReceipts - totalExpenses;
  return { netReceipts, carExpense, totalExpenses, netProfit, lineItems };
}
