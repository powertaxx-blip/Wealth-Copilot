"use client";

import { useState } from "react";
import type { EstimatorInput, EstimatorResult } from "@/lib/tax";

type AIState = "idle" | "loading" | "success" | "error";

type ExplainResponse = { summary: string; tips: string[] };

export function AIInsightPanel({ status, kids, result }: { status: EstimatorInput["status"]; kids: number; result: EstimatorResult }) {
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
        body: JSON.stringify({ status, kids, result }),
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
