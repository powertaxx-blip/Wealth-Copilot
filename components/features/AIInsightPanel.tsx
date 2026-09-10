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
  return (
    <div className="card mt-4" style={{ boxShadow: "none", border: "1px solid var(--gold)", background: "var(--line-soft)" }}>
      <div className="flex items-center justify-between gap-3" style={{ display: "flex" }}>
        <h3 className="mt-0 text-lg">AI Insight on These Numbers</h3>
        <button
          type="button"
          onClick={run}
          disabled={state === "loading"}
          className="rounded px-3 py-1.5 text-sm font-semibold"
          style={{
            // Fixed --brand-surface/--gold pairing, not --navy — --navy
            // inverts in dark mode and would have collapsed this button to
            // light-on-light. Same bug fixed across the nav and Mentor's
            // Note in the pre-deploy QA pass; see app/globals.css.
            background: "var(--brand-surface)",
            color: "var(--gold)",
            opacity: state === "loading" ? 0.6 : 1,
          }}
        >
          {state === "loading" ? "Thinking…" : state === "idle" ? "Explain These Numbers" : "Re-run"}
        </button>
      </div>

      {state === "idle" && (
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Get a short, plain-English summary of what these numbers mean and up to a few numbers-grounded tips —
          generated from exactly the figures shown above, nothing else.
        </p>
      )}

      {state === "loading" && (
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Reading your numbers…
        </p>
      )}

      {state === "error" && (
        <div className="note mt-2" style={{ borderLeftColor: "var(--status-warning)" }}>
          <b>Heads up:</b> {errorMsg}
        </div>
      )}

      {state === "success" && data && (
        <div className="mt-2">
          <p className="text-sm">{data.summary}</p>
          {data.tips.length > 0 && (
            <ul className="mt-2 text-sm" style={{ paddingLeft: "1.1em", listStyle: "disc" }}>
              {data.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {tip}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            AI-generated from your calculated numbers — always confirm specifics with a licensed tax professional
            before filing.
          </p>
        </div>
      )}
    </div>
  );
}
