"use client";

import { useState } from "react";
import type { ScheduleCResult } from "@/lib/scheduleC";

type AIState = "idle" | "loading" | "success" | "error";

type ExplainResponse = { summary: string; tips: string[] };

/**
 * Schedule C's counterpart to AIInsightPanel.tsx (Tax Estimator's AI
 * panel) — same visual design and state machine on purpose, so switching
 * between the two panels feels like the same feature, not two different
 * ones. The only real difference is what gets POSTed: this one strips the
 * result down to numbers plus up to 5 non-zero expense categories (their
 * labels pulled straight from the fixed SC_EXPENSE_LINES list, never from
 * the free-text business name/profession fields), the same "no
 * user-authored string reaches the prompt" boundary lib/ai/scheduleCSchema.ts
 * enforces again server-side.
 */
export function ScheduleCInsightPanel({ result, miles }: { result: ScheduleCResult; miles: number }) {
  const [state, setState] = useState<AIState>("idle");
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setErrorMsg(null);
    try {
      const topCategories = result.lineItems
        .filter((li) => li.val > 0 && li.label !== "Car & truck expenses (mileage)")
        .sort((a, b) => b.val - a.val)
        .slice(0, 5)
        .map((li) => ({ label: li.label, amount: li.val }));
      // Every label above comes straight from result.lineItems, which is
      // built from the fixed SC_EXPENSE_LINES list (lib/scheduleC.ts) plus
      // the one hardcoded "Car & truck expenses (mileage)" string — never
      // from the form's free-text business name/profession fields. The
      // server independently re-checks each label against that same
      // allowlist (lib/ai/scheduleCSchema.ts), so this isn't the only
      // guard, just the first one.

      const res = await fetch("/api/schedulec/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          netReceipts: result.netReceipts,
          totalExpenses: result.totalExpenses,
          netProfit: result.netProfit,
          carExpense: result.carExpense,
          miles,
          topCategories,
        }),
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
            // Fixed --brand-surface/--gold pairing, not --navy — see the
            // same comment in AIInsightPanel.tsx for why.
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
          Get a short, plain-English summary of what your net profit and biggest expenses mean — generated from
          exactly the figures shown above, nothing else.
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
