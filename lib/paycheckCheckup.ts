/**
 * Paycheck Checkup — the employee-side counterpart to Employees & Payroll
 * (that panel is what an EMPLOYER sees; this one is what an individual
 * EMPLOYEE fills out about their own paycheck). Answers three questions:
 *
 *   1. "Is my W-4 set up right for my real situation?" — compares the
 *      IRS's own payroll withholding formula (applied to exactly what
 *      the person's W-4 currently says) against a full-picture estimate
 *      of their actual annual tax liability, built from the same
 *      estimateTax() engine that already powers the Tax Estimator panel.
 *   2. "Is my paycheck actually matching what my own W-4 says?" — a
 *      second, independent comparison that can catch a payroll/HR data
 *      entry error even when the W-4 itself is filled out correctly.
 *   3. "Am I leaving retirement/HSA tax breaks on the table?" — compares
 *      current 401(k)/IRA/HSA contributions against the 2025 IRS limits
 *      and an employer match, in real dollars.
 *
 * Federal withholding math: IRS Publication 15-T (2025), "Percentage
 * Method Tables for Automated Payroll Systems" — the Standard Withholding
 * Rate Schedules (Form W-4 Step 2 box NOT checked) and the Form W-4 Step
 * 2 Checkbox Withholding Rate Schedules (box checked), for all three
 * schedule groups the IRS publishes (Married Filing Jointly; Single or
 * Married Filing Separately; Head of Household). Figures copied directly
 * from the IRS's own published 2025 tables
 * (https://www.irs.gov/pub/irs-prior/p15t--2025.pdf) — these are the
 * exact numbers a real payroll system uses, not an approximation of them.
 * This IS a simplification of the full worksheet in one place: it skips
 * the rare "Form W-4 is from 2019 or earlier" branch (irrelevant — every
 * current W-4 uses the 2020+ design) and assumes one job's wages are
 * being annualized on their own, which is exactly what Step 2 of the W-4
 * itself is designed to correct for via the checkbox.
 *
 * State withholding is NOT modeled line-by-line the way federal is —
 * every state has its own withholding certificate with its own formula,
 * and there's no honest way to hardcode 50 of them here (see the same
 * simplification note already used in lib/stateTax.ts). Instead this
 * reuses that file's calcStateTax() (via estimateTax()) to get an
 * estimated annual STATE TAX LIABILITY, and compares that to what the
 * person reports is actually being withheld — the same "is this on
 * pace" comparison as federal, just without pretending to replicate the
 * state's own W-4 equivalent form.
 *
 * 2025 retirement/HSA figures, independently verified against IRS
 * sources (not assumed):
 *   - 401(k)/403(b) employee elective deferral limit: $23,500, catch-up
 *     $7,500 (age 50+) or $11,250 "super catch-up" (ages 60-63, SECURE
 *     2.0) — same statutory limit already verified and used for the
 *     Solo 401(k) calculator in components/features/InvestmentFund.tsx;
 *     the number is identical for a regular W-2 employee's 401(k).
 *   - IRA (traditional + Roth combined) limit: $7,000, catch-up $1,000
 *     (age 50+) — IRS Publication 590-A for 2025.
 *   - HSA limit: $4,300 self-only / $8,550 family, catch-up $1,000 (age
 *     55+) — IRS Publication 969 for 2025.
 */
import { estimateTax, FEDERAL_BRACKETS, type EstimatorInput, type FilingStatus } from "@/lib/tax";
import type { USState } from "@/lib/stateTax";
import { SS_EMPLOYER_RATE, MEDICARE_EMPLOYER_RATE } from "@/lib/employees";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export const PAY_PERIODS: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly (52/yr)" },
  { value: "biweekly", label: "Every 2 weeks (26/yr)" },
  { value: "semimonthly", label: "Twice a month (24/yr)" },
  { value: "monthly", label: "Monthly (12/yr)" },
];

// [floor, tax already accumulated at that floor, marginal rate above it]
type W4Bracket = [number, number, number];
type W4ScheduleGroup = "single_mfs" | "mfj" | "hoh";

/** IRS Pub 15-T (2025) — Standard Withholding Rate Schedules (Step 2 box NOT checked). */
export const W4_STANDARD_SCHEDULE: Record<W4ScheduleGroup, W4Bracket[]> = {
  single_mfs: [
    [0, 0, 0],
    [6400, 0, 0.1],
    [18325, 1192.5, 0.12],
    [54875, 5578.5, 0.22],
    [109750, 17651, 0.24],
    [203700, 40199, 0.32],
    [256925, 57231, 0.35],
    [632750, 188769.75, 0.37],
  ],
  mfj: [
    [0, 0, 0],
    [17100, 0, 0.1],
    [40950, 2385, 0.12],
    [114050, 11157, 0.22],
    [223800, 35302, 0.24],
    [411700, 80398, 0.32],
    [518150, 114462, 0.35],
    [768700, 202154.5, 0.37],
  ],
  hoh: [
    [0, 0, 0],
    [13900, 0, 0.1],
    [30900, 1700, 0.12],
    [78750, 7442, 0.22],
    [117250, 15912, 0.24],
    [211200, 38460, 0.32],
    [264400, 55484, 0.35],
    [640250, 187031.5, 0.37],
  ],
};

/** IRS Pub 15-T (2025) — Form W-4, Step 2, Checkbox Withholding Rate Schedules. */
export const W4_CHECKBOX_SCHEDULE: Record<W4ScheduleGroup, W4Bracket[]> = {
  single_mfs: [
    [0, 0, 0],
    [7500, 0, 0.1],
    [13463, 596.25, 0.12],
    [31738, 2789.25, 0.22],
    [59175, 8825.5, 0.24],
    [106150, 20099.5, 0.32],
    [132763, 28615.5, 0.35],
    [320675, 94384.88, 0.37],
  ],
  mfj: [
    [0, 0, 0],
    [15000, 0, 0.1],
    [26925, 1192.5, 0.12],
    [63475, 5578.5, 0.22],
    [118350, 17651, 0.24],
    [212300, 40199, 0.32],
    [265525, 57231, 0.35],
    [390800, 101077.25, 0.37],
  ],
  hoh: [
    [0, 0, 0],
    [11250, 0, 0.1],
    [19750, 850, 0.12],
    [43675, 3721, 0.22],
    [62925, 7956, 0.24],
    [109900, 19230, 0.32],
    [136500, 27742, 0.35],
    [324425, 93515.75, 0.37],
  ],
};

function scheduleGroupFor(status: FilingStatus): W4ScheduleGroup {
  if (status === "mfj") return "mfj";
  if (status === "hoh") return "hoh";
  return "single_mfs"; // IRS Pub 15-T lumps Single and Married Filing Separately into one schedule
}

function applyW4Schedule(adjustedAnnualWage: number, schedule: W4Bracket[]): number {
  let chosen = schedule[0];
  for (const b of schedule) {
    if (adjustedAnnualWage >= b[0]) chosen = b;
    else break;
  }
  const [floor, base, rate] = chosen;
  return Math.max(0, base + (adjustedAnnualWage - floor) * rate);
}

/** Reads the highest bracket rate that applies to a taxable income amount
 * — the "if you earned one more dollar" rate, used to translate a
 * retirement/HSA contribution gap into an actual dollar tax-savings
 * estimate below. */
export function marginalFederalRate(taxableIncome: number, status: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[status];
  let rate = brackets[0][1];
  for (const [floor, r] of brackets) {
    if (taxableIncome > floor) rate = r;
    else break;
  }
  return rate;
}

/** IRS Pub 15-T (2025) Worksheet 1A, line 1g — a standard-deduction-style
 * amount built into the worksheet itself, subtracted from annualized
 * wages before the rate schedule is looked up. It's used ONLY when the
 * Step 2 checkbox is NOT checked; the Step 2 Checkbox schedule's own
 * (roughly halved) bracket thresholds already account for a two-job
 * household differently, so this line becomes $0 whenever that box is
 * checked. Single, Married Filing Separately, and Head of Household all
 * share the same $8,600 figure per the worksheet — only Married Filing
 * Jointly gets the larger $12,900. */
const W4_LINE_1G_MFJ = 12900;
const W4_LINE_1G_OTHER = 8600;

export type FederalW4Input = {
  filingStatus: FilingStatus;
  payFrequency: PayFrequency;
  payAmount: number; // federal taxable wages THIS pay period — after any pre-tax 401(k)/HSA deduction, before tax withholding
  step2MultipleJobs: boolean;
  step3DependentsAmount: number; // annual $, straight off Form W-4 Step 3
  step4aOtherIncome: number; // annual $, Step 4(a)
  step4bDeductions: number; // annual $, Step 4(b)
  step4cExtraWithholding: number; // per-paycheck $, Step 4(c)
};

/** What the IRS's own payroll formula says SHOULD be withheld, given the
 * W-4 exactly as the person has it filled out right now — independent of
 * whether that W-4 is actually the right call for their real situation. */
export function calcExpectedFederalWithholding(input: FederalW4Input) {
  const periods = PAY_PERIODS[input.payFrequency];
  const annualizedWage = Math.max(0, input.payAmount) * periods;
  const line1g = input.step2MultipleJobs ? 0 : input.filingStatus === "mfj" ? W4_LINE_1G_MFJ : W4_LINE_1G_OTHER;
  const adjustedAnnualWage = Math.max(0, annualizedWage + input.step4aOtherIncome - input.step4bDeductions - line1g);
  const schedule = input.step2MultipleJobs
    ? W4_CHECKBOX_SCHEDULE[scheduleGroupFor(input.filingStatus)]
    : W4_STANDARD_SCHEDULE[scheduleGroupFor(input.filingStatus)];
  const tentativeAnnualTax = applyW4Schedule(adjustedAnnualWage, schedule);
  const afterStep3Credit = Math.max(0, tentativeAnnualTax - Math.max(0, input.step3DependentsAmount));
  const annualWithholding = afterStep3Credit + Math.max(0, input.step4cExtraWithholding) * periods;
  return {
    periods,
    annualizedWage,
    adjustedAnnualWage,
    tentativeAnnualTax,
    annualWithholding,
    perPeriodWithholding: annualWithholding / periods,
  };
}

// --- 2025 retirement & HSA limits ---
export const ELECTIVE_DEFERRAL_LIMIT_2025 = 23500; // 401(k)/403(b) employee deferral — same statutory limit as InvestmentFund.tsx's Solo 401(k)
export const DEFERRAL_CATCHUP_50_2025 = 7500;
export const DEFERRAL_CATCHUP_60_63_2025 = 11250; // SECURE 2.0 "super" catch-up, ages 60-63 — replaces the $7,500, not additive to it

export const IRA_LIMIT_2025 = 7000;
export const IRA_CATCHUP_50_2025 = 1000; // → $8,000 total at 50+

export const HSA_SELF_ONLY_LIMIT_2025 = 4300;
export const HSA_FAMILY_LIMIT_2025 = 8550;
export const HSA_CATCHUP_55_2025 = 1000;

/** Employee's own FICA share mirrors the employer's — both are the same
 * flat 6.2% (Social Security) + 1.45% (Medicare) — so this reuses the
 * already-verified employer-side constants from lib/employees.ts rather
 * than hardcoding a second copy of the same two numbers. */
export const EMPLOYEE_FICA_RATE = SS_EMPLOYER_RATE + MEDICARE_EMPLOYER_RATE;

export function retirementDeferralLimit(age: number): number {
  if (age >= 60 && age <= 63) return ELECTIVE_DEFERRAL_LIMIT_2025 + DEFERRAL_CATCHUP_60_63_2025;
  if (age >= 50) return ELECTIVE_DEFERRAL_LIMIT_2025 + DEFERRAL_CATCHUP_50_2025;
  return ELECTIVE_DEFERRAL_LIMIT_2025;
}

export function iraContributionLimit(age: number): number {
  return age >= 50 ? IRA_LIMIT_2025 + IRA_CATCHUP_50_2025 : IRA_LIMIT_2025;
}

export function hsaContributionLimit(coverage: "self" | "family", age: number): number {
  const base = coverage === "family" ? HSA_FAMILY_LIMIT_2025 : HSA_SELF_ONLY_LIMIT_2025;
  return age >= 55 ? base + HSA_CATCHUP_55_2025 : base;
}

export type PaycheckCheckupInput = {
  // Household & pay
  filingStatus: FilingStatus;
  kids: number;
  payFrequency: PayFrequency;
  payAmount: number;
  state: USState;

  // Form W-4 (current job)
  step2MultipleJobs: boolean;
  step3DependentsAmount: number;
  step4aOtherIncome: number;
  step4bDeductions: number;
  step4cExtraWithholding: number;

  // What's actually on the pay stub
  actualFederalWithheldPerPeriod: number;
  actualStateWithheldPerPeriod: number;

  // The rest of the tax picture, same fields Tax Estimator already uses
  otherAnnualIncome: number;
  itemizedDeductions: number;
  localRatePct: number;
  localFlatFee: number;

  // Retirement & HSA
  age: number;
  contribution401kPct: number; // current elective deferral, % of pay
  employerMatchRatePct: number; // e.g. 50 for "50 cents on the dollar"
  employerMatchCapPct: number; // e.g. 6 for "matched up to 6% of pay"
  iraAnnualContribution: number;
  hsaEligible: boolean;
  hsaCoverage: "self" | "family";
  hsaContributionPerPeriod: number;
  hsaEmployerAnnual: number;
};

export const DEFAULT_PAYCHECK_CHECKUP: PaycheckCheckupInput = {
  filingStatus: "single",
  kids: 0,
  payFrequency: "biweekly",
  payAmount: 0,
  state: "PA",

  step2MultipleJobs: false,
  step3DependentsAmount: 0,
  step4aOtherIncome: 0,
  step4bDeductions: 0,
  step4cExtraWithholding: 0,

  actualFederalWithheldPerPeriod: 0,
  actualStateWithheldPerPeriod: 0,

  otherAnnualIncome: 0,
  itemizedDeductions: 0,
  localRatePct: 0,
  localFlatFee: 0,

  age: 30,
  contribution401kPct: 0,
  employerMatchRatePct: 0,
  employerMatchCapPct: 0,
  iraAnnualContribution: 0,
  hsaEligible: false,
  hsaCoverage: "self",
  hsaContributionPerPeriod: 0,
  hsaEmployerAnnual: 0,
};

export type PaycheckCheckupResult = {
  periods: number;
  annualizedTaxableWages: number;

  // True full-picture liability (federal + state), reusing estimateTax()
  trueAnnualFederalLiability: number;
  trueAnnualStateLiability: number;
  marginalRate: number;

  // Part 1: is the W-4 itself set up right?
  w4ImpliedAnnualWithholding: number;
  w4VsTrueGap: number; // trueAnnualFederalLiability - w4ImpliedAnnualWithholding; positive = W-4 is set to under-withhold

  // Part 2: does the paycheck match the W-4?
  actualAnnualFederalWithheld: number;
  payrollMismatch: number; // actualAnnualFederalWithheld - w4ImpliedAnnualWithholding

  // Headline: on pace to owe or get a refund, and by how much
  federalOwedOrRefund: number; // trueAnnualFederalLiability - actualAnnualFederalWithheld; positive = will owe
  federalIsRefund: boolean;
  suggestedStep4cPerPeriod: number; // only when under-withheld

  // State — simpler two-way comparison (see file header for why)
  actualAnnualStateWithheld: number;
  stateOwedOrRefund: number;
  stateIsRefund: boolean;

  // Retirement & HSA
  deferralLimit: number;
  current401kAnnual: number;
  gap401k: number;
  estTaxSavings401k: number;
  currentAnnualMatch: number;
  maxPossibleMatch: number;
  unclaimedMatch: number;

  iraLimit: number;
  currentIraAnnual: number;
  iraGap: number;
  estTaxSavingsIra: number;

  hsaEligible: boolean;
  hsaLimit: number;
  currentHsaAnnual: number;
  hsaGap: number;
  estTaxSavingsHsa: number;
};

export function runPaycheckCheckup(input: PaycheckCheckupInput): PaycheckCheckupResult {
  const periods = PAY_PERIODS[input.payFrequency];
  const annualizedTaxableWages = Math.max(0, input.payAmount) * periods;

  const w4 = calcExpectedFederalWithholding({
    filingStatus: input.filingStatus,
    payFrequency: input.payFrequency,
    payAmount: input.payAmount,
    step2MultipleJobs: input.step2MultipleJobs,
    step3DependentsAmount: input.step3DependentsAmount,
    step4aOtherIncome: input.step4aOtherIncome,
    step4bDeductions: input.step4bDeductions,
    step4cExtraWithholding: input.step4cExtraWithholding,
  });

  const estimatorInput: EstimatorInput = {
    status: input.filingStatus,
    kids: input.kids,
    wages: annualizedTaxableWages,
    seProfit: 0,
    other: input.otherAnnualIncome,
    itemized: input.itemizedDeductions,
    state: input.state,
    localRatePct: input.localRatePct,
    localFlatFee: input.localFlatFee,
  };
  const trueLiability = estimateTax(estimatorInput);

  const actualAnnualFederalWithheld = Math.max(0, input.actualFederalWithheldPerPeriod) * periods;
  const actualAnnualStateWithheld = Math.max(0, input.actualStateWithheldPerPeriod) * periods;

  const w4VsTrueGap = trueLiability.federalAfterCredits - w4.annualWithholding;
  const payrollMismatch = actualAnnualFederalWithheld - w4.annualWithholding;

  const federalOwedOrRefundRaw = trueLiability.federalAfterCredits - actualAnnualFederalWithheld;
  const federalIsRefund = federalOwedOrRefundRaw < 0;
  const suggestedStep4cPerPeriod = federalOwedOrRefundRaw > 0 ? federalOwedOrRefundRaw / periods : 0;

  const stateOwedOrRefundRaw = trueLiability.stateTax - actualAnnualStateWithheld;
  const stateIsRefund = stateOwedOrRefundRaw < 0;

  const marginalRate = marginalFederalRate(trueLiability.taxableIncome, input.filingStatus);

  // --- 401(k) ---
  const deferralLimit = retirementDeferralLimit(input.age);
  const current401kAnnual = (Math.max(0, input.contribution401kPct) / 100) * annualizedTaxableWages;
  const gap401k = Math.max(0, deferralLimit - current401kAnnual);
  const estTaxSavings401k = gap401k * marginalRate;

  const currentMatchedPct = Math.min(Math.max(0, input.contribution401kPct), Math.max(0, input.employerMatchCapPct));
  const currentAnnualMatch = (currentMatchedPct / 100) * annualizedTaxableWages * (Math.max(0, input.employerMatchRatePct) / 100);
  const maxPossibleMatch = (Math.max(0, input.employerMatchCapPct) / 100) * annualizedTaxableWages * (Math.max(0, input.employerMatchRatePct) / 100);
  const unclaimedMatch = Math.max(0, maxPossibleMatch - currentAnnualMatch);

  // --- IRA ---
  const iraLimit = iraContributionLimit(input.age);
  const currentIraAnnual = Math.max(0, input.iraAnnualContribution);
  const iraGap = Math.max(0, iraLimit - currentIraAnnual);
  // Assumes a deductible traditional IRA — a Roth IRA (or a traditional
  // one that isn't deductible because of workplace-plan income limits)
  // doesn't save tax today, so this is shown as a ceiling, not a promise,
  // with that caveat spelled out in the UI.
  const estTaxSavingsIra = iraGap * marginalRate;

  // --- HSA ---
  const hsaLimit = input.hsaEligible ? hsaContributionLimit(input.hsaCoverage, input.age) : 0;
  const currentHsaAnnual = input.hsaEligible
    ? Math.max(0, input.hsaContributionPerPeriod) * periods + Math.max(0, input.hsaEmployerAnnual)
    : 0;
  const hsaGap = input.hsaEligible ? Math.max(0, hsaLimit - currentHsaAnnual) : 0;
  // HSA payroll contributions are pre-tax for income tax AND FICA (a true
  // Section 125 pre-tax benefit), unlike a 401(k) deferral which only
  // avoids income tax — so this stacks the marginal income-tax rate with
  // the employee's own FICA share.
  const estTaxSavingsHsa = input.hsaEligible ? hsaGap * (marginalRate + EMPLOYEE_FICA_RATE) : 0;

  return {
    periods,
    annualizedTaxableWages,
    trueAnnualFederalLiability: trueLiability.federalAfterCredits,
    trueAnnualStateLiability: trueLiability.stateTax,
    marginalRate,
    w4ImpliedAnnualWithholding: w4.annualWithholding,
    w4VsTrueGap,
    actualAnnualFederalWithheld,
    payrollMismatch,
    federalOwedOrRefund: Math.abs(federalOwedOrRefundRaw),
    federalIsRefund,
    suggestedStep4cPerPeriod,
    actualAnnualStateWithheld,
    stateOwedOrRefund: Math.abs(stateOwedOrRefundRaw),
    stateIsRefund,
    deferralLimit,
    current401kAnnual,
    gap401k,
    estTaxSavings401k,
    currentAnnualMatch,
    maxPossibleMatch,
    unclaimedMatch,
    iraLimit,
    currentIraAnnual,
    iraGap,
    estTaxSavingsIra,
    hsaEligible: input.hsaEligible,
    hsaLimit,
    currentHsaAnnual,
    hsaGap,
    estTaxSavingsHsa,
  };
}

export const PAYCHECK_CHECKUP_STORAGE_KEY = "wc.paycheckcheckup";
