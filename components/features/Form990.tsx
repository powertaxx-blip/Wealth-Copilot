"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField, DateField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Form990Input,
  FORM_990_STORAGE_KEY,
  DEFAULT_FORM_990,
  calcForm990,
  formatDate,
} from "@/lib/form990";

/**
 * New panel — 990 Compliance. Same single-screen calculator shape as
 * Financial Health: inputs saved to local storage, result derived with
 * useMemo, ResultBox + StatusPill. See lib/form990.ts for the form rules,
 * the deadline math, and what's deliberately out of scope (990-PF,
 * churches). Visible to every org type.
 *
 * "Today" is read on the client only: the saved fiscal year end loads
 * from localStorage after hydration, so the server render always has no
 * date and nothing date-dependent to mismatch.
 */

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

export function Form990Compliance() {
  const [state, setState] = useLocalStorageState<Form990Input>(FORM_990_STORAGE_KEY, DEFAULT_FORM_990);
  const set = <K extends keyof Form990Input>(key: K, value: Form990Input[K]) => setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => calcForm990(state), [state]);
  const d = r.deadline;

  return (
    <Card
      title="990 Compliance"
      lede="Which version of Form 990 your organization files with the IRS each year, when it's due, and how much time you have left. Enter three details to find out."
    >
      <MentorNote>
        Patanjali&apos;s Yoga Sutras say a practice only becomes solid ground when you keep it up for a long time, without
        gaps, and with real care. Your 990 is that kind of practice: one filing a year, every year. It&apos;s the gaps that
        cost you. Miss three years in a row and your tax-exempt status is revoked automatically.
      </MentorNote>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Annual gross receipts ($)"
          value={state.grossReceipts}
          onChange={(v) => set("grossReceipts", v)}
          step={1000}
          tip="Everything the organization took in during the year before subtracting any costs: donations, grants, program fees, sales, and investment income."
        />
        <NumberField
          label="Total assets ($)"
          value={state.totalAssets}
          onChange={(v) => set("totalAssets", v)}
          step={1000}
          tip="Everything the organization owns at the end of its fiscal year: cash, investments, equipment, property, and money owed to it."
        />
        <DateField
          label="Fiscal year end date"
          value={state.fiscalYearEnd}
          onChange={(v) => set("fiscalYearEnd", v)}
          tip="The last day of your organization's accounting year — December 31 for most, but some end on June 30 or another month. Use your most recent year end."
        />
      </div>

      <ResultBox label="Form you file" big={r.formLabel} />
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        {r.explanation}
      </p>

      {d.status === "noDate" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Enter your fiscal year end date to see your filing deadline and how many days you have left.
        </p>
      )}

      {d.status === "invalidDate" && (
        <div className="note" style={{ borderLeftColor: "var(--status-warning)", margin: 0 }}>
          <b>Check the date:</b> that isn&apos;t a real calendar date. Pick your fiscal year end from the date picker.
        </div>
      )}

      {d.status === "upcoming" && (
        <>
          <ResultBox
            label="Days until your filing deadline"
            big={plural(d.daysRemaining, "day")}
            stats={[{ v: formatDate(d.due), k: "Filing deadline" }]}
          />
          <div>
            <StatusPill tone={d.tone}>{d.label}</StatusPill>
          </div>
          {d.weekendShift !== null && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              That date falls on a weekend, so the IRS will accept your filing through {formatDate(d.weekendShift)}.
            </p>
          )}
        </>
      )}

      {d.status === "passed" && (
        <div className="note" style={{ borderLeftColor: "var(--status-critical)", margin: 0 }}>
          <b>Your filing deadline has passed.</b> For this fiscal year, the {r.form} was due {formatDate(d.due)} —{" "}
          {plural(d.daysPast, "day")} ago.{" "}
          {d.extendedDue === null ? (
            <>The 990-N can&apos;t be extended, so file it online as soon as you can.</>
          ) : d.extendedDaysRemaining !== null && d.extendedDaysRemaining >= 0 ? (
            <>
              If you filed Form 8868 for an extension by that date, your extended deadline is {formatDate(d.extendedDue)}{" "}
              ({plural(d.extendedDaysRemaining, "day")} from now). If you didn&apos;t, file as soon as you can — late filings can
              carry IRS penalties.
            </>
          ) : (
            <>
              The 6-month extension available through Form 8868 would also have ended on {formatDate(d.extendedDue)}. File as
              soon as you can — late filings can carry IRS penalties.
            </>
          )}{" "}
          If you&apos;ve already filed, you&apos;re all set — or enter your newest fiscal year end to see the next deadline.
        </div>
      )}

      <div>
        <h3 className="text-lg">Before You File</h3>
        <ul className="mt-2 text-sm" style={{ paddingLeft: "1.1em", listStyle: "disc", color: "var(--ink-soft)" }}>
          <li style={{ marginBottom: "6px" }}>
            <b>Need more time?</b> File <b>Form 8868</b> by your original deadline for an automatic 6-month extension. It
            covers the 990 and 990-EZ only — there&apos;s no extension for the 990-N.
          </li>
          <li>
            <b>Never skip a year.</b> If an organization doesn&apos;t file for <b>three consecutive years</b>, the IRS
            automatically revokes its tax-exempt status. Getting it back means applying all over again.
          </li>
        </ul>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        The 990-N limit applies to gross receipts &ldquo;normally&rdquo; $50,000 or less — for organizations more than a few
        years old, the IRS looks at an average of recent years. Private foundations file Form 990-PF no matter their size,
        and churches are generally not required to file at all. A deadline on a weekend or federal holiday moves to the next
        business day. Many states require their own annual filing too. This is a planning tool, not tax advice — confirm
        with the IRS or a tax professional. Entries here live only in this browser.
      </p>
    </Card>
  );
}
