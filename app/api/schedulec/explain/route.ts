import { NextResponse } from "next/server";
import { checkAIRateLimit, rateLimitMessage } from "@/lib/ai/rateLimit";
import { sanitizeExplainScheduleCRequest, ScheduleCInputValidationError } from "@/lib/ai/scheduleCSchema";
import { OutputValidationError } from "@/lib/ai/schema";
import { explainScheduleC } from "@/lib/ai/explainScheduleC";
import { AIProviderError } from "@/lib/ai/explainEstimate";

/**
 * Schedule C's counterpart to app/api/estimate/explain/route.ts — same
 * shape (parse → sanitize → call the model → return), same status codes,
 * same "never leak the raw error" posture. Kept as its own route instead
 * of a `?kind=schedulec` query param on the existing one so each route's
 * request/response contract stays simple and independently testable.
 */
export async function POST(req: Request) {
  // Checked before anything else — every request that gets past this
  // point can cost an Anthropic API call. See lib/ai/rateLimit.ts.
  const limit = await checkAIRateLimit(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(limit) },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let sanitized;
  try {
    sanitized = sanitizeExplainScheduleCRequest(body);
  } catch (err) {
    if (err instanceof ScheduleCInputValidationError) {
      return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
    }
    return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
  }

  try {
    const explanation = await explainScheduleC(sanitized);
    return NextResponse.json(explanation, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError || err instanceof OutputValidationError) {
      console.error("[/api/schedulec/explain] AI layer failed:", err.message);
      return NextResponse.json({ error: "AI insight is temporarily unavailable." }, { status: 502 });
    }
    console.error("[/api/schedulec/explain] unexpected error:", err);
    return NextResponse.json({ error: "AI insight is temporarily unavailable." }, { status: 502 });
  }
}
