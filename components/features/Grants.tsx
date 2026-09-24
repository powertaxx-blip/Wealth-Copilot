"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { TermDictionary, type Term } from "@/components/features/TermDictionary";
import { GrantWritingTool } from "@/components/features/GrantWriting";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Grant,
  type GrantsState,
  GRANTS_STORAGE_KEY,
  DEFAULT_GRANTS_STATE,
  GRANT_STATUS_OPTIONS,
  blankGrant,
  grantStatusTone,
  grantsSortedByDeadline,
  calcGrantTotals,
} from "@/lib/grants";

/**
 * New panel — a nonprofit's grant pipeline, from first research through
 * a funder's decision. See lib/grants.ts's file header for how this
 * differs from Invoices/Donation Receipts and from Balance Sheet's
 * "Pledges / grants receivable" line. Same list/CRUD shape as Employees
 * & Payroll: an array of records in local storage, add/remove handlers,
 * totals derived with useMemo.
 */

const GRANT_TERMS: Term[] = [
  {
    term: "Funder",
    definition: "The foundation, government agency, or corporation that gives out the grant money.",
    whyItMatters:
      "Every funder has its own priorities, deadlines, and reporting rules — the same project pitched to two different funders often needs two different applications.",
  },
  {
    term: "Amount Requested",
    definition: "What you asked for in the application — not what you'll necessarily receive.",
    whyItMatters:
      "Funders frequently award less than requested. Tracking the gap between requested and awarded across every grant shows whether that's a pattern worth planning around.",
  },
  {
    term: "Amount Awarded",
    definition: "What the funder actually committed to give, once a decision is made in your favor.",
    whyItMatters: "This is the number that belongs in your budget and cash-flow planning — the requested amount never is, until it's decided.",
  },
  {
    term: "Restricted vs. Unrestricted Funds",
    definition:
      "A restricted grant can only be spent on what the funder specified (a program, a purchase); unrestricted funds can be spent on anything the organization needs.",
    whyItMatters:
      "This is the same split behind Balance Sheet's \"With / Without Donor Restrictions\" net assets — an awarded grant almost always lands in one of those two buckets, not as generic cash.",
  },
  {
    term: "Match Requirement",
    definition: "Some grants require the organization to raise or contribute a portion of the project cost itself before the funder releases its share.",
    whyItMatters:
      "A grant with a match requirement isn't free money for the full requested amount — skipping this line when budgeting a project is a common first-time mistake.",
  },
  {
    term: "Letter of Intent (LOI)",
    definition: "A short pre-application many funders require before inviting a full proposal — a summary of the project and the ask.",
    whyItMatters:
      "Treating an LOI as a formality instead of a real pitch is a common way a promising grant never makes it to the full application stage.",
  },
  {
    term: "Reporting Requirement",
    definition: "What a funder requires after a grant is awarded — usually a written report on how the money was spent and what it achieved.",
    whyItMatters:
      "Missing a reporting deadline can jeopardize future funding from that same funder, even after the original grant was already spent well.",
  },
];

export function GrantTracking() {
  const [state, setState] = useLocalStorageState<GrantsState>(GRANTS_STORAGE_KEY, DEFAULT_GRANTS_STATE);
  const [draft, setDraft] = useState<Omit<Grant, "id">>({
    grantName: "",
    funderName: "",
    amountRequested: 0,
    amountAwarded: 0,
    applicationDeadline: "",
    decisionDate: "",
    status: "researching",
  });
  const [nameError, setNameError] = useState(false);

  function addGrant() {
    if (!draft.grantName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setState((s) => ({
      ...s,
      grants: [
        ...s.grants,
        {
          ...blankGrant(),
          ...draft,
          grantName: draft.grantName.trim(),
          funderName: draft.funderName.trim(),
        },
      ],
    }));
    setDraft({
      grantName: "",
      funderName: "",
      amountRequested: 0,
      amountAwarded: 0,
      applicationDeadline: "",
      decisionDate: "",
      status: "researching",
    });
  }

  function removeGrant(id: string) {
    setState((s) => ({ ...s, grants: s.grants.filter((g) => g.id !== id) }));
  }

  function updateStatus(id: string, status: Grant["status"]) {
    setState((s) => ({ ...s, grants: s.grants.map((g) => (g.id === id ? { ...g, status } : g)) }));
  }

  const sortedGrants = useMemo(() => grantsSortedByDeadline(state.grants), [state.grants]);
  const totals = useMemo(() => calcGrantTotals(state.grants), [state.grants]);

  return (
    <div className="flex flex-col gap-6">
    <Card
      title="Grant Tracking"
      lede="Every grant you're researching, drafting, or waiting on a decision for, in one pipeline — plus what's already come through. Sorted by whichever deadline is coming up next, so nothing slips past."
    >
      <MentorNote>
        The Bhagavad Gita teaches that you have a right to your labor, but never to the fruits of it — a fitting
        reminder for grant-seeking specifically: a well-researched funder, a carefully drafted proposal, and a
        submission made on time are the work that's actually yours to control. The funder&apos;s decision never
        is, so it&apos;s worth tracking the pipeline itself, not just waiting on the answer.
      </MentorNote>

      <h3 className="text-lg">Add a Grant</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Grant name"
          value={draft.grantName}
          onChange={(v) => {
            setDraft((d) => ({ ...d, grantName: v }));
            if (v.trim()) setNameError(false);
          }}
          placeholder="e.g., Community Impact Fund"
        />
        <TextField
          label="Funder name"
          value={draft.funderName}
          onChange={(v) => setDraft((d) => ({ ...d, funderName: v }))}
          placeholder="e.g., Chester County Community Foundation"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Amount requested ($)"
          value={draft.amountRequested}
          onChange={(v) => setDraft((d) => ({ ...d, amountRequested: v }))}
          step={100}
        />
        <NumberField
          label="Amount awarded ($)"
          value={draft.amountAwarded}
          onChange={(v) => setDraft((d) => ({ ...d, amountAwarded: v }))}
          step={100}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Application deadline"
          value={draft.applicationDeadline}
          onChange={(v) => setDraft((d) => ({ ...d, applicationDeadline: v }))}
          placeholder="e.g., 2026-03-15"
        />
        <TextField
          label="Decision date"
          value={draft.decisionDate}
          onChange={(v) => setDraft((d) => ({ ...d, decisionDate: v }))}
          placeholder="e.g., 2026-05-01"
        />
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(v) => setDraft((d) => ({ ...d, status: v as Grant["status"] }))}
          options={GRANT_STATUS_OPTIONS}
        />
      </div>
      <div>
        <button className="btn gold" onClick={addGrant}>
          + Add Grant
        </button>
      </div>
      {nameError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          Enter a grant name before adding it.
        </p>
      )}

      <h3 className="text-lg">Your Grants — by Upcoming Deadline</h3>
      {sortedGrants.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No grants logged yet — add your first one above.
        </p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table>
            <thead>
              <tr>
                <th>Grant</th>
                <th>Funder</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Decision Date</th>
                <th className="num">Requested</th>
                <th className="num">Awarded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedGrants.map((g) => {
                const tone = grantStatusTone(g.status);
                const toneBg =
                  tone === "good" ? "var(--status-good-bg)" : tone === "warning" ? "var(--status-warning-bg)" : tone === "critical" ? "var(--status-critical-bg)" : "var(--line-soft)";
                const toneColor =
                  tone === "good" ? "var(--status-good)" : tone === "warning" ? "var(--status-warning)" : tone === "critical" ? "var(--status-critical)" : "var(--muted)";
                return (
                <tr key={g.id}>
                  <td>{g.grantName}</td>
                  <td>{g.funderName || "—"}</td>
                  <td>
                    <select
                      value={g.status}
                      onChange={(e) => updateStatus(g.id, e.target.value as Grant["status"])}
                      style={{
                        width: "auto",
                        padding: "4px 10px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        borderRadius: "999px",
                        border: "none",
                        background: toneBg,
                        color: toneColor,
                      }}
                    >
                      {GRANT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{g.applicationDeadline || "—"}</td>
                  <td>{g.decisionDate || "—"}</td>
                  <td className="num">{fmt(g.amountRequested)}</td>
                  <td className="num">{g.status === "awarded" ? fmt(g.amountAwarded) : "—"}</td>
                  <td>
                    <button className="btn ghost" onClick={() => removeGrant(g.id)}>
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
        label="Total requested vs. awarded"
        big={`${fmt(totals.totalAwarded)} awarded`}
        stats={[
          { v: fmt(totals.totalRequested), k: "Total requested" },
          { v: String(totals.pendingCount), k: "Pending a decision" },
          { v: totals.awardRatePct === null ? "N/A" : `${totals.awardRatePct.toFixed(0)}%`, k: "Award rate (of decided)" },
        ]}
      />

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        A planning tool for your own pipeline — it doesn&apos;t submit anything to a funder or track compliance
        reporting. Entries here live only in this browser for now — nothing is saved to an account or synced yet.
      </p>

      <TermDictionary
        terms={GRANT_TERMS}
        title="Grant Tracking Term Dictionary"
        description="Every technical term on this page, in plain English — and why each one is actually worth understanding, not just memorizing."
      />
    </Card>

    {/* Grant Writing Tool — same page, no separate nav item. Gets this
        panel's own grants list so a grant added above appears there
        immediately (see GrantWriting.tsx's header). */}
    <GrantWritingTool grants={state.grants} />
    </div>
  );
}
