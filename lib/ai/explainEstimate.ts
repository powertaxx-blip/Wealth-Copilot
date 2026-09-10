import { fmt } from "@/lib/format";
import { sanitizeExplainResponse, type ExplainRequest, type ExplainResponse } from "./schema";
import { US_STATES } from "@/lib/stateTax";

/**
 * =========================================================================
 * AI INTEGRATION — Tax Estimator "Explain My Numbers"
 * =========================================================================
 * This is the one place in the app that calls out to a third-party AI
 * model. Everything upstream of this file (sanitizeExplainRequest) has
 * already validated the input; everything downstream (sanitizeExplainResponse)
 * validates the output before it's trusted. This file is only responsible
 * for the prompt itself and for calling the model reliably.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";

export class AIProviderError extends Error {}

/**
 * Prompt engineering choices, spelled out:
 *  - The system prompt is a closed instruction, not an open-ended
 *    "you are a helpful tax assistant" — it explicitly forbids inventing
 *    numbers, forbids recommending a filing-status change (that's a real
 *    decision with real consequences; a one-paragraph AI note shouldn't
 *    make it), and forbids any output shape except the exact JSON schema.
 *  - The user prompt never contains free-form user text. Every value
 *    inserted into it has already passed sanitizeExplainRequest(), so
 *    there is no user-authored string anywhere in this prompt for a
 *    prompt-injection attempt to hide inside — the only "user input" is
 *    numbers and a filing-status enum picked from a fixed list.
 *  - The model is told its exact audience (a first-time filer, plain
 *    English, no jargon without a one-line definition) to match the rest
 *    of the app's voice instead of defaulting to generic tax-advisor tone.
 */
const SYSTEM_PROMPT = `You explain a already-completed tax calculation to a small-business owner who is a first-time filer. You do not calculate tax yourself and you never invent a number that was not given to you.

Rules, in order of importance:
1. Use ONLY the numbers provided in the user message. Never introduce a dollar figure, percentage, or deadline that was not given to you.
2. Never recommend changing filing status, business structure, or withholding — those are decisions for the person and their preparer, not a one-paragraph note.
3. Write for someone who has never filed self-employment taxes before: plain English, no unexplained jargon.
4. Respond with ONLY a single JSON object shaped exactly like this, no markdown fences, no commentary before or after it:
{"summary": "2-3 sentence plain-English summary of what these numbers mean", "tips": ["short actionable tip", "short actionable tip"]}
5. "tips" must contain at most 4 items, each one short sentence, grounded strictly in the numbers given (e.g. pointing out a quarterly payment date that's coming up, or explaining why a credit applied) — not generic tax advice.
6. If you cannot produce a safe, grounded response, return {"summary": "", "tips": []} exactly.`;

function buildUserPrompt(req: ExplainRequest): string {
  const { status, kids, state, result: r } = req;
  const statusLabel = { single: "Single", mfj: "Married Filing Jointly", mfs: "Married Filing Separately", hoh: "Head of Household" }[status];
  const stateLabel = US_STATES.find((s) => s.value === state)?.label ?? state;
  return `Filing status: ${statusLabel}
Qualifying children: ${kids}
Adjusted Gross Income: ${fmt(r.agi)}
Standard/Itemized Deduction: ${fmt(r.deduction)}
QBI Deduction: ${fmt(r.qbiDeduction)}
Federal Taxable Income: ${fmt(r.taxableIncome)}
Federal Tax After Child Tax Credit: ${fmt(r.federalAfterCredits)}
Self-Employment Tax: ${fmt(r.seTax)}
${stateLabel} State Tax: ${fmt(r.stateTax)}
Local Tax + Local Flat Fee: ${fmt(r.localEIT + r.localFlatFee)}
Earned Income Tax Credit: ${fmt(r.eitc)}
${r.isRefund ? "Estimated Refund" : "Estimated Total Tax Owed"}: ${fmt(Math.abs(r.netTax))}
Effective Tax Rate: ${r.effectiveRate.toFixed(1)}%
Estimated Take-Home: ${fmt(r.takeHome)}
${r.quarterlyPayment > 0 ? `Quarterly Estimated Payment: ${fmt(r.quarterlyPayment)} due Apr 15 / Jun 15 / Sep 15 / Jan 15` : "No quarterly payments owed."}`;
}
