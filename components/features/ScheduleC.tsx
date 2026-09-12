"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, NumberField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  SC_EXPENSE_LINES,
  INITIAL_SCHEDULE_C,
  SCHEDULE_C_STORAGE_KEY,
  SCHEDULE_C_NET_PROFIT_KEY,
  calcScheduleC,
  type ScheduleCInput,
} from "@/lib/scheduleC";

/**
 * Direct port of the vanilla-JS Schedule C builder (buildScheduleCForm() +
 * calcScheduleC() + the results template). Same 15-category form, same
 * mileage-rate math, same Part I / Part II / net-profit layout — the
 * category inputs are generated from SC_EXPENSE_LINES the same way the
 * original built them from the same array, just with .map() over JSX
 * instead of a join()'d HTML string.
 */
export function ScheduleC() {
  const [state, setState] = useLocalStorageState<ScheduleCInput>(SCHEDULE_C_STORAGE_KEY, INITIAL_SCHEDULE_C);
  const set = <K extends keyof ScheduleCInput>(key: K, value: ScheduleCInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));
  const setCategory = (id: string, value: number) =>
    setState((s) => ({ ...s, categoryAmounts: { ...s.categoryAmounts, [id]: value } }));

  const router = useRouter();
  const result = useMemo(() => calcScheduleC(state), [state]);

  // Keep the cross-panel bridge key current every time net profit changes —
  // not debounced like the full form save, so the Tax Estimator's "pull"
  // button never reads a stale value. See lib/scheduleC.ts's file header.
  useEffect(() => {
    try {
      window.localStorage.setItem(SCHEDULE_C_NET_PROFIT_KEY, JSON.stringify(result.netProfit));
    } catch {
      // storage unavailable — same silent fallback as everywhere else
    }
  }, [result.netProfit]);

  function sendToEstimator() {
    router.push("/estimator");
  }

  return (
    <Card
      title="Schedule C Builder — Profit or Loss From Business"
      lede="This mirrors the real IRS Schedule C layout. Enter your numbers and watch your net profit build in real time, line by line."
    >
      <MentorNote>
        The Upanishads teach that a wise person sees the small and the large as one connected whole — an $8 supply
        receipt matters just as much as the big contract.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Business name"
          value={state.businessName}
          onChange={(v) => set("businessName", v)}
          placeholder="e.g., Chester Mobile Detailing LLC"
        />
        <TextField
          label="Principal business or profession"
          value={state.profession}
          onChange={(v) => set("profession", v)}
          placeholder="e.g., Auto detailing services"
        />
      </div>

      <h3 className="text-lg">Part I — Income</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Gross receipts or sales" value={state.gross} onChange={(v) => set("gross", v)} />
        <NumberField label="Returns and allowances" value={state.returns} onChange={(v) => set("returns", v)} />
      </div>

      <h3 className="text-lg">Part II — Expenses</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {SC_EXPENSE_LINES.map((line) => (
          <NumberField
            key={line.id}
            label={line.label}
            value={state.categoryAmounts[line.id] || 0}
            onChange={(v) => setCategory(line.id, v)}
          />
        ))}
      </div> 
      <h3 className="text-lg">Vehicle / Mileage (Line 9 helper)</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Business miles driven" value={state.miles} onChange={(v) => set("miles", v)} />
        <NumberField
          label="IRS standard mileage rate (2025)"
          value={state.mileRate}
          onChange={(v) => set("mileRate", v)}
          step={0.01}
        />
        <div className="field">
          <label>Car &amp; truck expense (auto-computed)</label>
          <input type="text" value={fmt(result.carExpense)} disabled />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Part I — Income</th>
            <th className="num"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gross receipts</td>
            <td className="num">{fmt(state.gross)}</td>
          </tr>
          <tr>
            <td>Less: returns &amp; allowances</td>
            <td className="num">-{fmt(state.returns)}</td>
          </tr>
          <tr>
            <td>
              <b>Gross income (Line 7)</b>
            </td>
            <td className="num">
              <b>{fmt(result.netReceipts)}</b>
            </td>
          </tr>
        </tbody>
        <thead>
          <tr>
            <th>Part II — Expenses</th>
            <th className="num"></th>
          </tr>
        </thead>
        <tbody>
          {result.lineItems.filter((li) => li.val !== 0).length === 0 ? (
            <tr>
              <td colSpan={2} style={{ color: "var(--muted)" }}>
                Enter expenses above to see them itemized here.
              </td>
            </tr>
          ) : (
            result.lineItems
              .filter((li) => li.val !== 0)
              .map((li) => (
                <tr key={li.label}>
                  <td>{li.label}</td>
                  <td className="num">{fmt(li.val)}</td>
                </tr>
              ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>Total expenses (Line 28)</td>
            <td className="num">{fmt(result.totalExpenses)}</td>
          </tr>
          <tr>
            <td>Net profit or (loss) (Line 31)</td>
            <td className="num">{fmt(result.netProfit)}</td>
          </tr>
        </tfoot>
      </table>

      <ResultBox label="Net profit flowing to your Form 1040 & Schedule SE" big={fmt(result.netProfit)} />
      <button className="btn gold mt-2" onClick={sendToEstimator}>
        Send this net profit to the Tax Estimator →
      </button>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        This builder covers the core lines most small business owners use. It does not include depreciation (Form
        4562), cost of goods sold detail, or the home-office actual-expense method — those need a closer look with a
        tax professional.
      </p>
    </Card>
  );
}
