"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, NumberField, SelectField, CheckboxField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Contractor,
  type ContractorsState,
  CONTRACTORS_STORAGE_KEY,
  DEFAULT_CONTRACTORS_STATE,
  nec1099Threshold,
  nec1099DueDate,
  contractorStatus,
  calcContractorTotals,
  validContractors,
} from "@/lib/contractors";

/**
 * New panel — 1099 Contractor Tracker. Same list/CRUD shape as Grant
 * Tracking and Employees & Payroll. See lib/contractors.ts for the rules
 * (threshold by tax year, card/app payments, corporations vs. attorneys)
 * and the January 31 due date. Visible to every org type.
 */

type Draft = Omit<Contractor, "id">;

const BLANK_DRAFT: Draft = { name: "", amountPaid: 0, w9OnFile: false, paidByCardOrApp: false, isCorporation: false, isAttorney: false };

function formatDue(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function Contractors() {
  const [raw, setState] = useLocalStorageState<ContractorsState>(CONTRACTORS_STORAGE_KEY, DEFAULT_CONTRACTORS_STATE);
  const state: ContractorsState = useMemo(
    () => ({
      taxYear: Number.isInteger(raw.taxYear) ? raw.taxYear : DEFAULT_CONTRACTORS_STATE.taxYear,
      contractors: validContractors(raw.contractors),
    }),
    [raw.taxYear, raw.contractors]
  );
  const { contractors } = state;

  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT);
  const [nameError, setNameError] = useState(false);

  const threshold = nec1099Threshold(state.taxYear);
  const totals = useMemo(() => calcContractorTotals(state), [state]);
  const due = nec1099DueDate(state.taxYear);
  const thisYear = new Date().getFullYear();
  // This year and the two before — plus a saved year that's older still,
  // so the dropdown never shows a year that doesn't match the data.
  const years = Array.from(new Set([thisYear, thisYear - 1, thisYear - 2, state.taxYear])).sort((a, b) => b - a);
  const yearOptions = years.map((y) => ({ value: String(y), label: `Payments made in ${y}` }));

  function update(id: string, patch: Partial<Contractor>) {
    setState((s) => ({ ...s, contractors: validContractors(s.contractors).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }
  function remove(id: string) {
    setState((s) => ({ ...s, contractors: validContractors(s.contractors).filter((c) => c.id !== id) }));
  }
  function add() {
    if (!draft.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setState((s) => ({
      ...s,
      contractors: [...validContractors(s.contractors), { ...draft, name: draft.name.trim(), isAttorney: draft.isCorporation && draft.isAttorney, id: crypto.randomUUID() }],
    }));
    setDraft(BLANK_DRAFT);
  }

  return (
    <Card
      title="1099 Contractors"
      lede="Everyone you paid as an independent contractor this year, whether you have their W-9, and which of them need a Form 1099-NEC — so January 31 isn't a scramble."
    >
      <MentorNote>
        Smokey Robinson &amp; the Miracles put it in a song title: &quot;Shop Around.&quot; Do that before you hire — and
        before you pay anyone, get their W-9. A contractor you can&apos;t reach in January is a 1099 you can&apos;t file,
        and asking for the form up front is a lot easier than chasing it down after the work is done.
      </MentorNote>

      <SelectField
        label="Tax year"
        value={String(state.taxYear)}
        onChange={(v) => setState((s) => ({ ...s, taxYear: Number(v) }))}
        options={yearOptions}
      />
      <p className="text-sm" style={{ color: "var(--ink-soft)", marginTop: "-8px" }}>
        For payments made in {state.taxYear}, a contractor needs a 1099-NEC once you&apos;ve paid them{" "}
        <b>{fmt(threshold.amount)} or more</b>. {threshold.note}
      </p>

      <h3 className="text-lg">Add a Contractor</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name or business name"
          value={draft.name}
          onChange={(v) => {
            setDraft((d) => ({ ...d, name: v }));
            if (v.trim()) setNameError(false);
          }}
          placeholder="e.g., Rivera Web Design"
        />
        <NumberField
          label={`Total paid in ${state.taxYear} ($)`}
          value={draft.amountPaid}
          onChange={(v) => setDraft((d) => ({ ...d, amountPaid: v }))}
          step={100}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField label="W-9 on file" checked={draft.w9OnFile} onChange={(v) => setDraft((d) => ({ ...d, w9OnFile: v }))} />
        <CheckboxField
          label="Paid only by card or a payment app"
          checked={draft.paidByCardOrApp}
          onChange={(v) => setDraft((d) => ({ ...d, paidByCardOrApp: v }))}
          hint="Credit card, PayPal, Venmo business and similar — those report on a 1099-K instead."
        />
        <CheckboxField
          label="They're a corporation (C or S corp)"
          checked={draft.isCorporation}
          onChange={(v) => setDraft((d) => ({ ...d, isCorporation: v, isAttorney: v ? d.isAttorney : false }))}
          hint="Check their W-9. An LLC taxed as a corporation counts; a single-member LLC usually doesn't."
        />
        {draft.isCorporation && (
          <CheckboxField
            label="They're an attorney or law firm"
            checked={draft.isAttorney}
            onChange={(v) => setDraft((d) => ({ ...d, isAttorney: v }))}
            hint="Legal services get a 1099 even when the firm is incorporated."
          />
        )}
      </div>
      <div>
        <button className="btn gold" onClick={add}>
          + Add Contractor
        </button>
      </div>
      {nameError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          Enter a name before adding the contractor.
        </p>
      )}

      <h3 className="text-lg">Your Contractors — {state.taxYear}</h3>
      {contractors.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No contractors logged yet — add your first one above.
        </p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th className="num">Paid</th>
                <th>W-9</th>
                <th>1099-NEC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((c) => {
                const s = contractorStatus(c, threshold.amount);
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num">
                      <input
                        type="number"
                        aria-label={`Amount paid to ${c.name}`}
                        value={c.amountPaid}
                        min={0}
                        step={100}
                        onChange={(e) => update(c.id, { amountPaid: Math.max(0, parseFloat(e.target.value) || 0) })}
                        style={{ width: "110px", textAlign: "right", padding: "4px 6px", border: "1px solid var(--line)", borderRadius: "6px", background: "var(--bg)", color: "var(--ink)" }}
                      />
                    </td>
                    <td>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="checkbox" checked={c.w9OnFile} onChange={(e) => update(c.id, { w9OnFile: e.target.checked })} style={{ width: "auto" }} />
                        {c.w9OnFile ? "On file" : <span style={{ color: s.needs1099 ? "var(--status-critical)" : "var(--muted)" }}>Missing</span>}
                      </label>
                    </td>
                    <td>
                      {s.needs1099 ? <StatusPill tone={s.missingW9 ? "critical" : "warning"}>Needed</StatusPill> : <StatusPill tone="good">Not required</StatusPill>}
                      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                        {s.reason}
                      </div>
                    </td>
                    <td>
                      <button className="btn ghost" onClick={() => remove(c.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ResultBox
        label={`1099-NECs to file for ${state.taxYear}`}
        big={`${totals.needing1099} of ${totals.count}`}
        stats={[
          { v: fmt(totals.totalPaid), k: "Paid to contractors" },
          { v: String(totals.missingW9), k: "Still need a W-9" },
          { v: formatDue(due).replace(/^\w+, /, ""), k: "Due to IRS & contractors" },
        ]}
      />
      {totals.missingW9 > 0 && (
        <div className="note" style={{ borderLeftColor: "var(--status-critical)", margin: 0 }}>
          <b>
            {totals.missingW9} contractor{totals.missingW9 === 1 ? "" : "s"} still need{totals.missingW9 === 1 ? "s" : ""} a W-9.
          </b>{" "}
          You need their taxpayer ID from the W-9 to file their 1099-NEC — request it now, not in January.
        </div>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        1099-NECs are due by {formatDue(due)} — to the IRS and a copy to each contractor. This tracker covers payments for
        services (1099-NEC); rent, prizes and some other payments go on a 1099-MISC instead. Payments to employees go on a
        W-2 through Employees &amp; Payroll, not here. This is a planning tool, not tax advice. Entries live only in this
        browser.
      </p>
    </Card>
  );
}
