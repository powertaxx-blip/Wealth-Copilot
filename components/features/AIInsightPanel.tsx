"use client";

import { useState } from "react";
import type { EstimatorInput, EstimatorResult } from "@/lib/tax";
import type { USState } from "@/lib/stateTax";

type AIState = "idle" | "loading" | "success" | "error";

type ExplainResponse = { summary: string; tips: string[] };

/**
 * The user-facing half of the AI integration. All it does is POST the
 * already-computed numbers to /api/estimate/explain and render whatever
 * comes back — every trust decision (is this input safe to send? is this
 * output safe to render?) already happened server-side in lib/ai/schema.ts.
 * This component's only real job is to fail *visibly but calmly*: no
 * blank screen, no raw error text, no crash — just a plain-English
 * fallback message so the person always has something readable, even
 * when the AI layer itself is down or unconfigured.
 */
export function AIInsightPanel({
  status,
  kids,
  usState,
  result,
}: {
  status: EstimatorInput["status"];
  kids: number;
  usState: USState;
  result: EstimatorResult;
}) {
  const [state, setState] = useState<AIState>("idle");
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/estimate/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, kids, state: usState, result }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || typeof body.summary !== "string") {
        setErrorMsg(
          (body && typeof body.error === "string" && body.error) ||
            "AI insight is temporarily unavailable — the numbers above are still fully calculated and correct."
        );
        setState("error");
        return;
      }
      setData(body as ExplainResponse);
      setState("success");
    } catch {
      setErrorMsg("Couldn't reach the AI insight service — the numbers above are still fully calculated and correct.");
      setState("error");
    }
  }
