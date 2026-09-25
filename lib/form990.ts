/**
 * 990 Compliance — which Form 990 a tax-exempt organization files, when
 * it's due, and how much time is left. Rules (IRS):
 *   - Gross receipts normally <= $50,000 → Form 990-N (e-Postcard)
 *   - Gross receipts < $200,000 AND total assets < $500,000 → 990-EZ
 *     (a full 990 is allowed instead)
 *   - Otherwise → the full Form 990
 *   - Due the 15th day of the 5th month after the fiscal year ends.
 *     Form 8868 extends that by 6 months — for the 990 and 990-EZ only;
 *     there is no extension for the 990-N.
 * Private foundations (990-PF) and churches (generally not required to
 * file) are outside this simple test — the panel says so in its fine
 * print rather than trying to model them.
 *
 * All date math is done on calendar dates in UTC (Date.UTC), never on
 * local timestamps, so a daylight-saving change can't knock the day
 * count off by one.
 */

export const FORM_990_STORAGE_KEY = "wc.form990";

export type Form990Input = {
  grossReceipts: number;
  totalAssets: number;
  fiscalYearEnd: string; // "YYYY-MM-DD" from the date picker; "" until entered
};

export const DEFAULT_FORM_990: Form990Input = {
  grossReceipts: 0,
  totalAssets: 0,
  fiscalYearEnd: "",
};

export type Form990Kind = "990-N" | "990-EZ" | "990";

export const FORM_990_LABELS: Record<Form990Kind, string> = {
  "990-N": "990-N (e-Postcard)",
  "990-EZ": "990-EZ (or full 990, optional)",
  "990": "Full Form 990",
};

export const FORM_990_EXPLANATIONS: Record<Form990Kind, string> = {
  "990-N":
    "With gross receipts of $50,000 or less, you file the 990-N — a short online notice (the \"e-Postcard\") that just confirms your organization's basic details. It's filed electronically on the IRS website; there's no paper version.",
  "990-EZ":
    "With gross receipts under $200,000 and total assets under $500,000, you can file the shorter 990-EZ. You're allowed to file the full Form 990 instead if you'd rather.",
  "990":
    "Your gross receipts are $200,000 or more, or your total assets are $500,000 or more, so the full Form 990 is required.",
};

export function requiredForm990(grossReceipts: number, totalAssets: number): Form990Kind {
  const receipts = Math.max(0, grossReceipts);
  const assets = Math.max(0, totalAssets);
  if (receipts <= 50_000) return "990-N";
  if (receipts < 200_000 && assets < 500_000) return "990-EZ";
  return "990";
}

/** "YYYY-MM-DD" → UTC midnight timestamp, or null if it isn't a real
 * calendar date (so "2026-02-30" is rejected, not rolled into March). */
export function parseISODate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const t = Date.UTC(y, mo, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo || back.getUTCDate() !== d) return null;
  return t;
}

/** The 15th day of the `monthsAfter`-th month after the fiscal year end. */
function fifteenthOfMonthAfter(fyEnd: number, monthsAfter: number): number {
  const d = new Date(fyEnd);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsAfter, 15);
}

/** Today's local calendar date as a UTC midnight timestamp. */
export function todayUTC(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

const DAY_MS = 86_400_000;

export function formatDate(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/** When a due date lands on a weekend, the IRS accepts it the next
 * business day. (Federal holidays shift it too; not modeled here.) */
function nextBusinessDay(t: number): number | null {
  const dow = new Date(t).getUTCDay();
  if (dow === 6) return t + 2 * DAY_MS;
  if (dow === 0) return t + DAY_MS;
  return null;
}

export type DeadlineTone = "good" | "warning" | "critical";

export type Form990Result = {
  form: Form990Kind;
  formLabel: string;
  explanation: string;
  deadline:
    | { status: "noDate" }
    | { status: "invalidDate" }
    | {
        status: "upcoming";
        due: number;
        daysRemaining: number;
        label: string;
        tone: DeadlineTone;
        weekendShift: number | null; // the Monday it moves to, if due on a weekend
      }
    | {
        status: "passed";
        due: number;
        daysPast: number;
        // Form 8868's extended due date (5 + 6 = the 11th month), and days
        // left until it — null for the 990-N, which can't be extended.
        extendedDue: number | null;
        extendedDaysRemaining: number | null;
      };
};

/** Under 30 days: approaching. 30 through 90: on track. Over 90: plenty. */
export function deadlineBand(daysRemaining: number): { label: string; tone: DeadlineTone } {
  if (daysRemaining < 30) return { label: "Deadline approaching - file soon", tone: "warning" };
  if (daysRemaining <= 90) return { label: "On track", tone: "good" };
  return { label: "Plenty of time", tone: "good" };
}

export function calcForm990(input: Form990Input, today: number = todayUTC()): Form990Result {
  const form = requiredForm990(input.grossReceipts, input.totalAssets);
  const base = { form, formLabel: FORM_990_LABELS[form], explanation: FORM_990_EXPLANATIONS[form] };

  if (!input.fiscalYearEnd.trim()) return { ...base, deadline: { status: "noDate" } };
  const fyEnd = parseISODate(input.fiscalYearEnd);
  if (fyEnd === null) return { ...base, deadline: { status: "invalidDate" } };

  const due = fifteenthOfMonthAfter(fyEnd, 5);
  const weekendShift = nextBusinessDay(due);
  let daysRemaining = Math.round((due - today) / DAY_MS);
  // Due on a weekend and today is that weekend: past the 15th, but the
  // IRS still accepts it through Monday — "0 days, file now", not "missed".
  if (daysRemaining < 0 && weekendShift !== null && today <= weekendShift) daysRemaining = 0;

  if (daysRemaining < 0) {
    const extendedDue = form === "990-N" ? null : fifteenthOfMonthAfter(fyEnd, 11);
    const extendedDaysRemaining = extendedDue === null ? null : Math.round((extendedDue - today) / DAY_MS);
    return {
      ...base,
      deadline: { status: "passed", due, daysPast: -daysRemaining, extendedDue, extendedDaysRemaining },
    };
  }

  const band = deadlineBand(daysRemaining);
  return {
    ...base,
    deadline: { status: "upcoming", due, daysRemaining, label: band.label, tone: band.tone, weekendShift },
  };
}
