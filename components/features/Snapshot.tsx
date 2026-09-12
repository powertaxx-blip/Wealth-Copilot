"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { readSnapshotData, type SnapshotData } from "@/lib/snapshot";

/**
 * Snapshot — new build (see lib/snapshot.ts header for the read-only
 * cross-panel pattern this uses, and MIGRATION.md for why this was
 * saved for last). One card per panel, showing whatever's already been
 * entered there — nothing here is editable; it all links back to the
 * real panel to change anything.
 *
 * Read on mount plus a manual Refresh button rather than a live
 * subscription: this page doesn't own any of the eleven keys it reads,
 * so there's no single `key` to watch the way useLocalStorageState
 * watches its own. A visitor coming from another tab, or back from
 * editing a panel via the browser's back button, just clicks Refresh —
 * simpler than wiring up eleven storage listeners for a page whose job
 * is a point-in-time rollup, not a live dashboard.
 */

function Tile({
  emoji,
  label,
  href,
  hasData,
  big,
  sub,
  tone,
}: {
  emoji: string;
  label: string;
  href: string;
  hasData: boolean;
  big?: string;
  sub?: string;
  tone?: "good" | "warning" | "critical";
}) {
  return (
    <div className="card flex flex-col gap-2" style={{ boxShadow: "none", borderStyle: hasData ? "solid" : "dashed" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
          {emoji} {label}
        </span>
        {tone && <StatusPill tone={tone}>{tone === "good" ? "On track" : tone === "warning" ? "Watch" : "Attention"}</StatusPill>}
      </div>
      {hasData ? (
        <>
          <div className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            {big}
          </div>
          {sub && (
            <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {sub}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Not started yet.
        </div>
      )}
      <Link href={href} className="mt-1 w-fit text-sm underline" style={{ color: "var(--navy-2)" }}>
        {hasData ? "Open panel →" : "Get started →"}
      </Link>
    </div>
  );
}

export function Snapshot() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [data, setData] = useState<SnapshotData | null>(null);

  function refresh() {
    setData(readSnapshotData(nonprofit));
  }

  // Re-reads whenever Nonprofit Mode changes too — several tiles below
  // read a genuinely different key (or a different formula on the same
  // key) depending on the mode, same as the panels they summarize.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonprofit]);

  if (!data) {
    return (
      <Card title="Snapshot" lede="Loading your numbers…">
        <div />
      </Card>
    );
  }

  return (
    <Card
      title="Snapshot"
      lede="One page pulling together whatever you've already entered across the rest of this app — nothing here is editable; every card links back to where the number actually lives."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              The Upanishads teach &quot;as is the microcosm, so is the macrocosm&quot; — this page is that idea
              turned into a dashboard: every small number entered somewhere else in this app adds up into the one
              picture of where the organization actually stands.
            </>
          ) : (
            <>
              Marvin Gaye asked &quot;what&apos;s going on&quot; on Break-Even; here&apos;s the answer for
              everything at once — one page, the whole picture, no digging through eleven tabs to see it.
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" className="btn ghost" onClick={refresh}>
          ↻ Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          emoji="💰"
          label="Budgeting"
          href="/budgeting"
          hasData={data.budgeting.hasData}
          big={fmt(data.budgeting.income)}
          sub={
            data.budgeting.hasData
              ? `${fmt(data.budgeting.keyMetricAmount)} in ${data.budgeting.keyMetricLabel} (guideline: ${data.budgeting.keyMetricGuidelinePct}% of income)`
              : undefined
          }
        />

        <Tile
          emoji={nonprofit ? "🏦" : "🛟"}
          label={nonprofit ? "Operating Reserve" : "Emergency Fund"}
          href="/emergency"
          hasData={data.reserve.hasData}
          big={`${data.reserve.percentFunded.toFixed(0)}% funded`}
          sub={data.reserve.hasData ? `${data.reserve.monthsCovered.toFixed(1)} months of expenses covered` : undefined}
          tone={data.reserve.hasData ? data.reserve.tone : undefined}
        />

        <Tile
          emoji="💹"
          label="Investment Fund"
          href="/investment"
          hasData={data.investments.hasData}
          big={fmt(data.investments.totalValue)}
          sub={
            data.investments.hasData
              ? `${data.investments.holdingCount} holding${data.investments.holdingCount === 1 ? "" : "s"}, ${
                  data.investments.totalGL >= 0 ? "+" : ""
                }${fmt(data.investments.totalGL)} gain/loss`
              : undefined
          }
        />

        <Tile
          emoji="📈"
          label="Break-Even & Pricing"
          href="/breakeven"
          hasData={data.breakeven.hasData}
          big={data.breakeven.unitsNeeded !== null ? `${Math.ceil(data.breakeven.unitsNeeded)} units` : "N/A"}
          sub={
            data.breakeven.hasData
              ? data.breakeven.unitsNeeded !== null
                ? `${fmt(data.breakeven.contributionMargin)} contribution margin per unit`
                : "Price isn't above variable cost yet — can't break even at these numbers"
              : undefined
          }
          tone={data.breakeven.hasData ? (data.breakeven.unitsNeeded !== null ? "good" : "critical") : undefined}
        />

        <Tile
          emoji="🧮"
          label="Tax Estimator"
          href="/estimator"
          hasData={data.estimator.hasData}
          big={data.estimator.isRefund ? `${fmt(Math.abs(data.estimator.netTax))} refund` : `${fmt(data.estimator.netTax)} owed`}
          sub={data.estimator.hasData ? `${data.estimator.effectiveRate.toFixed(1)}% effective tax rate` : undefined}
          tone={data.estimator.hasData ? (data.estimator.isRefund ? "good" : "warning") : undefined}
        />

        <Tile
          emoji="🚗"
          label="Mileage Tracker"
          href="/mileage"
          hasData={data.mileage.hasData}
          big={fmt(data.mileage.totalDeduction)}
          sub={data.mileage.hasData ? `${data.mileage.totalMiles.toLocaleString()} miles logged` : undefined}
        />

        <Tile
          emoji="💼"
          label="Business Expenses"
          href="/bizexpenses"
          hasData={data.bizExpenses.hasData}
          big={fmt(data.bizExpenses.totalExpenses)}
          sub={data.bizExpenses.hasData ? `${data.bizExpenses.count} expense${data.bizExpenses.count === 1 ? "" : "s"} logged` : undefined}
        />

        <Tile
          emoji="🧾"
          label="Schedule C"
          href="/schedulec"
          hasData={data.scheduleC.hasData}
          big={fmt(data.scheduleC.netProfit)}
          sub={data.scheduleC.hasData ? (data.scheduleC.netProfit >= 0 ? "Net profit" : "Net loss") : undefined}
          tone={data.scheduleC.hasData ? (data.scheduleC.netProfit >= 0 ? "good" : "warning") : undefined}
        />

        <Tile
          emoji="⚖️"
          label={nonprofit ? "Statement of Financial Position" : "Balance Sheet"}
          href="/balance"
          hasData={data.balanceSheet.hasData}
          big={fmt(data.balanceSheet.bottomTotal)}
          sub={
            data.balanceSheet.hasData
              ? `${data.balanceSheet.bottomLabel} — ${fmt(data.balanceSheet.totalAssets)} in total assets${
                  data.balanceSheet.balanced ? "" : " (doesn't balance yet)"
                }`
              : undefined
          }
          tone={data.balanceSheet.hasData ? (data.balanceSheet.balanced ? "good" : "warning") : undefined}
        />

        <Tile
          emoji="🧾"
          label={nonprofit ? "Donation Receipts" : "Invoices & AR"}
          href="/invoices"
          hasData={data.billing.hasData}
          big={fmt(data.billing.totalValue)}
          sub={
            data.billing.hasData
              ? `${data.billing.count} ${nonprofit ? "receipt" : "invoice"}${data.billing.count === 1 ? "" : "s"} saved`
              : undefined
          }
        />

        <Tile
          emoji="💳"
          label="Debt Payoff Planner"
          href="/budgeting"
          hasData={data.debt.hasData}
          big={fmt(data.debt.totalBalance)}
          sub={data.debt.hasData ? `${data.debt.debtCount} debt${data.debt.debtCount === 1 ? "" : "s"} tracked` : undefined}
        />

        <Tile
          emoji="🧠"
          label="Financial IQ Quiz"
          href="/quiz"
          hasData={data.quiz.hasData}
          big={data.quiz.hasData ? `${data.quiz.correct} / ${data.quiz.total} correct` : undefined}
          sub={data.quiz.hasData ? `${data.quiz.answered} of ${data.quiz.total} answered this run` : undefined}
        />
      </div>
    </Card>
  );
}
