"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS `calcEmergencyFund()` panel. Same target
 * math and the same "months until this date, so save $X/month" pacing
 * note — the one visual addition is a plain progress bar built from two
 * styled <div>s using the app's existing --status-good/warning/critical
 * tokens, standing in for the original's CSS gauge classes (which this
 * React build never carried over) without needing new global CSS.
 */

type EmergencyFundState = {
  expenses: number;
  savings: number;
  targetMonths: string;
  targetDate: string;
};

const TARGET_MONTHS_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
];

const initial: EmergencyFundState = {
  expenses: 0,
  savings: 0,
  targetMonths: "6",
  targetDate: "",
};

export function EmergencyFund() {
  const [state, setState] = useLocalStorageState<EmergencyFundState>("wc.emergency", initial);
  const set = <K extends keyof EmergencyFundState>(key: K, value: EmergencyFundState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => {
    const targetMonths = parseFloat(state.targetMonths) || 6;
    const targetAmount = state.expenses * targetMonths;
    const monthsCovered = state.expenses > 0 ? state.savings / state.expenses : 0;
    const percentFunded = targetAmount > 0 ? Math.min(100, (state.savings / targetAmount) * 100) : 0;
    const gap = Math.max(0, targetAmount - state.savings);

    let tone: "good" | "warning" | "critical" = "critical";
    let label = "Just getting started";
    if (percentFunded >= 100) {
      tone = "good";
      label = "Fully funded";
    } else if (percentFunded >= 50) {
      tone = "warning";
      label = "Halfway there";
    }

    let monthlyNeeded: number | null = null;
    let monthsUntil = 0;
    if (state.targetDate && gap > 0) {
      const target = new Date(state.targetDate + "T00:00:00");
      const now = new Date();
      if (!Number.isNaN(target.getTime())) {
        monthsUntil = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
        if (monthsUntil > 0) monthlyNeeded = gap / monthsUntil;
      }
    }

    return { targetMonths, targetAmount, monthsCovered, percentFunded, gap, tone, label, monthlyNeeded, monthsUntil };
  }, [state]);

  return (
    <Card
      title="Emergency Fund Monitor"
      lede="An emergency fund isn't a savings goal for fun — it's the wall between you and a credit card emergency. Enter your numbers to see exactly how covered you are, and what it takes to close the gap."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          &quot;Ain&apos;t No Mountain High Enough&quot; is a love song, but it&apos;s also patience set to music —
          the fund gets built the same way, month after month, not in one leap.
        </div>
      </div>
