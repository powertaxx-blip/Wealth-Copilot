import { NextResponse } from "next/server";
import { sanitizeGrantDraftRequest, GrantDraftInputValidationError } from "@/lib/ai/grantDraftSchema";
import { OutputValidationError } from "@/lib/ai/schema";
import { draftGrantSection } from "@/lib/ai/draftGrantSection";
import { AIProviderError } from "@/lib/ai/explainEstimate";

/**
 * Grant Writing's counterpart to app/api/estimate/explain/route.ts and
 * app/api/schedulec/explain/route.ts — same shape (parse → sanitize →
 * call the model → return), same status codes, same "never leak the raw
 * error" posture.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  let sanitized;
  try {
    sanitized = sanitizeGrantDraftRequest(body);
  } catch (err) {
    if (err instanceof GrantDraftInputValidationError) {
      return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
    }
    return NextResponse.json({ error: "Request data was invalid." }, { status: 400 });
  }

  try {
    const draft = await draftGrantSection(sanitized);
    return NextResponse.json(draft, { status: 200 });
  } catch (err) {
    if (err instanceof AIProviderError || err instanceof OutputValidationError) {
      console.error("[/api/grants/draft] AI layer failed:", err.message);
      return NextResponse.json({ error: "AI drafting is temporarily unavailable." }, { status: 502 });
    }
    console.error("[/api/grants/draft] unexpected error:", err);
    return NextResponse.json({ error: "AI drafting is temporarily unavailable." }, { status: 502 });
  }
}
