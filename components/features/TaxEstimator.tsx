"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { Tip } from "@/components/ui/Tip";
import { AIInsightPanel } from "@/components/features/AIInsightPanel";
import { TermDictionary } from "@/components/features/TermDictionary";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { estimateTax, EITC_INVESTMENT_INCOME_LIMIT_2025, type EstimatorInput, type FilingStatus } from "@/lib/tax";

const STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married Filing Jointly" },
  { value: "mfs", label: "Married Filing Separately" },
  { value: "hoh", label: "Head of Household" },
];

const initial: EstimatorInput = {
  status: "single",
  kids: 0,
  wages: 0,
  seProfit: 0,
  other: 0,
  itemized: 0,
  paRatePct: 3.07,
  localRatePct: 1.25,
  includeLST: true,
};

export function TaxEstimator() {
  const [state, setState] = useLocalStorageState<EstimatorInput>("wc.estimator", initial);
  const set = <K extends keyof EstimatorInput>(key: K, value: EstimatorInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => estimateTax(state), [state]);

  return (
    <Card
      title="Tax Estimator"
      lede="Federal, self-employment, Pennsylvania, and Chester County local tax — plus the Earned Income Tax Credit and a quarterly estimated-payment schedule if you owe. Tax year 2025 (filed 2026)."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          The O&apos;Jays said it plain — &quot;for the love of money.&quot; Run your real numbers before you guess.
        </div>
      </div>

      <h3 className="text-lg">Household</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Filing status"
          value={state.status}
          onChange={(v) => set("status", v as FilingStatus)}
          options={STATUS_OPTIONS}
        />
        <NumberField label="Qualifying children under 17" value={state.kids} onChange={(v) => set("kids", v)} />
      </div>

      <h3 className="text-lg">Income</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="W-2 wages" value={state.wages} onChange={(v) => set("wages", v)} />
        <NumberField
          label="Self-employment net profit"
          value={state.seProfit}
          onChange={(v) => set("seProfit", v)}
        />
        <NumberField label="Other income (interest, dividends, etc.)" value={state.other} onChange={(v) => set("other", v)} />
      </div>

      <h3 className="text-lg">Deductions &amp; Local Rates</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Itemized deductions (0 = use standard)"
          value={state.itemized}
          onChange={(v) => set("itemized", v)}
        />
        <div />
        <NumberField
          label="PA state tax rate (%)"
          value={state.paRatePct}
          onChange={(v) => set("paRatePct", v)}
          step={0.01}
        />
        <NumberField
          label="Local earned income tax rate (%)"
          value={state.localRatePct}
          onChange={(v) => set("localRatePct", v)}
          step={0.01}
        />
        <SelectField
          label="Include Local Services Tax ($52/yr if local wages > $12,000)"
          value={state.includeLST ? "yes" : "no"}
          onChange={(v) => set("includeLST", v === "yes")}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </div>
