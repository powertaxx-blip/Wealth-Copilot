import type { EstimatorInput, EstimatorResult, FilingStatus } from "@/lib/tax";
import { US_STATES, type USState } from "@/lib/stateTax";

/**
 * The AI layer never receives the raw form (no name, no SSN, no address —
 * none of that exists in EstimatorInput/EstimatorResult anyway) — it only
 * receives the same numbers already shown on screen, plus filing status
 * and number of kids for context. That's a deliberate boundary: the model
 * explains a calculation that already happened, it doesn't perform the
 * calculation and it never sees anything beyond what's already rendered
 * in the UI.
 */
export type ExplainRequest = {
  status: FilingStatus;
  kids: number;
  state: USState;
  result: EstimatorResult;
};

export type ExplainResponse = {
  summary: string;
  tips: string[];
};

const ALLOWED_STATUSES: FilingStatus[] = ["single", "mfj", "mfs", "hoh"];
const ALLOWED_STATES: ReadonlySet<string> = new Set(US_STATES.map((s) => s.value));
const MAX_TIPS = 4;
const MAX_SUMMARY_CHARS = 600;
const MAX_TIP_CHARS = 160;

export class InputValidationError extends Error {}
export class OutputValidationError extends Error {}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Every numeric field in EstimatorResult, clamped to a sane range. A
 * malformed or absurd value (NaN, Infinity, a 500-digit number someone
 * tried to smuggle through the API body) is rejected outright rather than
 * silently passed into a prompt string — the model should never see a
 * value that couldn't have come from a real tax calculation. */
const RESULT_BOUNDS = 50_000_000; // $50M — generous, but not unbounded

function assertFiniteInRange(name: string, v: unknown): number {
  if (!isFiniteNumber(v)) {
    throw new InputValidationError(`"${name}" must be a finite number`);
  }
  if (Math.abs(v) > RESULT_BOUNDS) {
    throw new InputValidationError(`"${name}" is outside the allowed range`);
  }
  return v;
}

/**
 * Input sanitization. Runs before a single character reaches the prompt.
 * Throws InputValidationError on anything malformed instead of trying to
 * "fix" its way past bad data — the caller (the API route) turns this into
 * a 400, not a best-effort guess.
 */
export function sanitizeExplainRequest(raw: unknown): ExplainRequest {
  if (typeof raw !== "object" || raw === null) {
    throw new InputValidationError("Request body must be an object");
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status as FilingStatus)) {
    throw new InputValidationError("\"status\" must be one of: " + ALLOWED_STATUSES.join(", "));
  }
  const status = body.status as FilingStatus;

  if (!isFiniteNumber(body.kids) || body.kids < 0 || body.kids > 10) {
    throw new InputValidationError("\"kids\" must be a number between 0 and 10");
  }
  const kids = Math.round(body.kids as number);

  if (typeof body.state !== "string" || !ALLOWED_STATES.has(body.state)) {
    throw new InputValidationError('"state" must be a valid two-letter US state (or DC) code');
  }
  const state = body.state as USState;

  if (typeof body.result !== "object" || body.result === null) {
    throw new InputValidationError("\"result\" must be an object");
  }
  const r = body.result as Record<string, unknown>;

  const numericFields = [
    "agi",
    "deduction",
    "qbiDeduction",
    "taxableIncome",
    "federalTax",
    "ctc",
    "federalAfterCredits",
    "seTax",
    "stateTax",
    "localEIT",
    "localFlatFee",
    "eitc",
    "netTax",
    "totalIncome",
    "effectiveRate",
    "takeHome",
    "quarterlyPayment",
  ] as const;

  const result: Record<string, unknown> = {};
  for (const field of numericFields) {
    result[field] = assertFiniteInRange(field, r[field]);
  }
  if (typeof r.isRefund !== "boolean") {
    throw new InputValidationError("\"result.isRefund\" must be a boolean");
  }
  result.isRefund = r.isRefund;

  return { status, kids, state, result: result as unknown as EstimatorResult };
}
