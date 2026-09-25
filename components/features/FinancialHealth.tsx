"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField, CheckboxField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type FinancialHealthInput,
  FINANCIAL_HEALTH_STORAGE_KEY,
  DEFAULT_FINANCIAL_HEALTH,
  calcFinancialHealth,
} from "@/lib/financialHealth";

/**
 * New panel — Financial Health: Days Cash on Hand and the Operating
 * Reserve Ratio together. Same single-screen calculator shape as Donor
 * Retention: inputs saved to local storage, results derived with
 * useMemo, one ResultBox + StatusPill per number. See
 * lib/financialHealth.ts for the math, the bands, and how this differs
 * from Emergency Fund / Operating Reserve. Visible to every org type.
 */

export function FinancialHealth() {
  const [state, setState] = useLocalStorageState<FinancialHealthInput>(FINANCIAL_HEALTH_STORAGE_KEY, DEFAULT_FINANCIAL_HEALTH);
  const set = <K extends keyof FinancialHealthInput>(key: K, value: FinancialHealthInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => calcFinancialHealth(state), [state]);

  return (
    <Card
      title="Financial Health"
      lede="Two numbers that together show how long you could keep going if money stopped coming in: how many days your cash covers, and how many months your reserve covers. Enter three figures to see both."
    >
      <MentorNote>
        In Aesop&apos;s fable, the ant spends the summer putting food away while the grasshopper sings — and when winter
        comes, only one of them eats. There are really two questions in that story: how much is in the pantry today, and
        how much was put away on purpose for the lean months? Days Cash on Hand answers the first, the Operating Reserve
        Ratio the second. Cash that looks healthy because a grant just landed can be gone in a month, so it&apos;s worth
        reading them together.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Cash and cash equivalents on hand ($)"
          value={state.cash}
          onChange={(v) => set("cash", v)}
          step={100}
          tip="Money you could spend this week: checking, savings, and liquid investments like a money market fund. Leave out anything you can't get to quickly, like equipment or long-term CDs."
        />
        <NumberField
          label="Annual operating expenses ($)"
          value={state.annualExpenses}
          onChange={(v) => set("annualExpenses", v)}
          step={1000}
          tip="Everything it costs to run for a year: payroll, rent, supplies, program costs. Leave out one-time purchases like a building or a vehicle."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {state.reserveSameAsCash ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)", alignSelf: "center" }}>
            Reserve funds: using your cash on hand ({fmt(Math.max(0, state.cash))}).
          </p>
        ) : (
          <NumberField
            label="Board-designated or unrestricted reserve funds ($)"
            value={state.reserveFunds}
            onChange={(v) => set("reserveFunds", v)}
            step={100}
            tip="Depending on how you track it, this may be the same money as your cash on hand, or a separate amount the board or owner has set aside as a reserve. If you don't keep a separate reserve, check the box to use your cash on hand."
          />
        )}
        <CheckboxField
          label="My reserve is the same as my cash on hand"
          checked={state.reserveSameAsCash}
          onChange={(v) => set("reserveSameAsCash", v)}
          hint="Check this if you don't set aside a separate reserve amount."
        />
      </div>

      {r.status === "empty" ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Enter your annual operating expenses to see both numbers — everything here is measured against them.
        </p>
      ) : (
        <>
          <ResultBox
            label="Days cash on hand"
            big={`${r.daysCash.toLocaleString()} day${r.daysCash === 1 ? "" : "s"}`}
            stats={[
              { v: fmt(Math.max(0, state.cash)), k: "Cash on hand" },
              { v: fmt(r.dailyExpenses), k: "Spent per day" },
              { v: fmt(Math.max(0, state.annualExpenses)), k: "Annual expenses" },
            ]}
          />
          <div>
            <StatusPill tone={r.daysTone}>{r.daysLabel}</StatusPill>
          </div>

          <ResultBox
            label="Operating reserve ratio"
            big={`${r.reserveMonths.toFixed(1)} month${r.reserveMonths === 1 ? "" : "s"}`}
            stats={[
              { v: fmt(r.reserveUsed), k: state.reserveSameAsCash ? "Reserve (= cash on hand)" : "Reserve funds" },
              { v: fmt(Math.max(0, state.annualExpenses) / 12), k: "Spent per month" },
              { v: "3–6 months", k: "Recommended range" },
            ]}
          />
          <div>
            <StatusPill tone={r.reserveTone}>{r.reserveLabel}</StatusPill>
          </div>
        </>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Days cash on hand = cash ÷ (annual operating expenses ÷ 365). Operating reserve ratio = reserve funds ÷ annual
        operating expenses × 12. Under 30 days of cash is critical and 90 or more is strong; 3–6 months of reserve is the
        commonly recommended range. To plan how to build up a reserve over time, see{" "}
        <Link href="/emergency" style={{ textDecoration: "underline" }}>
          Emergency Fund / Operating Reserve
        </Link>
        . Entries here live only in this browser.
      </p>
    </Card>
  );
}
