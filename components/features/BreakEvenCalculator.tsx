      "use client";

import { Card } from "@/components/ui/Card";
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
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          Marvin Gaye asked &quot;what&apos;s going on&quot; — your break-even number is the answer.
        </div>
      </div>

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
