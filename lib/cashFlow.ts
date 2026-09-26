/**
 * Cash-Flow Forecast — month by month for the next 12 months: starting
 * cash, a regular monthly income and expense baseline, plus one-time
 * items in specific months (a grant payment landing in March, an annual
 * insurance bill in June). Shows the running balance and flags the
 * lowest point and any month that dips below zero.
 *
 * Bridges two panels the app already has: the monthly baseline can be
 * pulled from Budgeting (which is entered per month), and the starting
 * cash from Financial Health's "cash on hand". Both are copied in on
 * request, never linked live — this panel owns its own numbers.
 */

export const CASH_FLOW_STORAGE_KEY = "wc.cashFlow";
export const FORECAST_MONTHS = 12;

export type OneTimeItem = {
  id: string;
  monthOffset: number; // 0 = the forecast's first month
  label: string;
  amount: number; // positive
  direction: "in" | "out";
};

export type CashFlowInput = {
  startMonth: string; // "YYYY-MM"
  startingCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  items: OneTimeItem[];
};

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultCashFlow(now: Date = new Date()): CashFlowInput {
  return { startMonth: currentMonth(now), startingCash: 0, monthlyIncome: 0, monthlyExpenses: 0, items: [] };
}
export const DEFAULT_CASH_FLOW: CashFlowInput = defaultCashFlow();

/** "YYYY-MM" plus `offset` months → "Mar 2027". Invalid input falls back to offset labels. */
export function monthLabel(startMonth: string, offset: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(startMonth);
  if (!m) return `Month ${offset + 1}`;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + offset, 1));
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export type ForecastMonth = {
  offset: number;
  label: string;
  opening: number;
  income: number; // baseline + one-time in
  expenses: number; // baseline + one-time out
  oneTime: OneTimeItem[];
  closing: number;
};

export type ForecastResult = {
  months: ForecastMonth[];
  lowest: ForecastMonth;
  shortfallMonths: ForecastMonth[]; // closing below zero
  endingCash: number;
  totalIn: number;
  totalOut: number;
  tone: "good" | "warning" | "critical";
  headline: string;
};

export function buildForecast(input: CashFlowInput): ForecastResult {
  const income = Math.max(0, input.monthlyIncome);
  const expenses = Math.max(0, input.monthlyExpenses);
  const months: ForecastMonth[] = [];
  let balance = input.startingCash;
  let totalIn = 0;
  let totalOut = 0;
  for (let offset = 0; offset < FORECAST_MONTHS; offset++) {
    const oneTime = input.items.filter((i) => i.monthOffset === offset);
    const inflow = income + oneTime.filter((i) => i.direction === "in").reduce((s, i) => s + Math.max(0, i.amount), 0);
    const outflow = expenses + oneTime.filter((i) => i.direction === "out").reduce((s, i) => s + Math.max(0, i.amount), 0);
    const opening = balance;
    balance = opening + inflow - outflow;
    totalIn += inflow;
    totalOut += outflow;
    months.push({ offset, label: monthLabel(input.startMonth, offset), opening, income: inflow, expenses: outflow, oneTime, closing: balance });
  }
  const lowest = months.reduce((lo, m) => (m.closing < lo.closing ? m : lo), months[0]);
  const shortfallMonths = months.filter((m) => m.closing < 0);

  // Critical: the balance goes negative. Warning: the low point leaves
  // less than one month of the baseline expenses in the bank.
  let tone: ForecastResult["tone"] = "good";
  let headline = "Cash stays positive all year";
  if (shortfallMonths.length > 0) {
    tone = "critical";
    headline = `Shortfall starting ${shortfallMonths[0].label}`;
  } else if (expenses > 0 && lowest.closing < expenses) {
    tone = "warning";
    headline = `Tight in ${lowest.label} — under one month of expenses`;
  }
  return { months, lowest, shortfallMonths, endingCash: balance, totalIn, totalOut, tone, headline };
}

/** Skips malformed saved one-time items. */
export function validItems(items: unknown): OneTimeItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (i): i is OneTimeItem =>
      typeof i === "object" &&
      i !== null &&
      typeof i.id === "string" &&
      Number.isInteger(i.monthOffset) &&
      i.monthOffset >= 0 &&
      i.monthOffset < FORECAST_MONTHS &&
      typeof i.label === "string" &&
      typeof i.amount === "number" &&
      Number.isFinite(i.amount) &&
      (i.direction === "in" || i.direction === "out")
  );
}

// --- Pull-ins from other panels (client-only; read, never written) ---

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type BudgetState = {
  forProfitIncome?: number;
  nonprofitIncome?: number;
  forProfit?: Record<string, Record<string, number>>;
  nonprofit?: Record<string, Record<string, number>>;
};

/** Budgeting's monthly income and total planned monthly spending (every
 * category), for the current Nonprofit Mode. Null if nothing's entered. */
export function readBudgetBaseline(nonprofit: boolean): { income: number; expenses: number } | null {
  const b = readJSON<BudgetState>("wc.budgeting");
  if (!b) return null;
  const income = (nonprofit ? b.nonprofitIncome : b.forProfitIncome) ?? 0;
  const groups = (nonprofit ? b.nonprofit : b.forProfit) ?? {};
  let expenses = 0;
  for (const g of Object.values(groups)) for (const v of Object.values(g ?? {})) if (Number.isFinite(v)) expenses += v;
  return income > 0 || expenses > 0 ? { income, expenses } : null;
}

/** Financial Health's "cash on hand". Null if nothing's entered. */
export function readFinancialHealthCash(): number | null {
  const fh = readJSON<{ cash?: number }>("wc.financialHealth");
  return fh && typeof fh.cash === "number" && fh.cash > 0 ? fh.cash : null;
}
