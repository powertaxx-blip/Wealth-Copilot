import { fmt } from "@/lib/format";
import { sanitizeExplainResponse, type ExplainResponse } from "./schema";
import { callAnthropicWithRetry } from "./explainEstimate";
import type { ExplainScheduleCRequest } from "./scheduleCSchema";

/**
 * =========================================================================
 * AI INTEGRATION — Schedule C "Explain These Numbers"
 * =========================================================================
 * Second AI feature in the app, built to close the gap between Tax
 * Estimator (which has both a Term Dictionary and an AI Insight panel)
 * and Schedule C (which had neither, despite being at least as
 * jargon-dense — net profit, Schedule SE, fifteen expense categories).
 *
 * Deliberately NOT a branch inside explainEstimate.ts's existing prompt:
 * Schedule C has its own vocabulary (gross receipts, expense categories,
 * net profit/loss) that has nothing to do with filing status or federal
 * tax brackets, so a shared prompt would mean vaguer instructions for
 * both. What genuinely IS shared, and imported unchanged rather than
 * copy-pasted: callAnthropicWithRetry (the network/retry logic) and
 * sanitizeExplainResponse (the {summary, tips} output validation) — both
 * are already 100% generic, they just take a prompt string in and
 * validated JSON out.
 */

const SYSTEM_PROMPT = `You explain an already-completed Schedule C (Profit or Loss From Business) calculation to a small-business owner who is a first-time filer. You do not calculate anything yourself and you never invent a number that was not given to you.

Rules, in order of importance:
1. Use ONLY the numbers provided in the user message. Never introduce a dollar figure or expense category that was not given to you — and never bring in outside tax facts either: no tax rates, the IRS standard mileage rate, thresholds, or limits unless that exact figure appears in the user message. In particular, you may say that net profit flows to Schedule SE for self-employment tax, but never state the self-employment tax rate or how it is calculated (no 15.3%, no 92.35%), and never cite reporting thresholds like the $600 1099 rule.
2. Never recommend changing business structure (like switching to an S-corp), suggest a specific new deduction to claim, or estimate what the person will owe in tax — those are decisions for the person and their preparer, or numbers that belong on the Tax Estimator, not a one-paragraph note here.
3. Write for someone who has never filed a Schedule C before: plain English, no unexplained jargon.
4. Respond with ONLY a single JSON object shaped exactly like this, no markdown fences, no commentary before or after it:
{"summary": "2-3 sentence plain-English summary of what these numbers mean", "tips": ["short actionable tip", "short actionable tip"]}
5. "tips" must contain at most 4 items, each one short sentence of no more than 140 characters (anything longer gets cut off mid-sentence), grounded strictly in the numbers given (e.g. naming the single largest expense category, or noting that this net profit is what flows to Schedule SE for self-employment tax) — not generic small-business advice.
6. If you cannot produce a safe, grounded response, return {"summary": "", "tips": []} exactly.`;

function buildUserPrompt(req: ExplainScheduleCRequest): string {
  const categoryLines =
    req.topCategories.length > 0
      ? req.topCategories.map((c) => `- ${c.label}: ${fmt(c.amount)}`).join("\n")
      : "(no individual expense category has anything logged yet)";
  return `Gross income (Line 7, after returns & allowances): ${fmt(req.netReceipts)}
Total expenses (Line 28): ${fmt(req.totalExpenses)}
Net profit or (loss) (Line 31): ${fmt(req.netProfit)}
Car & truck expenses (mileage): ${fmt(req.carExpense)} (${req.miles.toLocaleString()} miles)
Largest expense categories logged so far:
${categoryLines}`;
}

/** Top-level entry point: sanitized request in, sanitized response out —
 * same two-boundary shape as explainEstimate() in lib/ai/explainEstimate.ts. */
export async function explainScheduleC(
  req: ExplainScheduleCRequest,
  opts: Parameters<typeof callAnthropicWithRetry>[1] = {}
): Promise<ExplainResponse> {
  const userPrompt = buildUserPrompt(req);
  const rawText = await callAnthropicWithRetry(userPrompt, { ...opts, systemPrompt: SYSTEM_PROMPT });
  return sanitizeExplainResponse(rawText, userPrompt);
}
