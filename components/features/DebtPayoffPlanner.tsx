"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField, TextField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Port of the vanilla-JS debt array + simulateDebtPayoff()/calcDebtPayoff().
 * This is the pattern the Break-Even calculator doesn't show: a growing
 * list of records (the old `let debts = []` global) plus a pure
 * simulation function — here the list is component state and the
 * simulation is a plain function called from useMemo, so it only
 * re-runs when the debts or the two settings actually change.
 */

type Debt = { id: string; name: string; balance: number; rate: number; min: number };
type Strategy = "snowball" | "avalanche";

function simulate(debtList: Debt[], extra: number) {
  let working = debtList.map((d) => ({ ...d }));
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 1200; // 100-year safety cap against runaway loops

  while (working.some((d) => d.balance > 0.01) && months < maxMonths) {
    months++;
    let pool = extra;
    working.forEach((d) => {
      if (d.balance <= 0) return;
      const interest = d.balance * (d.rate / 100 / 12);
      totalInterest += interest;
      d.balance += interest;
    });
    working.forEach((d) => {
      if (d.balance <= 0) return;
      d.balance -= Math.min(d.min, d.balance);
    });
    for (const d of working) {
      if (pool <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(pool, d.balance);
      d.balance -= pay;
      pool -= pay;
    }
  }
  return { months, totalInterest };
}

export function DebtPayoffPlanner() {
  const [debts, setDebts] = useLocalStorageState<Debt[]>("wc.debts", []);
  const [extra, setExtra] = useLocalStorageState<number>("wc.debts.extra", 0);
  const [strategy, setStrategy] = useLocalStorageState<Strategy>("wc.debts.strategy", "snowball");

  const [draft, setDraft] = useState({ name: "", balance: 0, rate: 0, min: 0 });

  function addDebt() {
    if (draft.balance <= 0) return;
    setDebts((d) => [...d, { id: crypto.randomUUID(), ...draft, name: draft.name || "(unnamed debt)" }]);
    setDraft({ name: "", balance: 0, rate: 0, min: 0 });
  }
  function removeDebt(id: string) {
    setDebts((d) => d.filter((x) => x.id !== id));
  }

  const { snowball, avalanche } = useMemo(() => {
    const snowballOrder = [...debts].sort((a, b) => a.balance - b.balance);
    const avalancheOrder = [...debts].sort((a, b) => b.rate - a.rate);
    return {
      snowball: simulate(snowballOrder, extra),
      avalanche: simulate(avalancheOrder, extra),
    };
  }, [debts, extra]);

  const highlighted = strategy === "snowball" ? snowball : avalanche;
  const other = strategy === "snowball" ? avalanche : snowball;
  const interestDiff = other.totalInterest - highlighted.totalInterest;
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimums = debts.reduce((s, d) => s + d.min, 0);

  return (
    <Card
      title="Debt Payoff Planner"
      lede="List each debt, add any extra you can put toward payoff each month, then compare Snowball (smallest balance first) against Avalanche (highest rate first)."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Debt name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
        <NumberField
          label="Current balance"
          value={draft.balance}
          onChange={(v) => setDraft((d) => ({ ...d, balance: v }))}
        />
        <NumberField
          label="Interest rate (APR %)"
          value={draft.rate}
          onChange={(v) => setDraft((d) => ({ ...d, rate: v }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Minimum monthly payment"
          value={draft.min}
          onChange={(v) => setDraft((d) => ({ ...d, min: v }))}
        />
        <button className="btn gold self-end" onClick={addDebt}>
          + Add Debt
        </button>
      </div>

      {debts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No debts logged yet — add each one above.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Debt</th>
              <th className="num">Balance</th>
              <th className="num">APR</th>
              <th className="num">Min.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.id}>
                <td style={{ color: "var(--ink)", fontWeight: 600 }}>{d.name}</td>
                <td className="num">{fmt(d.balance)}</td>
                <td className="num">{d.rate.toFixed(1)}%</td>
                <td className="num">{fmt(d.min)}</td>
                <td>
                  <button className="btn ghost" onClick={() => removeDebt(d.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Extra toward debt each month" value={extra} onChange={setExtra} />
        <div className="field">
          <label>Strategy to highlight</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
            <option value="snowball">Snowball (smallest balance first)</option>
            <option value="avalanche">Avalanche (highest rate first)</option>
          </select>
        </div>
      </div>

      {debts.length > 0 && (
        <>
          <ResultBox
            label={`Debt-free in (${strategy === "snowball" ? "Snowball" : "Avalanche"} order)`}
            big={`${highlighted.months} month${highlighted.months === 1 ? "" : "s"}`}
            stats={[
              { v: fmt(totalBalance), k: "Total Debt Today" },
              { v: fmt(totalMinimums + extra), k: "Total Monthly Payment" },
              { v: fmt(highlighted.totalInterest), k: "Total Interest Paid" },
            ]}
          />
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th className="num">Months</th>
                <th className="num">Total Interest</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Snowball</td>
                <td className="num">{snowball.months}</td>
                <td className="num">{fmt(snowball.totalInterest)}</td>
              </tr>
              <tr>
                <td>Avalanche</td>
                <td className="num">{avalanche.months}</td>
                <td className="num">{fmt(avalanche.totalInterest)}</td>
              </tr>
            </tbody>
          </table>
          {interestDiff > 1 && (
            <div className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--gold)", background: "var(--line-soft)", color: "var(--ink-soft)" }}>
              The other strategy would save about {fmt(Math.abs(interestDiff))} in interest — snowball trades some of
              that for faster motivational wins.
            </div>
          )}
        </>
      )}
    </Card>
  );
}
