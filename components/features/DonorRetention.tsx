"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type DonorRetentionInput,
  DONOR_RETENTION_STORAGE_KEY,
  DEFAULT_DONOR_RETENTION,
  SECTOR_AVG_LOW_PCT,
  SECTOR_AVG_HIGH_PCT,
  calcDonorRetention,
} from "@/lib/donorRetention";

/**
 * New panel — Donor Retention Rate. A single-screen calculator in the
 * same shape as Emergency Fund: inputs saved to local storage, result
 * derived with useMemo, ResultBox plus a StatusPill for the benchmark
 * band. See lib/donorRetention.ts for the math and why new donors don't
 * count toward the rate. Visible to every org type, same as Grants.
 */

function count(n: number): string {
  return Math.round(n).toLocaleString();
}

export function DonorRetention() {
  const [state, setState] = useLocalStorageState<DonorRetentionInput>(DONOR_RETENTION_STORAGE_KEY, DEFAULT_DONOR_RETENTION);
  const set = <K extends keyof DonorRetentionInput>(key: K, value: DonorRetentionInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => calcDonorRetention(state), [state]);

  return (
    <Card
      title="Donor Retention Rate"
      lede="Of everyone who gave last year, how many came back this year? It's the fundraising number that says the most about the health of your donor base — enter three counts to see where you stand."
    >
      <MentorNote>
        &quot;Lean on Me&quot; is a song about showing up for people again and again — and donor retention works the
        same way. A donor who hears back from you, with a real thank-you and a word on what their gift made possible,
        has a reason to give again. The people who already believe in your work are the easiest ones to keep.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Total donors last year"
          value={state.donorsLastYear}
          onChange={(v) => set("donorsLastYear", v)}
          step={1}
        />
        <NumberField
          label="Of those, gave again this year"
          value={state.returningDonors}
          onChange={(v) => set("returningDonors", v)}
          step={1}
        />
        <NumberField
          label="Brand-new donors this year"
          value={state.newDonors}
          onChange={(v) => set("newDonors", v)}
          step={1}
        />
      </div>

      {r.status === "empty" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Enter how many donors you had last year to see your retention rate.
        </p>
      )}

      {r.status === "invalid" && (
        <div className="note" style={{ borderLeftColor: "var(--status-critical)", margin: 0 }}>
          <b>Check your numbers:</b> returning donors can&apos;t be more than last year&apos;s total — they&apos;re a
          subset of it. Anyone giving for the first time this year belongs in &ldquo;Brand-new donors&rdquo; instead.
        </div>
      )}

      {r.status === "ok" && (
        <>
          <ResultBox
            label="Donor retention rate"
            big={`${r.ratePct.toFixed(1)}%`}
            stats={[
              { v: count(r.lostDonors), k: "Didn't give again" },
              { v: count(r.totalDonorsThisYear), k: "Total donors this year" },
              { v: `${r.netChange > 0 ? "+" : ""}${count(r.netChange)}`, k: "Change vs. last year" },
            ]}
          />
          <div>
            <StatusPill tone={r.tone}>{r.label}</StatusPill>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {count(state.returningDonors)} of your {count(state.donorsLastYear)} donors from last year gave again.
            {state.newDonors > 0 &&
              ` Your ${count(state.newDonors)} new donor${Math.round(state.newDonors) === 1 ? "" : "s"} don't count toward the rate — it measures who stayed, not who joined.`}
          </p>
        </>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Retention rate = returning donors ÷ last year&apos;s total donors × 100. The {SECTOR_AVG_LOW_PCT}–
        {SECTOR_AVG_HIGH_PCT}% sector average is a rough benchmark for nonprofits overall; rates vary a lot by
        organization size and by how donors first gave. Entries here live only in this browser.
      </p>
    </Card>
  );
}
