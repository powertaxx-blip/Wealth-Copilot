import type { EstimatorInput, EstimatorResult, FilingStatus } from "@/lib/tax";

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
  result: EstimatorResult;
};

export type ExplainResponse = {
  summary: string;
  tips: string[];
};

const ALLOWED_STATUSES: FilingStatus[] = ["single", "mfj", "mfs", "hoh"];
const MAX_TIPS = 4;
const MAX_SUMMARY_CHARS = 600;
const MAX_TIP_CHARS = 160;

export class InputValidationError extends Error {}
export class OutputValidationError extends Error {}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function assertFiniteInRange(name: string, v: unknown): number {
  if (!isFiniteNumber(v)) {
    throw new InputValidationError(`"${name}" must be a finite number`);
  }
  if (Math.abs(v) > 50_000_000) {
    throw new InputValidationError(`"${name}" is outside the allowed range`);
  }
  return v;
}

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
    "paTax",
    "localEIT",
    "lst",
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

  return { status, kids, result: result as unknown as EstimatorResult };
}
function stripUnsafeMarkup(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export function sanitizeExplainResponse(raw: unknown): ExplainResponse {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new OutputValidationError("Model response was not valid JSON");
    }
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new OutputValidationError("Model response must be a JSON object");
  }
  const body = parsed as Record<string, unknown>;

  if (typeof body.summary !== "string" || body.summary.trim().length === 0) {
    throw new OutputValidationError('Model response missing a non-empty "summary" string');
  }
  if (!Array.isArray(body.tips) || !body.tips.every((t) => typeof t === "string")) {
    throw new OutputValidationError('Model response missing a "tips" array of strings');
  }

  const summary = truncate(stripUnsafeMarkup(body.summary), MAX_SUMMARY_CHARS);
  const tips = (body.tips as string[])
    .slice(0, MAX_TIPS)
    .map((t) => truncate(stripUnsafeMarkup(t), MAX_TIP_CHARS))
    .filter((t) => t.length > 0);

  return { summary, tips };
}
