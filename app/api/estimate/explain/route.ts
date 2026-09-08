import { NextResponse } from "next/server";
import { sanitizeExplainRequest, InputValidationError, OutputValidationError } from "@/lib/ai/schema";
import { explainEstimate, AIProviderError } from "@/lib/ai/explainEstimate";

export async function POST(req: Request) {
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
