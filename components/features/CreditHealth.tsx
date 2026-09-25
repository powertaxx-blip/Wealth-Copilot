"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField, SelectField, DateField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { Tip } from "@/components/ui/Tip";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type CreditEntry,
  type CreditHealthState,
  type CreditKind,
  type CreditScale,
  CREDIT_HEALTH_STORAGE_KEY,
  DEFAULT_CREDIT_HEALTH,
  PERSONAL_SCALE,
  BUSINESS_SCALE,
  scoreBand,
  bureauLabel,
  sortEntries,
  summarize,
  validEntries,
  validateEntry,
  todayISO,
  formatEntryDate,
} from "@/lib/creditHealth";

/**
 * New panel — Credit Health Tracker. Two independent sections on one
 * page (personal and business), each a small log in the same list/CRUD
 * shape as Grant Tracking. Both render through CreditSection, configured
 * by a CreditScale (lib/creditHealth.ts) — the only differences between
 * them are the score range, bureaus, bands, and the copy passed in.
 * Self-reported only: nothing is fetched, and no SSN or tax ID is asked for.
 */

function toneColor(tone: "good" | "warning" | "critical"): string {
  return `var(--status-${tone})`;
}

function ChangeText({ points }: { points: number }) {
  if (points === 0) return <span style={{ color: "var(--muted)" }}>no change</span>;
  const up = points > 0;
  return (
    <span style={{ color: up ? "var(--status-good)" : "var(--status-critical)", fontWeight: 600 }}>
      {up ? "▲ up" : "▼ down"} {Math.abs(points)} point{Math.abs(points) === 1 ? "" : "s"}
    </span>
  );
}

function CreditSection({
  scale,
  title,
  lede,
  scoreLabel,
  headingTip,
  mentor,
  entries,
  onAdd,
  onRemove,
}: {
  scale: CreditScale;
  title: string;
  lede: string;
  scoreLabel: string;
  headingTip?: string;
  mentor: ReactNode;
  entries: CreditEntry[];
  onAdd: (e: Omit<CreditEntry, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [score, setScore] = useState(0);
  // The business scale starts at 0, so the field's default 0 is itself a
  // valid score — without this, clicking Add on an untouched form would
  // quietly log a "Poor" 0. Require the field to have been filled in.
  const [scoreEntered, setScoreEntered] = useState(false);
  const [bureau, setBureau] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => summarize(scale, entries), [scale, entries]);
  const sorted = useMemo(() => sortEntries(entries), [entries]);

  function add() {
    if (!scoreEntered) {
      setError(`Enter the score you saw (${scale.min}–${scale.max}).`);
      return;
    }
    const v = validateEntry(scale, date, score, todayISO());
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setError(null);
    onAdd({ date, score, bureau });
    setDate("");
    setScore(0);
    setScoreEntered(false);
  }

  return (
    <Card title={title} lede={lede}>
      <MentorNote>{mentor}</MentorNote>

      {summary.status === "empty" ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No scores logged yet — add your first one below.
        </p>
      ) : (
        <>
          <ResultBox
            label={`Most recent ${scoreLabel}`}
            big={String(summary.latest.score)}
            stats={[
              { v: summary.label, k: "Rating" },
              { v: formatEntryDate(summary.latest.date), k: "Checked" },
              { v: bureauLabel(scale, summary.latest.bureau) || "—", k: "Bureau" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3" style={{ display: "flex" }}>
            <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
            <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {summary.change === null ? (
                "Log another score later to see which way it's moving."
              ) : (
                <>
                  <ChangeText points={summary.change.points} /> since {formatEntryDate(summary.change.previous.date)} (
                  {summary.change.previous.score})
                  {!summary.change.sameBureau && (
                    <> — note these came from different bureaus, which score differently</>
                  )}
                </>
              )}
            </span>
          </div>
        </>
      )}

      <div className="flex items-center gap-2" style={{ display: "flex" }}>
        <h3 className="text-lg">Log a Score</h3>
        {headingTip && <Tip text={headingTip} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField label="Date checked" value={date} onChange={setDate} />
        <NumberField
          label={`Score (${scale.min}–${scale.max})`}
          value={score}
          onChange={(v) => {
            setScore(v);
            setScoreEntered(true);
          }}
          step={1}
        />
        <SelectField label="Bureau (optional)" value={bureau} onChange={setBureau} options={scale.bureaus} />
      </div>
      <div>
        <button className="btn gold" onClick={add}>
          + Add Score
        </button>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      {sorted.length > 0 && (
        <>
          <h3 className="text-lg">History — Most Recent First</h3>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Score</th>
                  <th>Rating</th>
                  <th>Bureau</th>
                  <th className="num">Change</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, i) => {
                  const band = scoreBand(scale, e.score);
                  const older = sorted[i + 1];
                  const diff = older ? e.score - older.score : null;
                  return (
                    <tr key={e.id}>
                      <td>{formatEntryDate(e.date)}</td>
                      <td className="num">{e.score}</td>
                      <td style={{ color: toneColor(band.tone), fontWeight: 600 }}>{band.label}</td>
                      <td>{bureauLabel(scale, e.bureau) || "—"}</td>
                      <td className="num">
                        {diff === null ? "—" : diff === 0 ? "0" : <ChangeText points={diff} />}
                      </td>
                      <td>
                        <button className="btn ghost" onClick={() => onRemove(e.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export function CreditHealth() {
  const [state, setState] = useLocalStorageState<CreditHealthState>(CREDIT_HEALTH_STORAGE_KEY, DEFAULT_CREDIT_HEALTH);

  // Memoized so each section's own useMemos only recompute when its
  // entries actually change.
  const personalEntries = useMemo(() => validEntries(state.personal), [state.personal]);
  const businessEntries = useMemo(() => validEntries(state.business), [state.business]);

  function addEntry(kind: CreditKind, e: Omit<CreditEntry, "id" | "createdAt">) {
    setState((s) => ({ ...s, [kind]: [...validEntries(s[kind]), { ...e, id: crypto.randomUUID(), createdAt: Date.now() }] }));
  }
  function removeEntry(kind: CreditKind, id: string) {
    setState((s) => ({ ...s, [kind]: validEntries(s[kind]).filter((e) => e.id !== id) }));
  }

  return (
    <div className="flex flex-col gap-6">
      <CreditSection
        scale={PERSONAL_SCALE}
        title="Personal Credit"
        lede="Look up your score wherever you already check it — Credit Karma, your bank, or a card's monthly statement — and log it here to watch the trend over time. Your personal credit still matters to a business owner: lenders often check it for a new business's loans and cards."
        scoreLabel="personal score"
        mentor={
          <>
            &quot;Signed, Sealed, Delivered I&apos;m Yours&quot; — Stevie Wonder could have been singing about a bill paid on
            time. Payment history is the biggest single piece of most personal credit scores, so the habit that matters most
            is the simplest one: every bill, every month, by its due date. Next comes keeping card balances under 30% of your
            limits — and lower is better still.
          </>
        }
        entries={personalEntries}
        onAdd={(e) => addEntry("personal", e)}
        onRemove={(id) => removeEntry("personal", id)}
      />

      <CreditSection
        scale={BUSINESS_SCALE}
        title="Business Credit"
        lede="Your business builds a credit file of its own, separate from yours. Log the score from Dun & Bradstreet, Experian Business, or Equifax Business to track how your business looks to lenders, suppliers, and landlords."
        scoreLabel="business score"
        headingTip="The Poor / Fair / Good / Excellent labels here follow the Dun & Bradstreet PAYDEX scale (0–100, where 80 means paying on time). Experian Business and Equifax Business use their own scales and cutoffs, so the same number can mean something different — compare scores from the same bureau over time."
        mentor={
          <>
            The Taittiriya Upanishad sends its students out into the world with two instructions: speak the truth, and do
            what&apos;s right. For business credit, your word is your payment terms. A PAYDEX score is built from how promptly
            you pay suppliers and vendors: paying on the due date earns about an 80, and paying early pushes it higher. Ask the
            vendors you already pay on time whether they report to the business credit bureaus, so the good habit actually
            shows up.
          </>
        }
        entries={businessEntries}
        onAdd={(e) => addEntry("business", e)}
        onRemove={(id) => removeEntry("business", id)}
      />

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Self-reported only: this page never connects to a credit bureau and never asks for a Social Security number or tax
        ID — just the score, the date, and where you saw it. Entries live only in this browser. Score ranges and ratings are
        general guides; each lender sets its own standards.
      </p>
    </div>
  );
}
