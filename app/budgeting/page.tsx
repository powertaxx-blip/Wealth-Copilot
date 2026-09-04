import { DebtPayoffPlanner } from "@/components/features/DebtPayoffPlanner";

export default function BudgetingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <span
          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}
        >
          Partially ported
        </span>
        <h2 className="mt-2 text-2xl">Budgeting</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
          The original panel combines a 50/30/20 budget planner with the Debt Payoff Planner below. The 50/30/20
          half isn&apos;t ported yet — the Debt Payoff Planner is fully working, including the snowball/avalanche
          simulation.
        </p>
      </div>
      <DebtPayoffPlanner />
    </div>
  );
}
