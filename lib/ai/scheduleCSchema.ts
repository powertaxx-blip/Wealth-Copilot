import { SC_EXPENSE_LINES } from "@/lib/scheduleC";

/**
 * Input/output boundary for the Schedule C "Explain These Numbers" AI
 * feature — same discipline as lib/ai/schema.ts (the Tax Estimator's
 * original), deliberately kept as its own file instead of extending that
 * one: Schedule C's shape (gross receipts, expense categories, net
 * profit) has nothing in common with EstimatorResult (filing status,
 * federal/state tax, credits), so a shared type would mean every field
 * optional on both sides — worse safety, not better reuse. What IS
 * reused is the transport layer: callAnthropicWithRetry (network/retry
 * logic) and sanitizeExplainResponse (output validation) are both
 * imported from the Tax Estimator's files unchanged, since those two
 * pieces genuinely don't care which panel is asking.
 *
 * No free-text field from the form (business name, profession) is ever
 * part of this request — only numbers, plus expense-category labels
 * pulled from SC_EXPENSE_LINES, a fixed developer-defined list the user
 * can never type into. That keeps the same guarantee the Tax Estimator's
 * schema already makes: there is no user-authored string anywhere in the
 * prompt for a prompt-injection attempt to hide inside.
 */
export type ExplainScheduleCRequest = {
  netReceipts: number;
  totalExpenses: number;
  netProfit: number;
  carExpense: number;
  miles: number;
  topCategories: { label: string; amount: number }[];
};

const RESULT_BOUNDS = 50_000_000; // $50M — generous, but not unbounded (matches lib/ai/schema.ts)
const MAX_CATEGORIES = 5;
const ALLOWED_CATEGORY_LABELS: ReadonlySet<string> = new Set([
  "Car & truck expenses (mileage)",
  ...SC_EXPENSE_LINES.map((l) => l.label),
]);

export class ScheduleCInputValidationError extends Error {}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function assertFiniteInRange(name: string, v: unknown): number {
  if (!isFiniteNumber(v)) {
    throw new ScheduleCInputValidationError(`"${name}" must be a finite number`);
  }
  if (Math.abs(v) > RESULT_BOUNDS) {
    throw new ScheduleCInputValidationError(`"${name}" is outside the allowed range`);
  }
  return v;
}

/** Same posture as sanitizeExplainRequest in lib/ai/schema.ts: throws on
 * anything malformed rather than trying to coerce it, so the API route can
 * turn that straight into a 400 instead of guessing what the caller meant. */
export function sanitizeExplainScheduleCRequest(raw: unknown): ExplainScheduleCRequest {
  if (typeof raw !== "object" || raw === null) {
    throw new ScheduleCInputValidationError("Request body must be an object");
  }
  const body = raw as Record<string, unknown>;

  const netReceipts = assertFiniteInRange("netReceipts", body.netReceipts);
  const totalExpenses = assertFiniteInRange("totalExpenses", body.totalExpenses);
  const netProfit = assertFiniteInRange("netProfit", body.netProfit);
  const carExpense = assertFiniteInRange("carExpense", body.carExpense);
  const miles = assertFiniteInRange("miles", body.miles);

  if (!Array.isArray(body.topCategories)) {
    throw new ScheduleCInputValidationError('"topCategories" must be an array');
  }
  if (body.topCategories.length > MAX_CATEGORIES) {
    throw new ScheduleCInputValidationError(`"topCategories" must contain at most ${MAX_CATEGORIES} items`);
  }
  const topCategories = body.topCategories.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ScheduleCInputValidationError(`"topCategories[${i}]" must be an object`);
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.label !== "string" || !ALLOWED_CATEGORY_LABELS.has(e.label)) {
      throw new ScheduleCInputValidationError(`"topCategories[${i}].label" is not a recognized expense category`);
    }
    return { label: e.label, amount: assertFiniteInRange(`topCategories[${i}].amount`, e.amount) };
  });

  return { netReceipts, totalExpenses, netProfit, carExpense, miles, topCategories };
}
