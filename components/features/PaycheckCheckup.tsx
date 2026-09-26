"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { NumberField, SelectField, CheckboxField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { Tip } from "@/components/ui/Tip";
import { TermDictionary, type Term } from "@/components/features/TermDictionary";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { type FilingStatus } from "@/lib/tax";
import { US_STATES, type USState } from "@/lib/stateTax";
import {
  runPaycheckCheckup,
  PAY_FREQUENCY_OPTIONS,
  DEFAULT_PAYCHECK_CHECKUP,
  PAYCHECK_CHECKUP_STORAGE_KEY,
  ELECTIVE_DEFERRAL_LIMIT_2025,
  IRA_LIMIT_2025,
  HSA_SELF_ONLY_LIMIT_2025,
  HSA_FAMILY_LIMIT_2025,
  type PaycheckCheckupInput,
  type PayFrequency,
} from "@/lib/paycheckCheckup";

/**
 * Paycheck Checkup — the employee's own self-service counterpart to
 * Employees & Payroll (that panel is what a business owner sees looking
 * at everyone on the payroll; this one is what a single employee fills
 * out about their own paycheck). See lib/paycheckCheckup.ts's file
 * header for exactly what's being computed and which IRS sources back
 * each number — this file is UI only, no tax math lives here.
 *
 * "Paycheck Checkup" is deliberately the same name the IRS itself has
 * used for this exact idea (checking your W-4 against your real
 * situation) — borrowing familiar language on purpose.
 */

const STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married Filing Jointly" },
  { value: "mfs", label: "Married Filing Separately" },
  { value: "hoh", label: "Head of Household" },
];

const HSA_COVERAGE_OPTIONS = [
  { value: "self", label: "Self-only" },
  { value: "family", label: "Family" },
];

const PAYCHECK_TERMS: Term[] = [
  {
    term: "Form W-4",
    definition: "The form you give your employer that tells their payroll system how much federal tax to withhold from each paycheck.",
    whyItMatters:
      "It's not a one-time form — a new job, a new baby, a raise, or a spouse starting work are all good reasons to look at it again, not just fill it out once and forget it.",
  },
  {
    term: "Step 2 — Multiple Jobs Checkbox",
    definition: "A box you check on the W-4 when you (or your spouse, if filing jointly) work more than one job at the same time.",
    whyItMatters:
      "Leaving it unchecked when it should be checked is one of the single most common reasons a household ends up owing money at tax time — each employer withholds as if their paycheck were your only income.",
  },
  {
    term: "Step 3 — Dependents",
    definition: "A dollar amount (not a headcount) you enter for qualifying children and other dependents, which reduces withholding throughout the year.",
    whyItMatters:
      "Claiming it lowers what's taken out of every paycheck — real cash flow now — but claim more than you're entitled to and you'll owe it all back at filing.",
  },
  {
    term: "Step 4(a) / 4(b) / 4(c)",
    definition:
      "The W-4's optional fine-tuning lines: 4(a) adds withholding for other income (like a side gig), 4(b) reduces it for extra deductions, and 4(c) just adds a flat extra dollar amount per paycheck.",
    whyItMatters:
      "4(c) is the single easiest lever on the whole form — if this checkup says you're behind, adding a flat dollar amount there is usually the simplest fix.",
  },
  {
    term: "Federal Taxable Wages",
    definition: "Your pay for the period after pre-tax deductions (401(k), HSA, etc.) are already subtracted — not your full gross pay.",
    whyItMatters:
      "It's the number payroll actually calculates withholding from, and usually a different (smaller) number than what's printed as \"gross pay\" at the very top of your pay stub.",
  },
  {
    term: "Elective Deferral Limit",
    definition: "The most the IRS allows an employee to personally contribute to a 401(k) or 403(b) in one year.",
    whyItMatters: "It resets every January 1st — unused room from last year never carries forward, so a slow start early in the year can't be made up in December alone.",
  },
  {
    term: "Employer Match",
    definition: "Money your employer adds to your retirement account, on top of your own contribution, usually up to some percentage of your pay.",
    whyItMatters:
      "Contributing less than what your employer will match isn't just a missed opportunity — it's turning down guaranteed money that's already part of your compensation.",
  },
  {
    term: "Catch-Up Contribution",
    definition: "Extra room the IRS adds on top of the normal limit once you reach a certain age — 50 for IRAs and most 401(k)s, with an even bigger bump from 60-63.",
    whyItMatters: "It exists because the IRS assumes people closer to retirement need to save faster — it's worth checking even if you never used it before.",
  },
  {
    term: "HSA-Eligible High-Deductible Health Plan (HDHP)",
    definition: "A specific type of health insurance plan — only people enrolled in one of these are legally allowed to contribute to an HSA at all.",
    whyItMatters: "Not everyone qualifies. Contributing to an HSA without HDHP coverage creates a real tax problem, so this is worth confirming with HR before opening one.",
  },
  {
    term: "Traditional vs. Roth",
    definition: "Traditional contributions go in before tax (saving money today, taxed later); Roth contributions go in after tax (no benefit today, tax-free later).",
    whyItMatters:
      "This checkup's tax-savings estimates assume a traditional, tax-deductible contribution — a Roth account is still valuable, it just doesn't lower this year's bill the way these numbers show.",
  },
];

export function PaycheckCheckup() {
  const [state, setState] = useLocalStorageState<PaycheckCheckupInput>(
    PAYCHECK_CHECKUP_STORAGE_KEY,
    DEFAULT_PAYCHECK_CHECKUP
  );
  const set = <K extends keyof PaycheckCheckupInput>(key: K, value: PaycheckCheckupInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => runPaycheckCheckup(state), [state]);
  const stateLabel = US_STATES.find((s) => s.value === state.state)?.label ?? state.state;

  const payrollMismatchTolerance = Math.max(300, r.w4ImpliedAnnualWithholding * 0.03);
  const payrollMismatchFlagged = Math.abs(r.payrollMismatch) > payrollMismatchTolerance;
  const w4Tolerance = Math.max(300, r.trueAnnualFederalLiability * 0.03);
  const w4NeedsWork = Math.abs(r.w4VsTrueGap) > w4Tolerance;

  return (
    <Card
      title="Paycheck Checkup"
      lede="For employees, not employers: check your own W-4 and state withholding against your real tax picture, and see whether you're leaving 401(k), IRA, or HSA tax breaks on the table. Tax year 2025 (filed 2026)."
    >
      <MentorNote>
        The Temptations called it &quot;Papa Was a Rolling Stone&quot; — don&apos;t let your own paycheck roll
        past you the same uncounted way. The Bhagavad Gita (3:8) teaches that action outranks inaction: checking
        your withholding is action, assuming it&apos;s fine is not.
      </MentorNote>

      <h3 className="text-lg">About You</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Filing status"
          value={state.filingStatus}
          onChange={(v) => set("filingStatus", v as FilingStatus)}
          options={STATUS_OPTIONS}
        />
        <NumberField label="Qualifying children under 17" value={state.kids} onChange={(v) => set("kids", v)} />
      </div>

      <h3 className="text-lg">
        Your Pay Stub
        <Tip text="Grab your most recent pay stub — everything in this section is printed on it, no W-4 needed yet." />
      </h3>
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Start here — every number below is something you can read straight off a real pay stub, nothing to guess
        at.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Pay frequency"
          value={state.payFrequency}
          onChange={(v) => set("payFrequency", v as PayFrequency)}
          options={PAY_FREQUENCY_OPTIONS}
        />
        <div>
          <NumberField
            label="Federal taxable wages THIS paycheck"
            value={state.payAmount}
            onChange={(v) => set("payAmount", v)}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            After any pre-tax 401(k)/HSA deduction, before tax is withheld — usually printed as something like
            &quot;Fed Taxable Wages&quot; on your pay stub, not the same as gross pay.
          </p>
        </div>
        <NumberField
          label="Actual federal tax withheld THIS paycheck ($)"
          value={state.actualFederalWithheldPerPeriod}
          onChange={(v) => set("actualFederalWithheldPerPeriod", v)}
        />
        <SelectField label="State" value={state.state} onChange={(v) => set("state", v as USState)} options={US_STATES} />
        <NumberField
          label="Actual state tax withheld THIS paycheck ($)"
          value={state.actualStateWithheldPerPeriod}
          onChange={(v) => set("actualStateWithheldPerPeriod", v)}
        />
      </div>

      <h3 className="text-lg">
        Now Grab Your Form W-4
        <Tip text="These should match exactly what you filled in on the actual W-4 you gave your employer — this checkup runs the same math the IRS's own payroll formula does." />
      </h3>
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        This is the form you filled out when you were hired (or last updated) — not something you look at every
        payday, so it&apos;s fine if you need to dig it up from HR or onboarding paperwork. These five boxes are
        what tell your employer how much to withhold in the first place, which is exactly what the numbers above
        get checked against.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxField
          label="Step 2 box checked (multiple jobs / working spouse)"
          checked={state.step2MultipleJobs}
          onChange={(v) => set("step2MultipleJobs", v)}
        />
        <NumberField
          label="Step 3 — Dependents amount ($/year)"
          value={state.step3DependentsAmount}
          onChange={(v) => set("step3DependentsAmount", v)}
        />
        <NumberField
          label="Step 4(a) — Other income ($/year)"
          value={state.step4aOtherIncome}
          onChange={(v) => set("step4aOtherIncome", v)}
        />
        <NumberField
          label="Step 4(b) — Deductions ($/year)"
          value={state.step4bDeductions}
          onChange={(v) => set("step4bDeductions", v)}
        />
        <NumberField
          label="Step 4(c) — Extra withholding ($/paycheck)"
          value={state.step4cExtraWithholding}
          onChange={(v) => set("step4cExtraWithholding", v)}
        />
      </div>

      <h3 className="text-lg">The Rest of Your Tax Picture</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Other annual income not from this job (1099, investments, etc.)"
          value={state.otherAnnualIncome}
          onChange={(v) => set("otherAnnualIncome", v)}
        />
        <NumberField
          label="Itemized deductions (0 = use standard)"
          value={state.itemizedDeductions}
          onChange={(v) => set("itemizedDeductions", v)}
        />
        <NumberField
          label="Local earned income tax rate (%) — your city/county, if any"
          value={state.localRatePct}
          onChange={(v) => set("localRatePct", v)}
          step={0.01}
        />
        <NumberField
          label="Local flat tax/fee ($/yr)"
          value={state.localFlatFee}
          onChange={(v) => set("localFlatFee", v)}
        />
      </div>

      <ResultBox
        label={r.federalIsRefund ? "You're on pace for a federal refund" : "You're on pace to owe federal tax"}
        big={fmt(r.federalOwedOrRefund)}
        stats={[
          { v: fmt(r.trueAnnualFederalLiability), k: "Your real annual federal tax (full picture)" },
          { v: fmt(r.w4ImpliedAnnualWithholding), k: "What your W-4, as filled out, implies should be withheld" },
          { v: fmt(r.actualAnnualFederalWithheld), k: "What's actually being withheld (annualized from your pay stub)" },
          { v: `${(r.marginalRate * 100).toFixed(0)}%`, k: "Your marginal federal tax bracket" },
        ]}
      />

      {payrollMismatchFlagged && (
        <div className="note mt-3" style={{ borderLeftColor: "var(--status-warning)" }}>
          <b>Heads up:</b> your paycheck doesn&apos;t match what your own W-4 says it should — about{" "}
          {fmt(Math.abs(r.payrollMismatch))}/year off. That can mean payroll doesn&apos;t have your current W-4 on
          file, or one of the numbers above doesn&apos;t match what you actually wrote on the form. Worth a quick
          check with HR/payroll before assuming the W-4 itself is the problem.
        </div>
      )}

      {w4NeedsWork ? (
        <div className="note mt-3">
          <b>{r.w4VsTrueGap > 0 ? "Your W-4 is set to under-withhold: " : "Your W-4 is set to over-withhold: "}</b>
          even if payroll applies it perfectly, your current W-4 elections work out to about{" "}
          {fmt(Math.abs(r.w4VsTrueGap))}/year {r.w4VsTrueGap > 0 ? "less" : "more"} than your real tax picture.
          {r.w4VsTrueGap > 0 ? (
            <>
              {" "}
              Consider raising Step 4(c) to about {fmt(r.suggestedStep4cPerPeriod)} per paycheck (it&apos;s currently{" "}
              {fmt(state.step4cExtraWithholding)}) — that&apos;s the simplest single line to change.
            </>
          ) : (
            <> If you&apos;d rather have that cash monthly instead of a bigger refund, Step 4(c) or Step 4(b) are the lines to revisit.</>
          )}
        </div>
      ) : (
        <div className="note mt-3">
          <b>Good news:</b> your W-4, as filled out, is within a reasonable range of your real federal tax picture —
          no obvious box to fix here.
        </div>
      )}

      <ResultBox
        label={r.stateIsRefund ? `You're on pace for a ${stateLabel} state refund` : `You're on pace to owe ${stateLabel} state tax`}
        big={fmt(r.stateOwedOrRefund)}
        stats={[
          { v: fmt(r.trueAnnualStateLiability), k: `Estimated ${stateLabel} tax liability` },
          { v: fmt(r.actualAnnualStateWithheld), k: "What's actually being withheld (annualized)" },
        ]}
      />
      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        Unlike federal, state withholding isn&apos;t modeled line-by-line here — every state has its own
        withholding certificate and formula, so there&apos;s no single honest way to replicate 50 of them. This
        instead compares your estimated full-year {stateLabel} tax against what you report being withheld, the same
        &quot;on pace or not&quot; check as federal, just without pointing to a specific state form line.
      </p>

      <h3 className="text-lg">Retirement &amp; HSA</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Your age" value={state.age} onChange={(v) => set("age", v)} />
        <NumberField
          label="Current 401(k)/403(b) contribution (% of pay)"
          value={state.contribution401kPct}
          onChange={(v) => set("contribution401kPct", v)}
          step={0.5}
        />
        <NumberField
          label="Employer match rate (%) — e.g. 50 for &quot;50¢ per $1&quot;"
          value={state.employerMatchRatePct}
          onChange={(v) => set("employerMatchRatePct", v)}
        />
        <NumberField
          label="Employer match cap (% of pay) — e.g. 6 for &quot;up to 6% of pay&quot;"
          value={state.employerMatchCapPct}
          onChange={(v) => set("employerMatchCapPct", v)}
        />
        <NumberField
          label="Current IRA contributions this year ($, total)"
          value={state.iraAnnualContribution}
          onChange={(v) => set("iraAnnualContribution", v)}
        />
        <CheckboxField
          label="Enrolled in an HSA-eligible high-deductible health plan?"
          checked={state.hsaEligible}
          onChange={(v) => set("hsaEligible", v)}
        />
        {state.hsaEligible && (
          <>
            <SelectField
              label="HSA coverage"
              value={state.hsaCoverage}
              onChange={(v) => set("hsaCoverage", v as "self" | "family")}
              options={HSA_COVERAGE_OPTIONS}
            />
            <NumberField
              label="Your HSA payroll contribution ($/paycheck)"
              value={state.hsaContributionPerPeriod}
              onChange={(v) => set("hsaContributionPerPeriod", v)}
            />
            <NumberField
              label="Employer HSA contribution ($/year)"
              value={state.hsaEmployerAnnual}
              onChange={(v) => set("hsaEmployerAnnual", v)}
            />
          </>
        )}
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="mt-2">
          <thead>
            <tr>
              <th>Account</th>
              <th className="num">Current (annual)</th>
              <th className="num">2025 Limit</th>
              <th className="num">Gap</th>
              <th className="num">Est. tax savings if maxed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>401(k)/403(b)</td>
              <td className="num">{fmt(r.current401kAnnual)}</td>
              <td className="num">{fmt(r.deferralLimit)}</td>
              <td className="num">{fmt(r.gap401k)}</td>
              <td className="num">{fmt(r.estTaxSavings401k)}</td>
            </tr>
            <tr>
              <td>
                IRA <Tip text="Assumes a deductible traditional IRA. A Roth IRA, or a traditional IRA that isn't deductible because of workplace-plan income limits, doesn't reduce this year's tax the way this estimate shows." />
              </td>
              <td className="num">{fmt(r.currentIraAnnual)}</td>
              <td className="num">{fmt(r.iraLimit)}</td>
              <td className="num">{fmt(r.iraGap)}</td>
              <td className="num">{fmt(r.estTaxSavingsIra)}</td>
            </tr>
            {state.hsaEligible && (
              <tr>
                <td>HSA</td>
                <td className="num">{fmt(r.currentHsaAnnual)}</td>
                <td className="num">{fmt(r.hsaLimit)}</td>
                <td className="num">{fmt(r.hsaGap)}</td>
                <td className="num">{fmt(r.estTaxSavingsHsa)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        2025 limits: {fmt(ELECTIVE_DEFERRAL_LIMIT_2025)} 401(k)/403(b) elective deferral (plus a catch-up at 50+, and
        a bigger one from 60-63), {fmt(IRA_LIMIT_2025)} IRA (plus $1,000 catch-up at 50+), {fmt(HSA_SELF_ONLY_LIMIT_2025)}{" "}
        HSA self-only / {fmt(HSA_FAMILY_LIMIT_2025)} family (plus $1,000 catch-up at 55+) — source: IRS.
      </p>

      {state.employerMatchCapPct > 0 && (
        <div
          className="note mt-3"
          style={{ borderLeftColor: r.unclaimedMatch > 0 ? "var(--status-warning)" : undefined }}
        >
          {r.unclaimedMatch > 0 ? (
            <>
              <b>Free money left on the table:</b> at your current contribution rate, you&apos;re capturing{" "}
              {fmt(r.currentAnnualMatch)} of an available {fmt(r.maxPossibleMatch)} employer match — that&apos;s{" "}
              {fmt(r.unclaimedMatch)}/year in employer money you&apos;re not claiming, on top of your own
              contribution.
            </>
          ) : (
            <>
              <b>Good news:</b> you&apos;re already capturing the full {fmt(r.maxPossibleMatch)}/year employer
              match available to you.
            </>
          )}
        </div>
      )}

      <TermDictionary
        terms={PAYCHECK_TERMS}
        title="Paycheck Checkup Term Dictionary"
        description="Every technical term on this page, in plain English — and why each one is actually worth understanding, not just memorizing."
      />

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        This is an educational estimate built from IRS-published formulas and 2025 contribution limits — it is not a
        substitute for reading your actual pay stub, your plan documents, or a conversation with a licensed tax
        professional or your HR/benefits team.
      </p>
    </Card>
  );
}
