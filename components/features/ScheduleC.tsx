"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
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
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          The Upanishads teach that a wise person sees the small and the large as one connected whole — an $8 supply
          receipt matters just as much as the big contract.
        </div>
      </div>

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
