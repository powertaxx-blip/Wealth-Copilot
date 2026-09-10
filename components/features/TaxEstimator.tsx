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
import { US_STATES, type USState } from "@/lib/stateTax";
import { readScheduleCNetProfit } from "@/lib/scheduleC";

/**
 * Direct port of the vanilla-JS `runEstimator()` panel — the most
 * math-heavy screen in the app, and the reason it was first in the
 * recommended port order (see MIGRATION.md): calcFederalTax(),
 * calcSETax(), and calcEITC() are pure functions with no DOM
 * dependency, so they moved into lib/tax.ts almost unchanged. The only
 * real work here is the same one BreakEvenCalculator.tsx already
 * demonstrated: state lives in React instead of the DOM, and
 * estimateTax() is recomputed with useMemo instead of a runEstimator()
 * click handler rebuilding an HTML string.
 */

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
  state: "PA",
  localRatePct: 1.25,
  localFlatFee: 52,
};

export function TaxEstimator() {
  // Naming note: `state` here is the React state variable (the whole
  // form), while `state.state` is the two-letter US state code field on
  // it (e.g. "PA", "CA") — the same shadowing every other field already
  // has (state.status, state.kids, …), just easy to misread once there's
  // a field literally named "state".
  const [state, setState] = useLocalStorageState<EstimatorInput>("wc.estimator", initial);
  const set = <K extends keyof EstimatorInput>(key: K, value: EstimatorInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));
  const stateLabel = US_STATES.find((s) => s.value === state.state)?.label ?? state.state;

  const r = useMemo(() => estimateTax(state), [state]);

  return (
    <Card
      title="Tax Estimator"
      lede="Federal, self-employment, and all 50 states' + DC state income tax — plus a local tax field for your city or county, the Earned Income Tax Credit, and a quarterly estimated-payment schedule if you owe. Tax year 2025 (filed 2026)."
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
        <div>
          <NumberField
            label="Self-employment net profit"
            value={state.seProfit}
            onChange={(v) => set("seProfit", v)}
          />
          <button
            type="button"
            className="text-xs mt-1 underline"
            style={{ color: "var(--navy-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => set("seProfit", readScheduleCNetProfit())}
          >
            Built a Schedule C already? Click to pull that net profit in →
          </button>
        </div>
        <NumberField label="Other income (interest, dividends, etc.)" value={state.other} onChange={(v) => set("other", v)} />
      </div>

      <h3 className="text-lg">Deductions, State &amp; Local</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Itemized deductions (0 = use standard)"
          value={state.itemized}
          onChange={(v) => set("itemized", v)}
        />
        <SelectField
          label="State"
          value={state.state}
          onChange={(v) => set("state", v as USState)}
          options={US_STATES}
        />
        <NumberField
          label="Local earned income tax rate (%) — your city/county, if any"
          value={state.localRatePct}
          onChange={(v) => set("localRatePct", v)}
          step={0.01}
        />
        <NumberField
          label="Local flat tax/fee ($/yr) — e.g. Pennsylvania's up to $52 Local Services Tax"
          value={state.localFlatFee}
          onChange={(v) => set("localFlatFee", v)}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        State tax is calculated automatically from each state's published 2025 rates. Local (city/county) tax varies
        block by block nationwide, so there's no lookup for it — type in your own rate and flat fee, the same way
        this already worked for Pennsylvania's Chester County local tax.
      </p>
