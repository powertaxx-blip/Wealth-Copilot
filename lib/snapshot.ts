/**
 * Snapshot — deliberately the last panel built (see MIGRATION.md's port
 * order): it reads a slice of state from nearly every other panel, so it
 * only makes sense once most of them are real. Every other panel in this
 * app owns its own localStorage key and never reads anyone else's — this
 * is the one deliberate exception, and it's read-only. Snapshot never
 * writes to another panel's key, only reads it, the same one-directional
 * pattern Schedule C's own bridge (readScheduleCNetProfit, in
 * lib/scheduleC.ts) already established for Tax Estimator. That
 * precedent is why this lives as its own small set of read functions
 * instead of, say, a shared global store: every panel's shape can still
 * change independently, and Snapshot just has to tolerate whatever it
 * finds (or doesn't) at each key.
 *
 * Every section below carries a `hasData` flag rather than just
 * defaulting silently to zero. A brand-new visitor who's touched nothing
 * yet should see "not started" on every tile, not a wall of misleading
 * $0s that looks like eleven confirmed-empty accounts.
 */

import { calcScheduleC, INITIAL_SCHEDULE_C, SCHEDULE_C_STORAGE_KEY, type ScheduleCInput } from "@/lib/scheduleC";
import { calcMileageDeduction, MILEAGE_STORAGE_KEY, type Trip } from "@/lib/mileage";
import { calcInvoiceTotals, INVOICES_STORAGE_KEY, type Invoice } from "@/lib/invoices";
import { calcQuizScore, NONPROFIT_QUESTIONS, STANDARD_QUESTIONS, type QuizProgress } from "@/lib/quiz";
import { estimateTax, type EstimatorInput } from "@/lib/tax";
import { calcAllEmployeeCosts, EMPLOYEES_STORAGE_KEY, DEFAULT_EMPLOYEES_STATE, type EmployeesState } from "@/lib/employees";
import { calcGrantTotals, GRANTS_STORAGE_KEY, DEFAULT_GRANTS_STATE, type GrantsState } from "@/lib/grants";
import {
  calcGrantWritingTotals,
  GRANT_WRITING_STORAGE_KEY,
  DEFAULT_GRANT_WRITING_STATE,
  type GrantWritingState,
} from "@/lib/grantWriting";
import {
  calcDonorRetention,
  DONOR_RETENTION_STORAGE_KEY,
  DEFAULT_DONOR_RETENTION,
  type DonorRetentionInput,
} from "@/lib/donorRetention";
import {
  calcFinancialHealth,
  worseTone,
  FINANCIAL_HEALTH_STORAGE_KEY,
  DEFAULT_FINANCIAL_HEALTH,
  type FinancialHealthInput,
} from "@/lib/financialHealth";
import { calcForm990, FORM_990_STORAGE_KEY, DEFAULT_FORM_990, type Form990Input } from "@/lib/form990";
import {
  runPaycheckCheckup,
  DEFAULT_PAYCHECK_CHECKUP,
  PAYCHECK_CHECKUP_STORAGE_KEY,
  type PaycheckCheckupInput,
} from "@/lib/paycheckCheckup";

/** Reads and JSON-parses a localStorage key, falling back to `fallback`
 * on any failure (missing key, private browsing, malformed JSON, wrong
 * shape) — same "never crash on a stranger's browser storage" posture
 * useLocalStorageState itself takes, just as a one-shot read instead of
 * a live hook, since Snapshot doesn't own any of these keys. */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type Section<T> = { hasData: boolean } & T;

export type SnapshotData = {
  budgeting: Section<{ income: number; keyMetricLabel: string; keyMetricAmount: number; keyMetricGuidelinePct: number }>;
  reserve: Section<{ monthsCovered: number; percentFunded: number; tone: "good" | "warning" | "critical" }>;
  investments: Section<{ totalValue: number; totalGL: number; holdingCount: number }>;
  breakeven: Section<{ unitsNeeded: number | null; contributionMargin: number }>;
  estimator: Section<{ netTax: number; isRefund: boolean; effectiveRate: number }>;
  mileage: Section<{ totalMiles: number; totalDeduction: number }>;
  bizExpenses: Section<{ totalExpenses: number; count: number }>;
  scheduleC: Section<{ netProfit: number }>;
  balanceSheet: Section<{ totalAssets: number; bottomTotal: number; bottomLabel: string; balanced: boolean }>;
  billing: Section<{ count: number; totalValue: number }>;
  debt: Section<{ totalBalance: number; debtCount: number }>;
  quiz: Section<{ correct: number; total: number; answered: number }>;
  employees: Section<{ headcount: number; totalCost: number }>;
  grants: Section<{ totalRequested: number; totalAwarded: number; pendingCount: number }>;
  grantWriting: Section<{ proposalsStarted: number; sectionsWritten: number; orgProfileComplete: boolean }>;
  donorRetention: Section<{ ratePct: number; label: string; tone: "good" | "warning" }>;
  financialHealth: Section<{ daysCash: number; reserveMonths: number; reserveLabel: string; tone: "good" | "warning" | "critical" }>;
  form990: Section<{ formLabel: string; passed: boolean; daysRemaining: number; label: string; tone: "good" | "warning" | "critical" }>;
  paycheckCheckup: Section<{ isRefund: boolean; federalGap: number; contributionGap: number }>;
};

type BudgetState = {
  forProfitIncome: number;
  nonprofitIncome: number;
  forProfit: Record<string, Record<string, number>>;
  nonprofit: Record<string, Record<string, number>>;
};

type EmergencyFundState = { expenses: number; savings: number; targetMonths: string; targetDate: string };

type BalanceSheetState = {
  cash: number; ar: number; inv: number; equip: number; property: number; otherAsset: number;
  ap: number; cc: number; stloan: number; ltloan: number; otherLiab: number;
  contrib: number; retained: number; draws: number;
  netWithoutRestriction: number; netWithRestriction: number;
};

type Holding = { id: string; contributed: number; value: number };
type BreakEvenState = { fixed: number; varCost: number; price: number; unitCost: number; marginPct: number };
type Expense = { id: string; amount: number };
type Debt = { id: string; balance: number };

function groupSum(values: Record<string, number> | undefined): number {
  if (!values) return 0;
  return Object.values(values).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}

/** Reads a slice of every other panel's saved state and boils each one
 * down to the handful of numbers this page actually shows. Pure and
 * synchronous — client-only (reads window.localStorage directly), so
 * callers run this inside an effect, same as every direct localStorage
 * read elsewhere in this app. */
export function readSnapshotData(nonprofit: boolean): SnapshotData {
  // --- Budgeting ---
  const budget = readJSON<BudgetState | null>("wc.budgeting", null);
  const budgeting = (() => {
    if (!budget) return { hasData: false, income: 0, keyMetricLabel: "", keyMetricAmount: 0, keyMetricGuidelinePct: 0 };
    const income = nonprofit ? budget.nonprofitIncome : budget.forProfitIncome;
    const bucket = nonprofit ? budget.nonprofit : budget.forProfit;
    const keyGroupKey = nonprofit ? "program" : "savings";
    const keyMetricLabel = nonprofit ? "Program Services" : "Savings & debt paydown";
    const keyMetricGuidelinePct = nonprofit ? 65 : 20;
    const keyMetricAmount = groupSum(bucket?.[keyGroupKey]);
    const hasData = income > 0 || Object.values(bucket ?? {}).some((g) => groupSum(g) > 0);
    return { hasData, income, keyMetricLabel, keyMetricAmount, keyMetricGuidelinePct };
  })();

  // --- Emergency Fund / Operating Reserve ---
  const ef = readJSON<EmergencyFundState | null>("wc.emergency", null);
  const reserve = (() => {
    if (!ef || (ef.expenses <= 0 && ef.savings <= 0)) {
      return { hasData: false, monthsCovered: 0, percentFunded: 0, tone: "critical" as const };
    }
    const targetMonths = parseFloat(ef.targetMonths) || 6;
    const targetAmount = ef.expenses * targetMonths;
    const monthsCovered = ef.expenses > 0 ? ef.savings / ef.expenses : 0;
    const percentFunded = targetAmount > 0 ? Math.min(100, (ef.savings / targetAmount) * 100) : 0;
    let tone: "good" | "warning" | "critical" = "critical";
    if (percentFunded >= 100) tone = "good";
    else if (percentFunded >= 50) tone = "warning";
    return { hasData: true, monthsCovered, percentFunded, tone };
  })();

  // --- Investment Fund (holdings only — the projector/retirement tools
  // are "what if" calculators, not a current balance, so they're left
  // out of a snapshot of where things stand today) ---
  const holdings = readJSON<Holding[]>("wc.investment.holdings", []);
  const investments = {
    hasData: holdings.length > 0,
    totalValue: holdings.reduce((s, h) => s + h.value, 0),
    totalGL: holdings.reduce((s, h) => s + (h.value - h.contributed), 0),
    holdingCount: holdings.length,
  };

  // --- Break-Even & Pricing ---
  const be = readJSON<BreakEvenState | null>("wc.breakeven", null);
  const breakeven = (() => {
    if (!be || (be.fixed <= 0 && be.price <= 0)) return { hasData: false, unitsNeeded: null, contributionMargin: 0 };
    const contributionMargin = be.price - be.varCost;
    const unitsNeeded = contributionMargin > 0 ? be.fixed / contributionMargin : null;
    return { hasData: true, unitsNeeded, contributionMargin };
  })();

  // --- Tax Estimator ---
  const est = readJSON<EstimatorInput | null>("wc.estimator", null);
  const estimator = (() => {
    if (!est || (est.wages <= 0 && est.seProfit <= 0 && est.other <= 0)) {
      return { hasData: false, netTax: 0, isRefund: false, effectiveRate: 0 };
    }
    const r = estimateTax(est);
    return { hasData: true, netTax: r.netTax, isRefund: r.isRefund, effectiveRate: r.effectiveRate };
  })();

  // --- Mileage Tracker ---
  const trips = readJSON<Trip[]>(MILEAGE_STORAGE_KEY, []);
  const mileageTotals = calcMileageDeduction(trips, nonprofit);
  const mileage = { hasData: trips.length > 0, totalMiles: mileageTotals.totalMiles, totalDeduction: mileageTotals.deduction };

  // --- Business Expenses ---
  const expenses = readJSON<Expense[]>("wc.bizexpenses", []);
  const bizExpenses = { hasData: expenses.length > 0, totalExpenses: expenses.reduce((s, e) => s + e.amount, 0), count: expenses.length };

  // --- Schedule C ---
  const scInput = readJSON<ScheduleCInput | null>(SCHEDULE_C_STORAGE_KEY, null);
  const scheduleC = (() => {
    if (!scInput || (scInput.gross <= 0 && scInput.miles <= 0 && Object.values(scInput.categoryAmounts ?? {}).every((v) => !v))) {
      return { hasData: false, netProfit: 0 };
    }
    const merged: ScheduleCInput = { ...INITIAL_SCHEDULE_C, ...scInput, categoryAmounts: { ...INITIAL_SCHEDULE_C.categoryAmounts, ...scInput.categoryAmounts } };
    return { hasData: true, netProfit: calcScheduleC(merged).netProfit };
  })();

  // --- Balance Sheet / Statement of Financial Position ---
  const bs = readJSON<BalanceSheetState | null>("wc.balance", null);
  const balanceSheet = (() => {
    if (!bs) return { hasData: false, totalAssets: 0, bottomTotal: 0, bottomLabel: nonprofit ? "Net Assets" : "Equity", balanced: true };
    const totalAssets = bs.cash + bs.ar + bs.inv + bs.equip + bs.property + bs.otherAsset;
    const totalLiabilities = bs.ap + bs.cc + bs.stloan + bs.ltloan + bs.otherLiab;
    const bottomTotal = nonprofit ? bs.netWithoutRestriction + bs.netWithRestriction : bs.contrib + bs.retained - bs.draws;
    const balanced = Math.abs(totalAssets - (totalLiabilities + bottomTotal)) < 0.01;
    const hasData = totalAssets > 0 || totalLiabilities > 0 || bottomTotal !== 0;
    return { hasData, totalAssets, bottomTotal, bottomLabel: nonprofit ? "Net Assets" : "Equity", balanced };
  })();

  // --- Invoices / Donation Receipts ---
  const invoices = readJSON<Invoice[]>(INVOICES_STORAGE_KEY, []);
  const billing = {
    hasData: invoices.length > 0,
    count: invoices.length,
    totalValue: invoices.reduce((s, inv) => s + calcInvoiceTotals(inv).total, 0),
  };

  // --- Debt Payoff Planner ---
  const debts = readJSON<Debt[]>("wc.debts", []);
  const debt = { hasData: debts.length > 0, totalBalance: debts.reduce((s, d) => s + d.balance, 0), debtCount: debts.length };

  // --- Financial IQ Quiz (whatever the current mode's saved run shows) ---
  const quizKey = nonprofit ? "wc.quiz.nonprofit" : "wc.quiz.standard";
  const quizPool = nonprofit ? NONPROFIT_QUESTIONS : STANDARD_QUESTIONS;
  const quizProgress = readJSON<QuizProgress | null>(quizKey, null);
  const quiz = (() => {
    if (!quizProgress || quizProgress.draw.length === 0) return { hasData: false, correct: 0, total: 0, answered: 0 };
    const score = calcQuizScore(quizPool, quizProgress);
    return { hasData: score.answered > 0, correct: score.correct, total: score.total, answered: score.answered };
  })();

  // --- Employees & Payroll ---
  const employeesState = readJSON<EmployeesState>(EMPLOYEES_STORAGE_KEY, DEFAULT_EMPLOYEES_STATE);
  const employees = (() => {
    if (employeesState.employees.length === 0) return { hasData: false, headcount: 0, totalCost: 0 };
    const costs = calcAllEmployeeCosts(employeesState, nonprofit);
    return {
      hasData: true,
      headcount: employeesState.employees.length,
      totalCost: costs.reduce((s, c) => s + c.totalCost, 0),
    };
  })();

  // --- Grant Tracking ---
  const grantsState = readJSON<GrantsState>(GRANTS_STORAGE_KEY, DEFAULT_GRANTS_STATE);
  const grants = (() => {
    if (grantsState.grants.length === 0) return { hasData: false, totalRequested: 0, totalAwarded: 0, pendingCount: 0 };
    const t = calcGrantTotals(grantsState.grants);
    return { hasData: true, totalRequested: t.totalRequested, totalAwarded: t.totalAwarded, pendingCount: t.pendingCount };
  })();

  // --- Grant Writing Tool (only proposals whose grant still exists in
  // Grant Tracking count — see proposalsForGrants in lib/grantWriting.ts) ---
  const writingState = readJSON<GrantWritingState>(GRANT_WRITING_STORAGE_KEY, DEFAULT_GRANT_WRITING_STATE);
  const grantWriting = (() => {
    const t = calcGrantWritingTotals(
      { ...DEFAULT_GRANT_WRITING_STATE, ...writingState, proposals: writingState.proposals ?? {} },
      grantsState.grants
    );
    return {
      hasData: t.sectionsWritten > 0 || t.orgProfileStarted,
      proposalsStarted: t.proposalsStarted,
      sectionsWritten: t.sectionsWritten,
      orgProfileComplete: t.orgProfileComplete,
    };
  })();

  // --- Donor Retention Rate (only counts once it produces a valid rate —
  // an "invalid" entry, more returning donors than last year's total,
  // stays "not started" rather than showing a nonsense percentage) ---
  const drInput = readJSON<DonorRetentionInput>(DONOR_RETENTION_STORAGE_KEY, DEFAULT_DONOR_RETENTION);
  const donorRetention = (() => {
    const dr = calcDonorRetention({ ...DEFAULT_DONOR_RETENTION, ...drInput });
    if (dr.status !== "ok") return { hasData: false, ratePct: 0, label: "", tone: "warning" as const };
    return { hasData: true, ratePct: dr.ratePct, label: dr.label, tone: dr.tone };
  })();

  // --- Financial Health (counts once there are annual expenses to
  // measure against AND some cash or reserve entered — expenses alone
  // would show a misleading "0 days, critical") ---
  const fhInput = { ...DEFAULT_FINANCIAL_HEALTH, ...readJSON<Partial<FinancialHealthInput>>(FINANCIAL_HEALTH_STORAGE_KEY, {}) };
  const financialHealth = (() => {
    const fh = calcFinancialHealth(fhInput);
    if (fh.status !== "ok" || (fhInput.cash <= 0 && fhInput.reserveFunds <= 0)) {
      return { hasData: false, daysCash: 0, reserveMonths: 0, reserveLabel: "", tone: "critical" as const };
    }
    return {
      hasData: true,
      daysCash: fh.daysCash,
      reserveMonths: fh.reserveMonths,
      reserveLabel: fh.reserveLabel,
      tone: worseTone(fh.daysTone, fh.reserveTone),
    };
  })();

  // --- 990 Compliance (counts once a valid fiscal year end is entered —
  // the deadline is the point of the panel; the form alone isn't) ---
  const f990Input = { ...DEFAULT_FORM_990, ...readJSON<Partial<Form990Input>>(FORM_990_STORAGE_KEY, {}) };
  const form990 = (() => {
    const f = calcForm990(f990Input);
    if (f.deadline.status === "passed") {
      return { hasData: true, formLabel: f.formLabel, passed: true, daysRemaining: 0, label: "Deadline passed", tone: "critical" as const };
    }
    if (f.deadline.status === "upcoming") {
      return { hasData: true, formLabel: f.formLabel, passed: false, daysRemaining: f.deadline.daysRemaining, label: f.deadline.label, tone: f.deadline.tone };
    }
    return { hasData: false, formLabel: "", passed: false, daysRemaining: 0, label: "", tone: "good" as const };
  })();

  // --- Paycheck Checkup ---
  const pcInput = readJSON<PaycheckCheckupInput>(PAYCHECK_CHECKUP_STORAGE_KEY, DEFAULT_PAYCHECK_CHECKUP);
  const paycheckCheckup = (() => {
    if (pcInput.payAmount <= 0) return { hasData: false, isRefund: false, federalGap: 0, contributionGap: 0 };
    const pc = runPaycheckCheckup(pcInput);
    const contributionGap = pc.gap401k + pc.iraGap + (pc.hsaEligible ? pc.hsaGap : 0);
    return { hasData: true, isRefund: pc.federalIsRefund, federalGap: pc.federalOwedOrRefund, contributionGap };
  })();

  return {
    budgeting,
    reserve,
    investments,
    breakeven,
    estimator,
    mileage,
    bizExpenses,
    scheduleC,
    balanceSheet,
    billing,
    debt,
    quiz,
    employees,
    grants,
    grantWriting,
    donorRetention,
    financialHealth,
    form990,
    paycheckCheckup,
  };
}
