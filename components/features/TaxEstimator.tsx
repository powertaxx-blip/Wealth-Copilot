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
          { v: fmt(r.stateTax), k: `${stateLabel} State Tax` },
          { v: fmt(r.localEIT + r.localFlatFee), k: "Local Tax + Flat Fee" },
          { v: r.eitc > 0 ? `-${fmt(r.eitc)}` : fmt(0), k: "EITC (credit — reduces tax owed)" },
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

      {!r.isRefund && r.netTax > 0 && (
        <div className="card mt-4" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
          <h3 className="mt-0 text-lg">
            Quarterly Estimated Payment Schedule
            <Tip text="If you expect to owe $1,000+ and don't have enough withheld — common with self-employment or side income — the IRS wants payments spread through the year instead of one lump sum in April." />
          </h3>
          <table>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Due Date</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Q1</td>
                <td>April 15</td>
                <td className="num">{fmt(r.quarterlyPayment)}</td>
              </tr>
              <tr>
                <td>Q2</td>
                <td>June 15</td>
                <td className="num">{fmt(r.quarterlyPayment)}</td>
              </tr>
              <tr>
                <td>Q3</td>
                <td>September 15</td>
                <td className="num">{fmt(r.quarterlyPayment)}</td>
              </tr>
              <tr>
                <td>Q4</td>
                <td>January 15 (following year)</td>
                <td className="num">{fmt(r.quarterlyPayment)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Exact dates shift a day or two when the 15th lands on a weekend or holiday — confirm on IRS.gov for the
            current year. This simply splits your estimate into four even payments; many preparers instead base
            quarterlies on last year&apos;s actual tax as a safe-harbor floor.
          </p>
        </div>
      )}

      <AIInsightPanel status={state.status} kids={state.kids} usState={state.state} result={r} />
      <TermDictionary />
    </Card>
  );
}
