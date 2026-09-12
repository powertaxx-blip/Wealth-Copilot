"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WelcomeVideoLauncher } from "@/components/features/WelcomeVideo";
import { Tip } from "@/components/ui/Tip";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { useOrgType } from "@/lib/orgType";
import { readSnapshotData, type SnapshotData } from "@/lib/snapshot";
import { exportAllData, importAllData } from "@/lib/dataBackup";

/**
 * Redesigned Home page (see the design-critique conversation this shipped
 * from). The old version was a wall of thirteen identically-styled gold
 * buttons below a stale "Twelve panels are fully live" line — no
 * hierarchy, no sense of where a visitor actually stood, and a headcount
 * that was already wrong the moment Quiz/Snapshot/Wills/Trusts shipped.
 *
 * This version leans on lib/snapshot.ts's `readSnapshotData` — the same
 * read-only cross-panel read Snapshot itself uses — so "12 of 12 areas
 * complete" and each tile's Done/Not started pill are never hand-maintained
 * copy, just whatever's actually in the visitor's own browser.
 */

type Tile = {
  href: string;
  emoji: string;
  title: string;
  nonprofitTitle?: string;
  desc: string;
  help?: string;
  nonprofitHelp?: string;
  done?: (s: SnapshotData) => boolean;
};

type TrackedTile = Tile & { done: (s: SnapshotData) => boolean };

type Group = { label: string; tiles: Tile[] };

const GROUPS: Group[] = [
  {
    label: "Plan",
    tiles: [
      {
        href: "/budgeting",
        emoji: "💰",
        title: "Budgeting",
        desc: "Income and expenses by category, updated monthly.",
        help: "Budgeting means comparing what came in against what went out, by category, so surprises show up early.",
        done: (s) => s.budgeting.hasData,
      },
      {
        href: "/emergency",
        emoji: "🛟",
        title: "Emergency Fund",
        nonprofitTitle: "Operating Reserve",
        desc: "Target 3–6 months of expenses in reserve.",
        help: "Cash set aside — usually 3–6 months of expenses — for a job loss or surprise bill, kept separate from everyday spending.",
        nonprofitHelp: "Unrestricted cash a nonprofit keeps on hand to cover 3–6 months of expenses if a grant or donation is delayed.",
        done: (s) => s.reserve.hasData,
      },
      {
        href: "/investment",
        emoji: "💹",
        title: "Investment Fund",
        desc: "Holdings, contributions, and growth over time.",
        help: "Tracks what you've put into investments and how the balance has grown or shrunk since.",
        done: (s) => s.investments.hasData,
      },
      {
        href: "/breakeven",
        emoji: "📈",
        title: "Break-Even & Pricing",
        desc: "Find the price and volume that cover your costs.",
        help: "Break-even is the point where revenue exactly equals costs — sell below it and you lose money, above it you profit.",
        done: (s) => s.breakeven.hasData,
      },
    ],
  },
  {
    label: "File",
    tiles: [
      {
        href: "/estimator",
        emoji: "🧮",
        title: "Tax Estimator",
        desc: "Quarterly estimate with an AI-written explanation.",
        help: "Projects roughly what you'll owe for the year based on income so far, so a quarterly payment isn't a surprise.",
        done: (s) => s.estimator.hasData,
      },
      {
        href: "/mileage",
        emoji: "🚗",
        title: "Mileage Tracker",
        desc: "Business and volunteer miles, IRS rate applied.",
        help: "The IRS sets a standard cents-per-mile rate each year — this multiplies your logged miles by that rate to get your deduction.",
        done: (s) => s.mileage.hasData,
      },
      {
        href: "/bizexpenses",
        emoji: "💼",
        title: "Business Expenses",
        desc: "Log deductible costs, sorted for Schedule C.",
        help: "Anything you spend to run the business or organization — supplies, software, mileage — that can reduce what you owe in taxes.",
        done: (s) => s.bizExpenses.hasData,
      },
      {
        href: "/schedulec",
        emoji: "🧾",
        title: "Schedule C",
        desc: "Net profit, built from your income and expenses.",
        help: "Schedule C is the IRS form a sole proprietor files to report business profit or loss.",
        done: (s) => s.scheduleC.hasData,
      },
      {
        href: "/balance",
        emoji: "⚖️",
        title: "Balance Sheet",
        nonprofitTitle: "Statement of Financial Position",
        desc: "What you own and owe, at a glance.",
        help: "Lists what you own (assets) against what you owe (liabilities) at a single point in time.",
        nonprofitHelp: "A nonprofit's version of a balance sheet — what the organization owns versus what it owes, at a single point in time.",
        done: (s) => s.balanceSheet.hasData,
      },
      {
        href: "/invoices",
        emoji: "🧾",
        title: "Invoices & AR",
        nonprofitTitle: "Donation Receipts",
        desc: "Bill clients and track what's still owed.",
        help: "Accounts receivable (AR) is money clients owe you for work you've already billed.",
        nonprofitHelp: "The acknowledgment a donor needs to claim their gift as a tax deduction.",
        done: (s) => s.billing.hasData,
      },
      {
        href: "/budgeting",
        emoji: "💳",
        title: "Debt Payoff Planner",
        desc: "See which payoff order saves the most — built right into Budgeting.",
        help: "Snowball pays smallest balances first for quick wins; avalanche pays highest interest first to save the most money overall.",
        done: (s) => s.debt.hasData,
      },
    ],
  },
  {
    label: "Learn",
    tiles: [
      { href: "/filing", emoji: "📋", title: "Filing Status Guide", desc: "Searchable reference for how filing status works." },
      { href: "/faq", emoji: "💬", title: "FAQ", desc: "Plain-English answers to common questions." },
      {
        href: "/quiz",
        emoji: "🧠",
        title: "Financial IQ Quiz",
        desc: "A fresh set of questions every time you take it.",
        done: (s) => s.quiz.hasData,
      },
      { href: "/wills", emoji: "📜", title: "Wills & Estates", desc: "Fundamentals, plus an estate tax exposure estimate." },
      { href: "/trusts", emoji: "🏛️", title: "Trusts", desc: "When a trust fits, and which kind." },
    ],
  },
];

const TRACKED_TILES: TrackedTile[] = GROUPS.flatMap((g) => g.tiles).filter(
  (t): t is TrackedTile => typeof t.done === "function"
);
const TOTAL_TRACKED = 12; // matches lib/snapshot.ts's SnapshotData — 12 sections

export default function HomePage() {
  const router = useRouter();
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [ownerName, setOwnerName] = useLocalStorageState<string>("wc.ownerName", "");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  useEffect(() => {
    setSnapshot(readSnapshotData(nonprofit));
  }, [nonprofit]);

  const completedCount = snapshot
    ? [
        snapshot.budgeting.hasData,
        snapshot.reserve.hasData,
        snapshot.investments.hasData,
        snapshot.breakeven.hasData,
        snapshot.estimator.hasData,
        snapshot.mileage.hasData,
        snapshot.bizExpenses.hasData,
        snapshot.scheduleC.hasData,
        snapshot.balanceSheet.hasData,
        snapshot.billing.hasData,
        snapshot.debt.hasData,
        snapshot.quiz.hasData,
      ].filter(Boolean).length
    : 0;
  const percent = Math.round((completedCount / TOTAL_TRACKED) * 100);
  const nextTile = snapshot ? TRACKED_TILES.find((t) => !t.done(snapshot)) : undefined;

  const checklistSteps = [
    { label: "Log your first month of expenses in Budgeting", href: "/budgeting", done: snapshot?.budgeting.hasData ?? false },
    {
      label: nonprofit ? "Add one volunteer trip to Mileage Tracker" : "Add one trip to Mileage Tracker",
      href: "/mileage",
      done: snapshot?.mileage.hasData ?? false,
    },
    { label: "Take the Financial IQ Quiz", href: "/quiz", done: snapshot?.quiz.hasData ?? false },
  ];
  const allStepsDone = checklistSteps.every((s) => s.done);

  return (
    <div className="flex flex-col gap-6">
      <div className="card home-hero">
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div className="owner-name-row">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {ownerName ? `Welcome back, ${ownerName}` : "Welcome back"}
            </span>
            {!editingName && (
              <button
                type="button"
                className="owner-name-edit"
                onClick={() => {
                  setNameDraft(ownerName);
                  setEditingName(true);
                }}
              >
                {ownerName ? "✎ Edit name" : "+ Add your name"}
              </button>
            )}
            {editingName && (
              <form
                className="owner-name-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setOwnerName(nameDraft.trim());
                  setEditingName(false);
                }}
              >
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="e.g. Maria's Bakery"
                  aria-label="Your name or business nickname"
                />
                <button type="submit" className="btn gold" style={{ padding: "6px 12px", fontSize: "12.5px" }}>
                  Save
                </button>
              </form>
            )}
            <WelcomeVideoLauncher />
          </div>
          <h2 className="text-2xl">Here&apos;s where things stand.</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            Every tool below is live — no placeholders. Pick up where you left off, or jump straight to what you need.
          </p>
        </div>

        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 8, minWidth: 190 }}>
          <span className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
            <b style={{ color: "var(--ink)" }}>{completedCount}</b> of {TOTAL_TRACKED} areas complete
          </span>
          <div className="progress-track">
            <span className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {snapshot && nextTile && (
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <Link href={nextTile.href} className="btn gold" style={{ textAlign: "center" }}>
              Continue: {(nonprofit && nextTile.nonprofitTitle) || nextTile.title} →
            </Link>
            <small style={{ color: "var(--muted)", textAlign: "center" }}>Your next incomplete area</small>
          </div>
        )}
        {snapshot && !nextTile && (
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <Link href="/snapshot" className="btn gold" style={{ textAlign: "center" }}>
              View your Snapshot →
            </Link>
            <small style={{ color: "var(--muted)", textAlign: "center" }}>Everything's filled in</small>
          </div>
        )}
      </div>

      {!allStepsDone && (
        <div className="home-checklist">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base" style={{ fontFamily: "var(--font-display)" }}>
              Getting started
            </h3>
            <span className="text-[13px]" style={{ color: "var(--muted)" }}>
              {checklistSteps.filter((s) => s.done).length} of {checklistSteps.length} done
            </span>
          </div>
          <ul>
            {checklistSteps.map((step) => (
              <li key={step.href + step.label} className={step.done ? "done" : ""}>
                <span className="box">{step.done ? "✓" : ""}</span>
                {step.done ? (
                  <span className="label">{step.label}</span>
                ) : (
                  <Link href={step.href} style={{ color: "var(--ink)", textDecoration: "none" }}>
                    {step.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Checked automatically from what you've actually entered — this card disappears once all three are done.
          </p>
        </div>
      )}

      {GROUPS.map((group) => (
        <div key={group.label} className="home-group">
          <h3>{group.label}</h3>
          <div className="home-tile-grid">
            {group.tiles.map((tile) => {
              const title = (nonprofit && tile.nonprofitTitle) || tile.title;
              const help = (nonprofit && tile.nonprofitHelp) || tile.help;
              const isDone = snapshot && tile.done ? tile.done(snapshot) : undefined;
              return (
                // A plain div, not <Link>, on purpose: the Tip button below
                // is a real <button>, and HTML doesn't allow interactive
                // content (a button) nested inside another interactive
                // element (an anchor). role="link" + a click/Enter handler
                // keeps it operable by mouse and keyboard without that
                // invalid nesting — Tip's own onClick already stops
                // propagation, so tapping "?" opens the explanation instead
                // of also navigating.
                <div
                  key={tile.href + tile.title}
                  className="home-tile"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(tile.href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(tile.href);
                  }}
                >
                  <div className="top">
                    <div className="chip">{tile.emoji}</div>
                    {isDone !== undefined && (
                      <span className={`status-pill ${isDone ? "good" : "neutral"}`}>{isDone ? "Done" : "Not started"}</span>
                    )}
                  </div>
                  <div className="title">
                    {title}
                    {help && <Tip text={help} />}
                  </div>
                  <div className="desc">{tile.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="home-databar">
        <div>
          <strong className="text-[13.5px]">Your data</strong>
          <p>Everything you enter stays in this browser only — nothing is uploaded. Keep a copy just in case.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn ghost" onClick={() => exportAllData()}>
            ⬇ Download my data
          </button>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            ⬆ Restore from file
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const result = await importAllData(file);
                setImportMsg(
                  result.error ?? `Restored ${result.restoredKeys} saved item${result.restoredKeys === 1 ? "" : "s"}. Reloading…`
                );
                if (!result.error) {
                  setTimeout(() => window.location.reload(), 1200);
                }
              }}
            />
          </label>
        </div>
        {importMsg && (
          <p className="w-full text-xs" style={{ color: "var(--muted)" }}>
            {importMsg}
          </p>
        )}
      </div>
    </div>
  );
}
