import { NextResponse } from "next/server";
import { checkAIRateLimit, rateLimitMessage } from "@/lib/ai/rateLimit";
import { sanitizeExplainRequest, InputValidationError, OutputValidationError } from "@/lib/ai/schema";
import { explainEstimate, AIProviderError } from "@/lib/ai/explainEstimate";

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
    sanitized = sanitizeExplainRequest(body);
  } catch (err) {
    if (err instanceof InputValidationError) {
      return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
    }
    return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
  }

  try {
    const explanation = await explainEstimate(sanitized);
    return NextResponse.json(explanation, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError || err instanceof OutputValidationError) {
      console.error("[/api/estimate/explain] AI layer failed:", err.message);
      return NextResponse.json({ error: "AI insight is temporarily unavailable." }, { status: 502 });
    }
    console.error("[/api/estimate/explain] unexpected error:", err);
    return NextResponse.json({ error: "AI insight is temporarily unavailable." }, { status: 502 });
  }
}
