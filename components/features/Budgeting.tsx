"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS `calcBudget()` panel — the 50/30/20
 * planner half of the original combined Budgeting panel (the Debt
 * Payoff Planner half was already ported separately; this file only
 * covers the half that was still marked "not ported yet" in
 * app/budgeting/page.tsx). Same three buckets, same field lists, same
 * bar-vs-guideline visualization — built with plain styled <div>s
 * against the existing --gold/--navy-2/--status-good tokens rather
 * than new global CSS classes, the same approach EmergencyFund.tsx
 * already established for its progress bar.
 *
 * Nonprofit Mode (lib/orgType.ts) doesn't just relabel this panel — a
 * 501(c)(3) doesn't budget "Needs/Wants/Savings," it reports expenses
 * in the three functional categories the IRS Form 990 actually asks
 * for: Program Services, Management & General, and Fundraising. So the
 * whole shape carries over (three buckets, one guideline split, one bar
 * per bucket) but the buckets themselves, their field lists, and the
 * guideline percentages are genuinely different — 65/20/15 is the
 * split charity watchdogs like the BBB Wise Giving Alliance look for,
 * not a stand-in for 50/30/20. Both field sets live in state at all
 * times (see BalanceSheet.tsx for why) so toggling Nonprofit Mode never
 * loses either version of a user's numbers.
 */

type FieldDef = { id: string; label: string };
type GroupValues = Record<string, number>;
type GroupDef = { key: string; label: string; fields: FieldDef[] };

const FOR_PROFIT_GROUPS: GroupDef[] = [
  {
    key: "needs",
    label: "Needs",
    fields: [
      { id: "housing", label: "Housing / Rent or Mortgage" },
      { id: "utilities", label: "Utilities" },
      { id: "groceries", label: "Groceries" },
      { id: "transportation", label: "Transportation" },
      { id: "insurance", label: "Insurance" },
      { id: "mindebt", label: "Minimum Debt Payments" },
      { id: "otherneeds", label: "Other Needs" },
    ],
  },
  {
    key: "wants",
    label: "Wants",
    fields: [
      { id: "dining", label: "Dining Out" },
      { id: "entertainment", label: "Entertainment" },
      { id: "subscriptions", label: "Subscriptions" },
      { id: "shopping", label: "Shopping" },
      { id: "otherwants", label: "Other Wants" },
    ],
  },
  {
    key: "savings",
    label: "Savings",
    fields: [
      { id: "emergency", label: "Emergency Fund" },
      { id: "retirement", label: "Retirement" },
      { id: "othersavings", label: "Other Savings" },
    ],
  },
];

const FOR_PROFIT_GUIDELINE: Record<string, number> = { needs: 50, wants: 30, savings: 20 };

const NONPROFIT_GROUPS: GroupDef[] = [
  {
    key: "program",
    label: "Program Services",
    fields: [
      { id: "programstaff", label: "Program Staff Salaries" },
      { id: "programsupplies", label: "Program Supplies & Materials" },
      { id: "directassistance", label: "Direct Client Assistance" },
      { id: "programfacility", label: "Program Facility Costs" },
      { id: "otherprogram", label: "Other Program Costs" },
    ],
  },
  {
    key: "mgmt",
    label: "Management & General",
    fields: [
      { id: "adminsalaries", label: "Administrative Salaries" },
      { id: "officeoverhead", label: "Office & Admin Overhead" },
      { id: "insurancelegal", label: "Insurance & Legal" },
      { id: "accountingaudit", label: "Accounting & Audit Fees" },
      { id: "othermgmt", label: "Other Management & General" },
    ],
  },
  {
    key: "fundraising",
    label: "Fundraising",
    fields: [
      { id: "fundraisingstaff", label: "Fundraising Staff / Consultants" },
      { id: "fundraisingevents", label: "Fundraising Events" },
      { id: "donorcomms", label: "Donor Communications / Mailings" },
      { id: "grantwriting", label: "Grant-Writing Costs" },
      { id: "otherfundraising", label: "Other Fundraising Costs" },
    ],
  },
];

const NONPROFIT_GUIDELINE: Record<string, number> = { program: 65, mgmt: 20, fundraising: 15 };

const BAR_COLORS = ["var(--gold)", "var(--navy-2)", "var(--status-good)"];

function zeroGroup(fields: FieldDef[]): GroupValues {
  return Object.fromEntries(fields.map((f) => [f.id, 0]));
}

type BudgetState = {
  // Kept separate per mode — like BalanceSheet.tsx's contrib/retained/draws
  // vs. netWithoutRestriction/netWithRestriction — so toggling Nonprofit
  // Mode can never overwrite one income figure with the other.
  forProfitIncome: number;
  nonprofitIncome: number;
  forProfit: Record<string, GroupValues>;
  nonprofit: Record<string, GroupValues>;
};

const initial: BudgetState = {
  forProfitIncome: 0,
  nonprofitIncome: 0,
  forProfit: {
    needs: zeroGroup(FOR_PROFIT_GROUPS[0].fields),
    wants: zeroGroup(FOR_PROFIT_GROUPS[1].fields),
    savings: zeroGroup(FOR_PROFIT_GROUPS[2].fields),
  },
  nonprofit: {
    program: zeroGroup(NONPROFIT_GROUPS[0].fields),
    mgmt: zeroGroup(NONPROFIT_GROUPS[1].fields),
    fundraising: zeroGroup(NONPROFIT_GROUPS[2].fields),
  },
};

export function Budgeting() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [state, setState] = useLocalStorageState<BudgetState>("wc.budgeting", initial);

  const bucket = nonprofit ? "nonprofit" : "forProfit";
  const groups = nonprofit ? NONPROFIT_GROUPS : FOR_PROFIT_GROUPS;
  const guideline = nonprofit ? NONPROFIT_GUIDELINE : FOR_PROFIT_GUIDELINE;
  const values = state[bucket];
  const keyMetricGroup = nonprofit ? "program" : "savings";
  const income = nonprofit ? state.nonprofitIncome : state.forProfitIncome;

  const setIncome = (v: number) =>
    setState((s) => (nonprofit ? { ...s, nonprofitIncome: v } : { ...s, forProfitIncome: v }));
  const setField = (groupKey: string, fieldId: string, v: number) =>
    setState((s) => ({
      ...s,
      [bucket]: { ...s[bucket], [groupKey]: { ...s[bucket][groupKey], [fieldId]: v } },
    }));

  const r = useMemo(() => {
    const sums: Record<string, number> = {};
    groups.forEach((g) => {
      sums[g.key] = Object.values(values[g.key] ?? {}).reduce((a, b) => a + (b || 0), 0);
    });
    const totalSpent = Object.values(sums).reduce((a, b) => a + b, 0);
    const remaining = income - totalSpent;
    const pct = (key: string) => (income > 0 ? (sums[key] / income) * 100 : 0);
    return { sums, totalSpent, remaining, pct };
  }, [groups, values, income]);

  const keyMetricPct = r.pct(keyMetricGroup);
  const keyMetricGuideline = guideline[keyMetricGroup];

  let tone: "good" | "warning" | "critical" = "critical";
  let statusText = "";
  if (income > 0) {
    if (r.remaining < 0) {
      tone = "critical";
      statusText = nonprofit
        ? `⚠ Deficit of ${fmt(Math.abs(r.remaining))}`
        : `⚠ Over budget by ${fmt(Math.abs(r.remaining))}`;
    } else if (keyMetricPct >= keyMetricGuideline) {
      tone = "good";
      statusText = nonprofit
        ? `✓ Hitting the ${keyMetricGuideline}% program-spending guideline`
        : `✓ Hitting the ${keyMetricGuideline}% savings guideline`;
    } else {
      tone = "warning";
      statusText = nonprofit
        ? `Under the ${keyMetricGuideline}% program-spending guideline`
        : `Under the ${keyMetricGuideline}% savings guideline`;
    }
  }

  return (
    <Card
      title={nonprofit ? "Functional Expense Budget" : "Budgeting — the 50/30/20 Plan"}
      lede={
        nonprofit
          ? "Nonprofits report expenses in three functional categories on Form 990: Program Services, Management & General, and Fundraising. Charity watchdogs generally look for at least 65% going to programs — enter your real numbers below and see exactly where you stand against that guideline."
          : "One guideline, three buckets: roughly 50% of take-home pay to Needs, 30% to Wants, 20% to Savings. Enter your real numbers below and see exactly where you stand against that guideline — not as a rule to obey blindly, but as a mirror to look into."
      }
    >
      <MentorNote>
        {nonprofit ? (
          <>
            Harold Melvin &amp; The Blue Notes sang &quot;the world won&apos;t get no better if we just let it
            be&quot; — a functional expense budget is how a nonprofit takes that seriously: proving, dollar for
            dollar, that the mission comes before the overhead.
          </>
        ) : (
          <>
            Curtis Mayfield sang &quot;people get ready&quot; — a budget is exactly that: getting ready before
            the storm, not scrambling during it. The plan isn&apos;t about restriction, it&apos;s about knowing
            where every dollar is going before it goes there.
          </>
        )}
      </MentorNote>

      <NumberField
        label={nonprofit ? "Monthly revenue (donations, grants, program income)" : "Monthly take-home income (after tax)"}
        value={income}
        onChange={setIncome}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.key}>
            <h3 className="text-lg" style={{ marginTop: 0 }}>
              {g.label}
            </h3>
            <div className="flex flex-col gap-3">
              {g.fields.map((f) => (
                <NumberField
                  key={f.id}
                  label={f.label}
                  value={values[g.key]?.[f.id] ?? 0}
                  onChange={(v) => setField(g.key, f.id, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted)" }}>
        {groups.map((g, i) => (
          <span key={g.key} className="flex items-center gap-1.5">
            <span
              style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: BAR_COLORS[i] }}
            />
            {g.label} · guideline {guideline[g.key]}%
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-3">
        {groups.map((g, i) => {
          const p = r.pct(g.key);
          const guide = guideline[g.key];
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{g.label}</span>
                <span>
                  {fmt(r.sums[g.key])} ({p.toFixed(0)}%)
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 12,
                  borderRadius: 999,
                  background: "var(--line-soft)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, p)}%`,
                    background: BAR_COLORS[i],
                    transition: "width 0.2s ease",
                  }}
                />
                <div
                  title={`${guide}% guideline`}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${Math.min(100, guide)}%`,
                    width: 2,
                    background: "var(--ink)",
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ResultBox
        label={r.remaining < 0 ? (nonprofit ? "Deficit" : "Shortfall") : nonprofit ? "Unallocated revenue remaining" : "Unassigned income left over"}
        big={fmt(Math.abs(r.remaining))}
        stats={groups.map((g) => ({ v: fmt(r.sums[g.key]), k: g.label }))}
      />

      {income > 0 && (
        <div className="mt-3">
          <StatusPill tone={tone}>{statusText}</StatusPill>
        </div>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        {nonprofit
          ? "65/20/15 is a common efficiency guideline cited by charity watchdogs like the BBB Wise Giving Alliance — not a strict law, and newer or smaller organizations often need a different split while building infrastructure. The point is to make the split a conscious, defensible choice."
          : "50/30/20 is a starting guideline, not a law — high cost-of-living areas or heavy debt payoff plans often need a different split. The point is to make the split a conscious choice."}
      </p>
    </Card>
  );
}
