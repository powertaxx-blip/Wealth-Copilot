"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type CashFlowInput,
  type OneTimeItem,
  CASH_FLOW_STORAGE_KEY,
  DEFAULT_CASH_FLOW,
  FORECAST_MONTHS,
  buildForecast,
  currentMonth,
  monthLabel,
  validItems,
  readBudgetBaseline,
  readFinancialHealthCash,
} from "@/lib/cashFlow";

/**
 * New panel — Cash-Flow Forecast. See lib/cashFlow.ts for the math and
 * how it pulls a starting point from Budgeting and Financial Health (a
 * one-time copy on request, not a live link). Visible to every org type.
 */

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function CashFlow() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [raw, setState] = useLocalStorageState<CashFlowInput>(CASH_FLOW_STORAGE_KEY, DEFAULT_CASH_FLOW);
  const input: CashFlowInput = useMemo(
    () => ({ ...raw, startMonth: /^\d{4}-\d{2}$/.test(raw.startMonth) ? raw.startMonth : currentMonth(), items: validItems(raw.items) }),
    [raw]
  );
  const set = <K extends keyof CashFlowInput>(key: K, value: CashFlowInput[K]) => setState((s) => ({ ...s, [key]: value }));
  const r = useMemo(() => buildForecast(input), [input]);

  // What the other panels can offer — read once, client-side.
  const [budget, setBudget] = useState<{ income: number; expenses: number } | null>(null);
  const [fhCash, setFhCash] = useState<number | null>(null);
  useEffect(() => {
    setBudget(readBudgetBaseline(nonprofit));
    setFhCash(readFinancialHealthCash());
  }, [nonprofit]);

  const [item, setItem] = useState<Omit<OneTimeItem, "id">>({ monthOffset: 0, label: "", amount: 0, direction: "in" });
  const [itemError, setItemError] = useState<string | null>(null);

  function addItem() {
    if (!item.label.trim() || item.amount <= 0) {
      setItemError("Give the item a name and an amount above $0.");
      return;
    }
    setItemError(null);
    setState((s) => ({ ...s, items: [...validItems(s.items), { ...item, label: item.label.trim(), id: crypto.randomUUID() }] }));
    setItem((i) => ({ ...i, label: "", amount: 0 }));
  }
  function removeItem(id: string) {
    setState((s) => ({ ...s, items: validItems(s.items).filter((i) => i.id !== id) }));
  }

  const now = currentMonth();
  const startOptions = Array.from(new Set([addMonths(now, -1), now, addMonths(now, 1), input.startMonth]))
    .sort()
    .map((ym) => ({ value: ym, label: `Starting ${monthLabel(ym, 0)}` }));
  const monthOptions = Array.from({ length: FORECAST_MONTHS }, (_, i) => ({ value: String(i), label: monthLabel(input.startMonth, i) }));

  return (
    <Card
      title="Cash-Flow Forecast"
      lede="Your bank balance, month by month, for the next year: what comes in, what goes out, and where it gets tight — so a shortfall shows up here months before it shows up in your account."
    >
      <MentorNote>
        McFadden &amp; Whitehead recorded &quot;Ain&apos;t No Stoppin&apos; Us Now&quot; for Philadelphia International, and
        it&apos;s the right attitude for a forecast. A shortfall you can see coming in March is a problem you can still fix in
        October: move a payment date, chase an unpaid invoice, or line up a credit line early. The one you don&apos;t see coming
        is the one that stops you.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Forecast period" value={input.startMonth} onChange={(v) => set("startMonth", v)} options={startOptions} />
        <NumberField label="Cash in the bank at the start ($)" value={input.startingCash} onChange={(v) => set("startingCash", v)} step={100} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label={nonprofit ? "Regular monthly revenue ($)" : "Regular monthly income ($)"}
          value={input.monthlyIncome}
          onChange={(v) => set("monthlyIncome", v)}
          step={100}
          tip="What comes in during a typical month. Leave out one-time money like a grant payment — add that below in the month it lands."
        />
        <NumberField
          label="Regular monthly expenses ($)"
          value={input.monthlyExpenses}
          onChange={(v) => set("monthlyExpenses", v)}
          step={100}
          tip="What goes out in a typical month: rent, payroll, subscriptions, loan payments. Add yearly or one-off bills below instead."
        />
      </div>
      {(budget || fhCash) && (
        <div className="flex flex-wrap gap-2" style={{ display: "flex" }}>
          {budget && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setState((s) => ({ ...s, monthlyIncome: budget.income, monthlyExpenses: budget.expenses }))}
            >
              Use my Budgeting numbers ({fmt(budget.income)} in / {fmt(budget.expenses)} out)
            </button>
          )}
          {fhCash && (
            <button type="button" className="btn ghost" onClick={() => set("startingCash", fhCash)}>
              Use cash on hand from Financial Health ({fmt(fhCash)})
            </button>
          )}
        </div>
      )}

      <h3 className="text-lg">One-Time Money In or Out</h3>
      <div className="grid gap-4 sm:grid-cols-4">
        <SelectField label="Month" value={String(item.monthOffset)} onChange={(v) => setItem((i) => ({ ...i, monthOffset: Number(v) }))} options={monthOptions} />
        <SelectField
          label="Direction"
          value={item.direction}
          onChange={(v) => setItem((i) => ({ ...i, direction: v as OneTimeItem["direction"] }))}
          options={[
            { value: "in", label: "Money in" },
            { value: "out", label: "Money out" },
          ]}
        />
        <TextField label="What is it?" value={item.label} onChange={(v) => setItem((i) => ({ ...i, label: v }))} placeholder="e.g., Grant payment" />
        <NumberField label="Amount ($)" value={item.amount} onChange={(v) => setItem((i) => ({ ...i, amount: v }))} step={100} />
      </div>
      <div>
        <button className="btn gold" onClick={addItem}>
          + Add Item
        </button>
      </div>
      {itemError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          {itemError}
        </p>
      )}
      {input.items.length > 0 && (
        <ul className="text-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[...input.items]
            .sort((a, b) => a.monthOffset - b.monthOffset)
            .map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2" style={{ display: "flex", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                <span>
                  {monthLabel(input.startMonth, i.monthOffset)} · {i.label}{" "}
                  <b style={{ color: i.direction === "in" ? "var(--status-good)" : "var(--status-critical)" }}>
                    {i.direction === "in" ? "+" : "−"}
                    {fmt(i.amount)}
                  </b>
                </span>
                <button className="btn ghost" onClick={() => removeItem(i.id)}>
                  Remove
                </button>
              </li>
            ))}
        </ul>
      )}

      <ResultBox
        label="Lowest balance in the next 12 months"
        big={`${fmt(r.lowest.closing)} in ${r.lowest.label}`}
        stats={[
          { v: fmt(r.endingCash), k: `End of ${r.months[r.months.length - 1].label}` },
          { v: fmt(r.totalIn), k: "Total in" },
          { v: fmt(r.totalOut), k: "Total out" },
        ]}
      />
      <div>
        <StatusPill tone={r.tone}>{r.headline}</StatusPill>
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Start</th>
              <th className="num">In</th>
              <th className="num">Out</th>
              <th className="num">End</th>
            </tr>
          </thead>
          <tbody>
            {r.months.map((m) => (
              <tr key={m.offset} style={m.offset === r.lowest.offset ? { background: "var(--line-soft)" } : undefined}>
                <td>
                  {m.label}
                  {m.oneTime.length > 0 && (
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {m.oneTime.map((i) => i.label).join(", ")}
                    </div>
                  )}
                </td>
                <td className="num">{fmt(m.opening)}</td>
                <td className="num">{fmt(m.income)}</td>
                <td className="num">{fmt(m.expenses)}</td>
                <td className="num" style={{ color: m.closing < 0 ? "var(--status-critical)" : undefined, fontWeight: m.offset === r.lowest.offset ? 700 : undefined }}>
                  {fmt(m.closing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        A planning estimate built from the typical month you entered — real months vary, so revisit it when something changes.
        The lowest month is highlighted. The Budgeting pull-in copies every planned spending category, including savings
        transfers; adjust the expense figure if some of that money stays in your accounts. Entries live only in this browser.
      </p>
    </Card>
  );
}
