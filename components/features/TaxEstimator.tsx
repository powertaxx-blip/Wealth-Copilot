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
      <ResultBox
        label={
          r.isRefund
            ? "Estimated refund (credits exceed tax owed)"
            : "Estimated total tax owed (federal + SE + PA + local, after EITC)"
        }
        big={fmt(Math.abs(r.netTax))}
        stats={[
          { v: fmt(r.agi), k: "Adjusted Gross Income" },
          { v: fmt(r.deduction), k: "Standard/Itemized Deduction" },
          { v: fmt(r.qbiDeduction), k: "QBI Deduction (20%)" },
          { v: fmt(r.taxableIncome), k: "Federal Taxable Income" },
          { v: fmt(r.federalAfterCredits), k: "Federal Tax (after CTC)" },
          { v: fmt(r.seTax), k: "Self-Employment Tax" },
          { v: fmt(r.paTax), k: "PA State Tax" },
          { v: fmt(r.localEIT + r.lst), k: "Local Tax + LST" },
          { v: `-${fmt(r.eitc)}`, k: "EITC" },
          { v: `${r.effectiveRate.toFixed(1)}%`, k: "Effective Tax Rate" },
          { v: fmt(r.takeHome), k: "Estimated Take-Home" },
        ]}
      />

      {state.status === "mfs" ? (
        <div className="note mt-3">
          <b>Heads up:</b> Married Filing Separately generally isn&apos;t eligible for the EITC, so it&apos;s shown
          as $0 here — that alone is sometimes a reason a married couple chooses MFJ instead.
        </div>
      ) : r.eitc > 0 ? (
        <div className="note mt-3">
          <b>Good news:</b> based on what you entered, this household qualifies for an estimated {fmt(r.eitc)}{" "}
          Earned Income Tax Credit{" "}
          <Tip text="Earned Income Tax Credit — a credit for low-to-moderate earners that directly reduces tax owed (or adds to a refund), separate from any deduction." />{" "}
          — that&apos;s real money that reduces tax owed or adds to a refund, not just a deduction. Always confirm
          exact eligibility (qualifying child rules, residency, etc.) before filing.
        </div>
      ) : state.other > EITC_INVESTMENT_INCOME_LIMIT_2025 ? (
        <div className="note mt-3">
          <b>Heads up:</b> investment income above {fmt(EITC_INVESTMENT_INCOME_LIMIT_2025)} disqualifies a filer
          from the EITC entirely for 2025, which is why it&apos;s showing $0 here.
        </div>
      ) : null}
