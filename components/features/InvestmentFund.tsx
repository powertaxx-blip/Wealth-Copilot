"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { calcSETax } from "@/lib/tax";

/**
 * Direct port of three vanilla-JS panels that shared one screen in the
 * original prototype: the holdings tracker (addHolding/renderHoldings),
 * the growth projector (calcProjection — a separate "what if" calculator
 * that never touches the holdings list), and the SEP-IRA vs. Solo 401(k)
 * retirement contribution limits calculator (calcRetirementLimits, which
 * reuses the same self-employment tax math as the Tax Estimator — see
 * lib/tax.ts's calcSETax).
 *
 * The allocation-by-type bars use a fixed, CVD-safe categorical color
 * order (blue/orange/aqua/yellow/magenta/green) instead of the original's
 * CSS --series-N variables, which this React build never carried over —
 * same six hex values in both light and dark mode, kept simple since
 * this is one small supporting visual, not the app's primary chart.
 */

type HoldingType = "Stocks" | "Bonds" | "Retirement" | "RealEstate" | "Cash" | "Other";

type Holding = { id: string; name: string; type: HoldingType; contributed: number; value: number };

const TYPE_OPTIONS: { value: HoldingType; label: string }[] = [
  { value: "Stocks", label: "Stocks / ETFs" },
  { value: "Bonds", label: "Bonds" },
  { value: "Retirement", label: "Retirement (401k/IRA)" },
  { value: "RealEstate", label: "Real Estate" },
  { value: "Cash", label: "Cash / Money Market" },
  { value: "Other", label: "Other" },
];

const TYPE_LABEL: Record<HoldingType, string> = {
  Stocks: "Stocks / ETFs",
  Bonds: "Bonds",
  Retirement: "Retirement (401k/IRA)",
  RealEstate: "Real Estate",
  Cash: "Cash / Money Market",
  Other: "Other",
};

// Fixed categorical order — validated CVD-safe slots 1-6 (blue, orange,
// aqua, yellow, magenta, green). Identity is assigned by type, never by
// rank, so a type's color never changes as holdings are added/removed.
const TYPE_COLOR: Record<HoldingType, string> = {
  Stocks: "#2a78d6",
  Bonds: "#eb6834",
  Retirement: "#1baf7a",
  RealEstate: "#eda100",
  Cash: "#e87ba4",
  Other: "#008300",
};

const SOLO401K_EMPLOYEE_DEFERRAL_2025 = 23500;
const SOLO401K_CATCHUP_50 = 7500;
const SOLO401K_CATCHUP_60_63 = 11250; // SECURE 2.0 "super" catch-up, ages 60-63
const SEP_CAP_2025 = 70000;

export function InvestmentFund() {
  const [holdings, setHoldings] = useLocalStorageState<Holding[]>("wc.investment.holdings", []);
  const [draft, setDraft] = useState<{ name: string; type: HoldingType; contributed: number; value: number }>({
    name: "",
    type: "Stocks",
    contributed: 0,
    value: 0,
  });
  const [holdingError, setHoldingError] = useState(false);

  function addHolding() {
    if (draft.contributed <= 0 && draft.value <= 0) {
      setHoldingError(true);
      return;
    }
    setHoldingError(false);
    setHoldings((list) => [
      ...list,
      { id: crypto.randomUUID(), name: draft.name.trim() || "(unnamed holding)", type: draft.type, contributed: draft.contributed, value: draft.value },
    ]);
    setDraft({ name: "", type: draft.type, contributed: 0, value: 0 });
  }
  function removeHolding(id: string) {
    setHoldings((list) => list.filter((h) => h.id !== id));
  }

  const holdingTotals = useMemo(() => {
    const totalContributed = holdings.reduce((s, h) => s + h.contributed, 0);
    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const totalGL = totalValue - totalContributed;
    const byType: Partial<Record<HoldingType, number>> = {};
    holdings.forEach((h) => {
      byType[h.type] = (byType[h.type] || 0) + h.value;
    });
    return { totalContributed, totalValue, totalGL, byType };
  }, [holdings]);

  const [projInput, setProjInput] = useLocalStorageState(
    "wc.investment.projector",
    { start: 0, monthly: 0, ratePct: 7, years: 10 }
  );
  const setProj = <K extends keyof typeof projInput>(key: K, value: (typeof projInput)[K]) =>
    setProjInput((s) => ({ ...s, [key]: value }));

  const projection = useMemo(() => {
    const rMonthly = projInput.ratePct / 100 / 12;
    const n = projInput.years * 12;
    const fv =
      rMonthly === 0
        ? projInput.start + projInput.monthly * n
        : projInput.start * Math.pow(1 + rMonthly, n) + projInput.monthly * ((Math.pow(1 + rMonthly, n) - 1) / rMonthly);
    const totalContributed = projInput.start + projInput.monthly * n;
    return { fv, totalContributed, totalGrowth: fv - totalContributed };
  }, [projInput]);

  const [retInput, setRetInput] = useLocalStorageState("wc.investment.retirement", { profit: 0, age: 35 });
  const setRet = <K extends keyof typeof retInput>(key: K, value: (typeof retInput)[K]) =>
    setRetInput((s) => ({ ...s, [key]: value }));

  const retirement = useMemo(() => {
    const se = calcSETax(retInput.profit);
    const adjustedNetEarnings = Math.max(retInput.profit - se.deduction, 0);
    const sepAmount = Math.min(adjustedNetEarnings * 0.2, SEP_CAP_2025);

    let catchup = 0;
    if (retInput.age >= 60 && retInput.age <= 63) catchup = SOLO401K_CATCHUP_60_63;
    else if (retInput.age >= 50) catchup = SOLO401K_CATCHUP_50;
    const combinedCap = SEP_CAP_2025 + catchup;
    const employeeDeferral = Math.min(SOLO401K_EMPLOYEE_DEFERRAL_2025 + catchup, adjustedNetEarnings);
    const employerShare = Math.min(adjustedNetEarnings * 0.2, Math.max(combinedCap - employeeDeferral, 0));
    const soloTotal = Math.min(employeeDeferral + employerShare, combinedCap);
    const winner = soloTotal > sepAmount ? "Solo 401(k)" : sepAmount > soloTotal ? "SEP-IRA" : "Either — they tie";

    return { adjustedNetEarnings, sepAmount, employeeDeferral, employerShare, soloTotal, combinedCap, winner };
  }, [retInput]);

      
  const typeKeys = Object.keys(holdingTotals.byType) as HoldingType[];

  return (
    <Card
      title="Investment Fund Tracker"
      lede="Log what you've invested and where, and watch your allocation take shape. Then use the projector below to see what steady contributions could grow into over time."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          Saving protects what you have; investing is what puts time to work for you. The Upanishads speak of the
          small seed that holds the whole tree inside it — a modest monthly contribution works the same way, given
          enough years.
        </div>
      </div>

      <h3 className="text-lg">Holdings</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Holding name"
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder="e.g., Vanguard S&P 500 ETF"
        />
        <SelectField
          label="Type"
          value={draft.type}
          onChange={(v) => setDraft((d) => ({ ...d, type: v as HoldingType }))}
          options={TYPE_OPTIONS}
        />
        <NumberField
          label="Amount contributed"
          value={draft.contributed}
          onChange={(v) => {
            setDraft((d) => ({ ...d, contributed: v }));
            if (v > 0) setHoldingError(false);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Current value"
          value={draft.value}
          onChange={(v) => {
            setDraft((d) => ({ ...d, value: v }));
            if (v > 0) setHoldingError(false);
          }}
        />
        <button className="btn gold self-end" onClick={addHolding}>
          + Add Holding
        </button>
      </div>
      {holdingError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          Enter a contributed amount or current value greater than $0.
        </p>
      )}

      {holdings.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No holdings logged yet — add your first one above.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th className="num">Contributed</th>
              <th className="num">Current Value</th>
              <th className="num">Gain/Loss</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const gl = h.value - h.contributed;
              return (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{TYPE_LABEL[h.type]}</td>
                  <td className="num">{fmt(h.contributed)}</td>
                  <td className="num">{fmt(h.value)}</td>
                  <td className="num" style={{ color: gl >= 0 ? "var(--status-good)" : "var(--status-critical)" }}>
                    {gl >= 0 ? "+" : ""}
                    {fmt(gl)}
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => removeHolding(h.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {typeKeys.length > 0 && (
        <>
          <h3 className="text-lg">Allocation</h3>
          <div className="flex flex-col gap-2 mt-2">
            {typeKeys.map((t) => {
              const val = holdingTotals.byType[t] || 0;
              const pct = holdingTotals.totalValue > 0 ? (val / holdingTotals.totalValue) * 100 : 0;
              return (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <div style={{ width: 150, flexShrink: 0, color: "var(--ink-soft)" }}>{TYPE_LABEL[t]}</div>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 999,
                      background: "var(--line-soft)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ height: "100%", width: `${pct}%`, background: TYPE_COLOR[t] }} />
                  </div>
                  <div style={{ width: 120, flexShrink: 0, textAlign: "right", color: "var(--ink-soft)" }}>
                    {fmt(val)} ({pct.toFixed(0)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ResultBox
        label="Holdings summary"
        big={`${holdingTotals.totalGL >= 0 ? "+" : ""}${fmt(holdingTotals.totalGL)}`}
        stats={[
          { v: fmt(holdingTotals.totalContributed), k: "Total Contributed" },
          { v: fmt(holdingTotals.totalValue), k: "Total Current Value" },
          { v: `${holdingTotals.totalGL >= 0 ? "+" : ""}${fmt(holdingTotals.totalGL)}`, k: "Total Gain/Loss" },
        ]}
      />

      
      <h3 className="text-lg">Growth Projector</h3>
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        This doesn&apos;t touch your holdings above — it&apos;s a separate &quot;what if&quot; calculator for
        planning ahead.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Starting amount" value={projInput.start} onChange={(v) => setProj("start", v)} />
        <NumberField label="Monthly contribution" value={projInput.monthly} onChange={(v) => setProj("monthly", v)} />
        <NumberField
          label="Expected annual return (%)"
          value={projInput.ratePct}
          onChange={(v) => setProj("ratePct", v)}
          step={0.1}
        />
      </div>
      <NumberField label="Years to grow" value={projInput.years} onChange={(v) => setProj("years", v)} />

      <ResultBox
        label={`Projected value after ${projInput.years} year${projInput.years === 1 ? "" : "s"}`}
        big={fmt(projection.fv)}
        stats={[
          { v: fmt(projection.totalContributed), k: "Total Contributed" },
          { v: fmt(projection.totalGrowth), k: "Growth From Returns" },
        ]}
      />
      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        The projector assumes a constant monthly-compounded return, which real markets never deliver smoothly —
        it&apos;s for illustrating the power of consistency and time, not a guarantee. Past performance never
        guarantees future results.
      </p>

      <h3 className="text-lg">Retirement Contribution Limits — SEP-IRA vs. Solo 401(k)</h3>
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Business owners get two powerful self-employed retirement options, each with very different contribution
        room. Enter your numbers to see your 2025 limits side by side.
      </p>
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          The Bhagavad Gita speaks of storing up for what&apos;s ahead without attachment to the outcome — a
          retirement account is that discipline in financial form.
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Net self-employment profit this year"
          value={retInput.profit}
          onChange={(v) => setRet("profit", v)}
        />
        <NumberField
          label="Your age (for catch-up eligibility)"
          value={retInput.age}
          onChange={(v) => setRet("age", v)}
        />
      </div>

      
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th className="num">Max 2025 Contribution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SEP-IRA</td>
            <td className="num">{fmt(retirement.sepAmount)}</td>
          </tr>
          <tr>
            <td>Solo 401(k) — employee deferral</td>
            <td className="num">{fmt(retirement.employeeDeferral)}</td>
          </tr>
          <tr>
            <td>Solo 401(k) — employer profit-sharing</td>
            <td className="num">{fmt(retirement.employerShare)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <b>Solo 401(k) total</b>
            </td>
            <td className="num">
              <b>{fmt(retirement.soloTotal)}</b>
            </td>
          </tr>
        </tfoot>
      </table>

      <ResultBox
        label="More contribution room at this profit level"
        big={retirement.winner}
        stats={[
          { v: fmt(retirement.adjustedNetEarnings), k: "Adjusted Net SE Earnings" },
          { v: fmt(retirement.combinedCap), k: "Your Age-Based Cap" },
        ]}
      />
      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Figures are 2025 IRS limits. SEP-IRA: employer-style contribution up to 25% of compensation, calculated for
        the self-employed as roughly 20% of net SE earnings after the deduction for half your SE tax, capped at
        $70,000. Solo 401(k): employee deferral up to $23,500 (plus $7,500 catch-up at 50+, or $11,250 &quot;super
        catch-up&quot; for ages 60–63 under SECURE 2.0) plus an employer profit-sharing contribution of roughly 20%
        of net SE earnings, combined cap $70,000 ($77,500 at 50+, $81,250 for ages 60–63).
      </p>
    </Card>
  );
}
