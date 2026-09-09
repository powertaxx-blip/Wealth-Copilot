/**
 * Tax Year 2025 (filed 2026) calculation core — federal, self-employment,
 * all-50-states-+-DC state tax, a generic local tax field, EITC, and Child
 * Tax Credit.
 *
 * Direct port of the pure functions inside the `<script>` block of the
 * original prototype (`power-taxx-app.html`): FEDERAL_BRACKETS,
 * STANDARD_DEDUCTION, SS_WAGE_BASE_2025, CTC_PHASEOUT_START, EITC_TABLE,
 * calcFederalTax(), calcSETax(), calcEITC(). The numbers are copied
 * unchanged — only the surrounding code changed shape, from functions
 * that read/write the DOM to functions that take plain arguments and
 * return plain objects, since React (not document.getElementById) now
 * owns rendering.
 *
 * Source citations for the constants live as comments here exactly as
 * they did in the prototype: IRS Rev. Proc. 2024-40 for brackets/EITC,
 * OBBBA-adjusted standard deduction for 2025.
 *
 * State tax moved from a single hardcoded Pennsylvania rate to
 * calcStateTax() in lib/stateTax.ts, covering all 50 states + DC — see
 * that file for sourcing notes and the simplifications it makes. Local
 * (city/county) tax stays a manual rate + flat-fee field, same as before,
 * because there is no honest way to hardcode thousands of local
 * jurisdictions nationwide.
 */
import { calcStateTax, type USState } from "@/lib/stateTax";

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh";

export const FEDERAL_BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [[0, 0.1], [11925, 0.12], [48475, 0.22], [103350, 0.24], [197300, 0.32], [250525, 0.35], [626350, 0.37]],
  mfj: [[0, 0.1], [23850, 0.12], [96950, 0.22], [206700, 0.24], [394600, 0.32], [501050, 0.35], [751600, 0.37]],
  mfs: [[0, 0.1], [11925, 0.12], [48475, 0.22], [103350, 0.24], [197300, 0.32], [250525, 0.35], [375800, 0.37]],
  hoh: [[0, 0.1], [17000, 0.12], [64850, 0.22], [103350, 0.24], [197300, 0.32], [250500, 0.35], [626350, 0.37]],
};

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15750,
  mfj: 31500,
  mfs: 15750,
  hoh: 23625,
};

export const SS_WAGE_BASE_2025 = 176100;

export const CTC_PHASEOUT_START: Record<FilingStatus, number> = {
  single: 200000,
  mfs: 200000,
  hoh: 200000,
  mfj: 400000,
};

/** 2025 EITC parameters — Tax Policy Center / IRS Rev. Proc. 2024-40.
 *  MFS filers are generally ineligible for EITC (except rare
 *  separated-spouse exceptions), so MFS is excluded and handled as a
 *  special case in calcEITC(). */
const EITC_TABLE: Record
  number,
  { phaseInRate: number; maxCredit: number; phaseoutBegin: Partial<Record<FilingStatus, number>>; phaseoutRate: number }
> = {
  0: { phaseInRate: 0.0765, maxCredit: 649, phaseoutBegin: { single: 10620, hoh: 10620, mfj: 17730 }, phaseoutRate: 0.0765 },
  1: { phaseInRate: 0.34, maxCredit: 4328, phaseoutBegin: { single: 23350, hoh: 23350, mfj: 30470 }, phaseoutRate: 0.1598 },
  2: { phaseInRate: 0.4, maxCredit: 7152, phaseoutBegin: { single: 23350, hoh: 23350, mfj: 30470 }, phaseoutRate: 0.2106 },
  3: { phaseInRate: 0.45, maxCredit: 8046, phaseoutBegin: { single: 23350, hoh: 23350, mfj: 30470 }, phaseoutRate: 0.2106 },
};

export const EITC_INVESTMENT_INCOME_LIMIT_2025 = 11950;

function eitcFromIncome(income: number, params: (typeof EITC_TABLE)[number], status: FilingStatus): number {
  const begin = params.phaseoutBegin[status] ?? params.phaseoutBegin.single!;
  let credit = Math.min(income * params.phaseInRate, params.maxCredit);
  if (income > begin) {
    credit = params.maxCredit - (income - begin) * params.phaseoutRate;
  }
  return Math.max(0, credit);
}

export function calcEITC(earnedIncome: number, agi: number, numKids: number, status: FilingStatus, investmentIncome: number): number {
  if (status === "mfs") return 0;
  if (investmentIncome > EITC_INVESTMENT_INCOME_LIMIT_2025) return 0;
  const kids = Math.min(Math.max(0, Math.round(numKids)), 3);
  const params = EITC_TABLE[kids];
  const byEarned = eitcFromIncome(earnedIncome, params, status);
  const byAGI = eitcFromIncome(agi, params, status);
  return Math.round(Math.min(byEarned, byAGI));
}

export function calcFederalTax(taxableIncome: number, status: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[status];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i];
    const next = brackets[i + 1] ? brackets[i + 1][0] : Infinity;
    if (taxableIncome > floor) {
      tax += (Math.min(taxableIncome, next) - floor) * rate;
    } else break;
  }
  return tax;
}

export function calcSETax(netProfit: number): { seTax: number; deduction: number; netEarnings: number } {
  if (netProfit <= 0) return { seTax: 0, deduction: 0, netEarnings: 0 };
  const netEarnings = netProfit * 0.9235;
  const ssTax = Math.min(netEarnings, SS_WAGE_BASE_2025) * 0.124;
  const medicareTax = netEarnings * 0.029;
  const seTax = ssTax + medicareTax;
  return { seTax, deduction: seTax / 2, netEarnings };
}
