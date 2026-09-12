"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS `calcEmergencyFund()` panel. Same target
 * math and the same "months until this date, so save $X/month" pacing
 * note — the one visual addition is a plain progress bar built from two
 * styled <div>s using the app's existing --status-good/warning/critical
 * tokens, standing in for the original's CSS gauge classes (which this
 * React build never carried over) without needing new global CSS.
 *
 * Nonprofit Mode (lib/orgType.ts) relabels this as an "Operating
 * Reserve" — the term a nonprofit's board and funders actually use for
 * the same 3-6-months-of-expenses cushion, per National Council of
 * Nonprofits guidance. The math underneath doesn't change at all, only
 * the title, copy, and field labels do.
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
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
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
      title={nonprofit ? "Operating Reserve" : "Emergency Fund Monitor"}
      lede={
        nonprofit
          ? "An operating reserve isn't a rainy-day extra — it's what lets the organization keep serving its mission through a slow grant cycle or a late-paying funder. Enter your numbers to see exactly how covered you are, and what it takes to close the gap."
          : "An emergency fund isn't a savings goal for fun — it's the wall between you and a credit card emergency. Enter your numbers to see exactly how covered you are, and what it takes to close the gap."
      }
    >
      <MentorNote>
        &quot;Ain&apos;t No Mountain High Enough&quot; is a love song, but it&apos;s also patience set to music —
        the fund gets built the same way, month after month, not in one leap.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label={nonprofit ? "Monthly operating expenses" : "Monthly essential expenses"}
          value={state.expenses}
          onChange={(v) => set("expenses", v)}
        />
        <NumberField
          label={nonprofit ? "Current reserve balance" : "Current emergency savings"}
          value={state.savings}
          onChange={(v) => set("savings", v)}
        />
        <SelectField
          label="Target coverage"
          value={state.targetMonths}
          onChange={(v) => set("targetMonths", v)}
          options={TARGET_MONTHS_OPTIONS}
        />
      </div>
      <TextField
        label="Target date to reach full coverage (optional)"
        value={state.targetDate}
        onChange={(v) => set("targetDate", v)}
        placeholder="e.g., 2027-06-01"
      />

      <ResultBox
        label="Months of expenses currently covered"
        big={`${r.monthsCovered.toFixed(1)} months`}
        stats={[
          { v: fmt(r.targetAmount), k: "Target Reserve" },
          { v: fmt(state.savings), k: "Current Balance" },
          { v: fmt(r.gap), k: "Remaining Gap" },
        ]}
      />

      <div
        className="mt-3"
        style={{ height: 12, borderRadius: 999, background: "var(--line-soft)", overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%",
            width: `${r.percentFunded}%`,
            background: `var(--status-${r.tone})`,
            transition: "width 0.2s ease",
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>$0</span>
        <span>
          {fmt(r.targetAmount)} target ({r.targetMonths} mo.)
        </span>
      </div>
      <div className="mt-3">
        <StatusPill tone={r.tone}>
          {r.label} — {r.percentFunded.toFixed(0)}% funded
        </StatusPill>
      </div>

      {r.monthlyNeeded !== null && (
        <div className="mentor mt-3">
          <div>
            <span className="eyebrow">To Hit Full Coverage</span>
            By {state.targetDate}: set aside about {fmt(r.monthlyNeeded)}/month for the next {r.monthsUntil} month
            {r.monthsUntil === 1 ? "" : "s"}.
          </div>
        </div>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        {nonprofit
          ? "3–6 months of operating expenses is the range the National Council of Nonprofits points to as a healthy reserve, though boards with less predictable funding (grant-dependent orgs especially) often aim for 6 months or more."
          : "3–6 months is the common rule of thumb for employees; business owners with less predictable income often aim for 6–12 months instead."}
      </p>
    </Card>
  );
}
