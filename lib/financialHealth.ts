/**
 * Financial Health — Days Cash on Hand and the Operating Reserve Ratio,
 * side by side. Two different questions about the same cushion:
 *   - Days Cash on Hand: if money stopped coming in today, how many days
 *     could the organization keep paying its bills from cash alone?
 *   - Operating Reserve Ratio: how many months of operating expenses do
 *     the funds deliberately set aside as a reserve cover?
 * Cash can look healthy while the reserve is thin (a grant just landed
 * and will be spent), and a reserve can look healthy while cash is tight
 * (it's parked somewhere slow to reach) — which is why they're read
 * together.
 *
 * Deliberately separate from Emergency Fund / Operating Reserve
 * (/emergency): that panel tracks progress toward a savings target in
 * monthly-expense terms; this one benchmarks where things stand against
 * a year's operating expenses.
 */

export const FINANCIAL_HEALTH_STORAGE_KEY = "wc.financialHealth";

export type FinancialHealthInput = {
  cash: number;
  annualExpenses: number;
  reserveFunds: number;
  reserveSameAsCash: boolean;
};

export const DEFAULT_FINANCIAL_HEALTH: FinancialHealthInput = {
  cash: 0,
  annualExpenses: 0,
  reserveFunds: 0,
  reserveSameAsCash: false,
};

export type Tone = "good" | "warning" | "critical";

export type FinancialHealthResult =
  | { status: "empty" } // no annual operating expenses yet — nothing to divide by
  | {
      status: "ok";
      dailyExpenses: number;
      daysCash: number; // rounded to a whole day — the same value displayed and banded
      daysLabel: string;
      daysTone: Tone;
      reserveUsed: number; // reserveFunds, or cash when reserveSameAsCash
      reserveMonths: number; // rounded to 1 decimal — the same value displayed and banded
      reserveLabel: string;
      reserveTone: Tone;
    };

/** Bands: under 30 days critical, 30 up to (not including) 90 tight,
 * 90 and over strong — "90+" in the spec claims 90 itself. */
export function daysCashBand(days: number): { label: string; tone: Tone } {
  if (days < 30) return { label: "Critical - build a cash cushion", tone: "critical" };
  if (days < 90) return { label: "Workable, but tight", tone: "warning" };
  return { label: "Strong cash position", tone: "good" };
}

/** Bands: under 3 months below, 3 through 6 healthy, above 6 strong. */
export function reserveBand(months: number): { label: string; tone: Tone } {
  if (months < 3) return { label: "Below recommended reserve", tone: "warning" };
  if (months <= 6) return { label: "Healthy reserve range", tone: "good" };
  return { label: "Strong reserve position", tone: "good" };
}

export function calcFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  const cash = Math.max(0, input.cash);
  const annualExpenses = Math.max(0, input.annualExpenses);
  if (annualExpenses <= 0) return { status: "empty" };

  const dailyExpenses = annualExpenses / 365;
  // Rounded before banding, so a displayed "90 days" can never be
  // labeled "tight" because the raw value was 89.6.
  const daysCash = Math.round(cash / dailyExpenses);
  const reserveUsed = input.reserveSameAsCash ? cash : Math.max(0, input.reserveFunds);
  const reserveMonths = Math.round((reserveUsed / annualExpenses) * 12 * 10) / 10;

  const d = daysCashBand(daysCash);
  const r = reserveBand(reserveMonths);
  return {
    status: "ok",
    dailyExpenses,
    daysCash,
    daysLabel: d.label,
    daysTone: d.tone,
    reserveUsed,
    reserveMonths,
    reserveLabel: r.label,
    reserveTone: r.tone,
  };
}

/** The more urgent of two tones — for a single status on a summary tile. */
export function worseTone(a: Tone, b: Tone): Tone {
  const rank: Record<Tone, number> = { critical: 0, warning: 1, good: 2 };
  return rank[a] <= rank[b] ? a : b;
}
