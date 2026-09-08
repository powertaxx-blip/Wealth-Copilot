import { fmt } from "@/lib/format";
import { sanitizeExplainResponse, type ExplainRequest, type ExplainResponse } from "./schema";

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
  const { status, kids, result: r } = req;
  const statusLabel = { single: "Single", mfj: "Married Filing Jointly", mfs: "Married Filing Separately", hoh: "Head of Household" }[status];
  return `Filing status: ${statusLabel}
Qualifying children: ${kids}
Adjusted Gross Income: ${fmt(r.agi)}
Standard/Itemized Deduction: ${fmt(r.deduction)}
QBI Deduction: ${fmt(r.qbiDeduction)}
Federal Taxable Income: ${fmt(r.taxableIncome)}
Federal Tax After Child Tax Credit: ${fmt(r.federalAfterCredits)}
Self-Employment Tax: ${fmt(r.seTax)}
PA State Tax: ${fmt(r.paTax)}
Local Tax + Local Services Tax: ${fmt(r.localEIT + r.lst)}
Earned Income Tax Credit: ${fmt(r.eitc)}
${r.isRefund ? "Estimated Refund" : "Estimated Total Tax Owed"}: ${fmt(Math.abs(r.netTax))}
Effective Tax Rate: ${r.effectiveRate.toFixed(1)}%
Estimated Take-Home: ${fmt(r.takeHome)}
${r.quarterlyPayment > 0 ? `Quarterly Estimated Payment: ${fmt(r.quarterlyPayment)} due Apr 15 / Jun 15 / Sep 15 / Jan 15` : "No quarterly payments owed."}`;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529]);

export type FetchLike = typeof fetch;

/**
 * Retry logic: exponential backoff with jitter, capped at maxAttempts.
 * Only retries on statuses that mean "try again later" (rate limit,
 * server-side/overload errors) or on a network-level failure (fetch
 * itself throwing). A 400/401/403 means something is wrong with the
 * request or credentials — retrying won't fix that, so those fail fast
 * instead of burning three attempts on a guaranteed-to-fail call.
 */
export async function callAnthropicWithRetry(
  userPrompt: string,
  opts: { fetchImpl?: FetchLike; maxAttempts?: number; baseDelayMs?: number; apiKey?: string } = {}
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 400;
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AIProviderError("AI insight is not configured (missing ANTHROPIC_API_KEY)");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
    } catch (networkErr) {
      // fetch() itself threw — a real network failure (DNS, timeout,
      // connection reset). Always retryable: nothing about the request
      // was rejected, the request never arrived at all.
      lastError = networkErr;
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt, baseDelayMs));
        continue;
      }
      break;
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.content?.[0]?.text;
      if (typeof text !== "string") {
        // The provider responded successfully but not in the shape this
        // code expects. Not a transient failure — retrying the identical
        // request would produce the identical shape — so fail immediately.
        throw new AIProviderError("Unexpected response shape from AI provider");
      }
      return text;
    }

    if (RETRYABLE_STATUS.has(res.status)) {
      lastError = new AIProviderError(`AI provider returned ${res.status}`);
      if (attempt < maxAttempts) {
        await sleep(backoffDelay(attempt, baseDelayMs));
        continue;
      }
      break;
    }

    // Non-retryable status (400 bad request, 401/403 bad credentials,
    // 404, etc.) — retrying an identical request would fail identically,
    // so fail fast instead of burning the remaining attempts. Never
    // surface the raw response body: it could contain provider-internal
    // detail (or in a misconfigured deployment, an error message that
    // echoes the request) that shouldn't reach a client.
    throw new AIProviderError(`AI provider rejected the request (status ${res.status})`);
  }

  throw new AIProviderError(
    `AI provider unavailable after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function backoffDelay(attempt: number, baseDelayMs: number): number {
  const exp = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * baseDelayMs;
  return exp + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Top-level entry point: sanitized request in, sanitized response out.
 * Everything between those two boundaries (prompt construction, the
 * network call, retries) is this file's job; everything on either side
 * of the boundary is schema.ts's job. Neither file trusts the other's
 * input without checking it.
 */
export async function explainEstimate(req: ExplainRequest, opts: Parameters<typeof callAnthropicWithRetry>[1] = {}): Promise<ExplainResponse> {
  const userPrompt = buildUserPrompt(req);
  const rawText = await callAnthropicWithRetry(userPrompt, opts);
  return sanitizeExplainResponse(rawText);
}
