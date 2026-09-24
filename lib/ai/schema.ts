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
function stripUnsafeMarkup(s: string): string {
  // Defense in depth: React already escapes text content, but this feature's
  // output could plausibly be reused somewhere that isn't React one day
  // (an email, a PDF, a raw API consumer) — so tags and script-ish protocol
  // strings are stripped at the source, not left for a future renderer to
  // get right.
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/**
 * Every dollar amount and percentage in a string, normalized so "$8,000,"
 * and "$8000" compare equal ("$8000", "12.8%"). Bare numbers (7,000 miles,
 * Form 1040) aren't figures in this sense and are ignored — unless
 * `bareNumbers` is set, which the Grant Writing draft uses: there, an
 * invented "serves 500 families" or "founded in 2009" is exactly the kind
 * of made-up fact to catch, so every number counts ("#500", "#2009").
 */
function extractFigures(s: string, bareNumbers = false): string[] {
  const dollars = (s.match(/\$\s?\d[\d,]*(?:\.\d+)?/g) ?? []).map(
    (m) => "$" + Number(m.replace(/[$,\s]/g, "").replace(/\.$/, ""))
  );
  const percents = (s.match(/\d+(?:\.\d+)?\s?%/g) ?? []).map((m) => Number(m.replace(/[%\s]/g, "")) + "%");
  const numbers = bareNumbers
    ? (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((m) => "#" + Number(m.replace(/,/g, "").replace(/\.$/, "")))
    : [];
  return [...dollars, ...percents, ...numbers];
}

/**
 * Grounding check. The prompt forbids outside figures (a state's tax rate,
 * the SE tax rate, the $600 1099 threshold), but in testing the model still
 * slipped one in now and then — so it's enforced here too: any tip, or any
 * summary sentence, containing a dollar amount or percentage that isn't in
 * the prompt the model was actually sent is dropped rather than shown.
 */
function ungroundedFigures(text: string, allowed: ReadonlySet<string>, bareNumbers: boolean): string[] {
  return extractFigures(text, bareNumbers).filter((f) => !allowed.has(f));
}

/** Per-caller limits. The defaults are the Tax Estimator / Schedule C
 * explain panels' original caps; Grant Writing passes a much larger
 * summary cap (a proposal section is several paragraphs, not 2-3
 * sentences) and turns on bare-number grounding. */
export type SanitizeOptions = {
  maxSummaryChars?: number;
  maxTips?: number;
  groundBareNumbers?: boolean;
};

/**
 * Output sanitization. The model is instructed (see buildPrompt) to return
 * only JSON matching ExplainResponse — but "instructed to" is not the same
 * as "guaranteed to," so nothing from the model reaches the UI without
 * passing through here first: a strict shape check, then per-field
 * cleanup (strip markup, enforce length caps, cap tip count).
 */
export function sanitizeExplainResponse(raw: unknown, groundingPrompt?: string, opts: SanitizeOptions = {}): ExplainResponse {
  const maxSummaryChars = opts.maxSummaryChars ?? MAX_SUMMARY_CHARS;
  const maxTips = opts.maxTips ?? MAX_TIPS;
  const bareNumbers = opts.groundBareNumbers ?? false;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    // The prompt forbids markdown fences, but models still sometimes wrap
    // the JSON in ```json ... ``` — unwrap that one shape before parsing.
    const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    try {
      parsed = JSON.parse(fenced ? fenced[1] : raw);
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

  let rawSummary = body.summary;
  let rawTips = body.tips as string[];
  if (groundingPrompt !== undefined) {
    const allowed = new Set(extractFigures(groundingPrompt, bareNumbers));
    const dropped: string[] = [];
    const keep = (text: string) => {
      const bad = ungroundedFigures(text, allowed, bareNumbers);
      dropped.push(...bad);
      return bad.length === 0;
    };
    // Sentence by sentence within each paragraph, so a multi-paragraph
    // summary (a Grant Writing draft) keeps its paragraph breaks.
    rawSummary = rawSummary
      .split(/\n\s*\n/)
      .map((para) => para.split(/(?<=[.!?])\s+/).filter(keep).join(" "))
      .filter((para) => para.trim().length > 0)
      .join("\n\n");
    rawTips = rawTips.filter(keep);
    if (dropped.length > 0) {
      console.warn("[sanitizeExplainResponse] dropped text with ungrounded figures:", dropped.join(", "));
    }
    if (rawSummary.trim().length === 0) {
      throw new OutputValidationError("Model summary contained only ungrounded figures");
    }
  }

  const summary = truncate(stripUnsafeMarkup(rawSummary), maxSummaryChars);
  const tips = rawTips
    .slice(0, maxTips)
    .map((t) => truncate(stripUnsafeMarkup(t), MAX_TIP_CHARS))
    .filter((t) => t.length > 0);

  return { summary, tips };
}
