      "use client";

import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

type BreakEvenState = {
  fixed: number;
  varCost: number;
  price: number;
  unitCost: number;
  marginPct: number;
};

const initial: BreakEvenState = {
  fixed: 0,
  varCost: 0,
  price: 0,
  unitCost: 0,
  marginPct: 30,
};

export function BreakEvenCalculator() {
  const [state, setState] = useLocalStorageState<BreakEvenState>("wc.breakeven", initial);
  const set = <K extends keyof BreakEvenState>(key: K, value: BreakEvenState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const contribution = state.price - state.varCost;
  const margin = state.marginPct / 100;

  return (
    <Card
      title="Break-Even & Pricing Calculator"
      lede="Two questions every entrepreneur has to answer before setting a price: how many do I need to sell just to stop losing money, and what should I actually charge to hit the margin I need?"
    >
      <MentorNote>
        Marvin Gaye asked &quot;what&apos;s going on&quot; — your break-even number is the answer.
      </MentorNote>

      <h3 className="text-lg">Break-Even Point</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Fixed costs (monthly)"
          value={state.fixed}
          onChange={(v) => set("fixed", v)}
        />
        <NumberField
          label="Variable cost per unit"
          value={state.varCost}
          onChange={(v) => set("varCost", v)}
        />
        <NumberField label="Selling price per unit" value={state.price} onChange={(v) => set("price", v)} />
      </div>
      {contribution <= 0 ? (
        <div className="result-box" style={{ background: "var(--status-critical-bg)" }}>
          <div className="label" style={{ color: "var(--status-critical)" }}>
            Break-even point
          </div>
          <div className="big" style={{ color: "var(--status-critical)" }}>
            Not reachable
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            Your selling price ({fmt(state.price)}) doesn&apos;t cover your variable cost per unit (
            {fmt(state.varCost)}) — every sale loses money before fixed costs are even considered.
          </p>
        </div>
      ) : (
        <ResultBox
          label="Units you must sell to break even"
          big={`${(state.fixed / contribution).toFixed(1)} units`}
          stats={[
            { v: fmt(contribution), k: "Contribution / Unit" },
            { v: fmt((state.fixed / contribution) * state.price), k: "Break-Even Revenue" },
            { v: fmt(state.fixed), k: "Fixed Costs Covered" },
          ]}
        />
      )}

      <h3 className="text-lg">Reverse Pricing — What Should I Charge?</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Total cost per unit" value={state.unitCost} onChange={(v) => set("unitCost", v)} />
        <NumberField
          label="Target profit margin (% of price)"
          value={state.marginPct}
          onChange={(v) => set("marginPct", v)}
        />
      </div>

      {margin >= 1 ? (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          A 100%+ margin on selling price isn&apos;t mathematically possible — try a number below 100%.
        </p>
      ) : (
        <ResultBox
          label="Suggested selling price"
          big={fmt(state.unitCost / (1 - margin))}
          stats={[
            { v: fmt(state.unitCost), k: "Cost / Unit" },
            { v: fmt(state.unitCost / (1 - margin) - state.unitCost), k: "Profit / Unit" },
            { v: `${state.marginPct.toFixed(0)}%`, k: "Margin on Price" },
          ]}
        />
      )}
    </Card>
  );
}
