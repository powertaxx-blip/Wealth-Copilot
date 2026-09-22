/**
 * Employees & Payroll — the first panel in this app about paying someone
 * ELSE, not the business owner's own income or expenses. It's kept as its
 * own top-level nav group instead of living inside "File" alongside
 * Schedule C and Business Expenses on purpose: a W-2 employee is a
 * genuinely different animal from a 1099 contractor or the owner's own
 * self-employment numbers everywhere else in this app. Hiring someone as
 * an employee means the BUSINESS itself owes a second, separate tax bill
 * on top of the wage — Social Security, Medicare, and unemployment
 * insurance — that a 1099 contractor never triggers at all.
 *
 * Every figure below is a real, independently-verified 2025 number, not a
 * guess (same grounding discipline as lib/tax.ts and lib/stateTax.ts):
 *  - Social Security wage base: $176,100/employee (up from $168,600 in
 *    2024) — IRS/SSA, 2025.
 *  - Social Security employer rate: 6.2%, applied up to that wage base.
 *  - Medicare employer rate: 1.45% — no wage base cap; every dollar of
 *    wages owes this (the extra 0.9% Additional Medicare Tax above
 *    $200,000 is an EMPLOYEE withholding, never an employer cost, so it's
 *    deliberately left out of this employer-side calculator).
 *  - FUTA: 6.0% on the first $7,000/employee, netting to 0.6% after the
 *    standard 5.4% credit employers get for paying state unemployment on
 *    time. This assumes the employer's state isn't a "credit reduction"
 *    state for the year — a handful of states lose part of that credit
 *    in years they're still repaying federal unemployment loans, which
 *    would push the real FUTA rate higher. Worth confirming your own
 *    state isn't on the DOL's credit-reduction list for the year you're
 *    filing.
 *  - 501(c)(3) organizations are FUTA-exempt by law (IRS: FUTA doesn't
 *    apply to a qualifying 501(c)(3)'s employee wages) but are NOT exempt
 *    from Social Security/Medicare — so Nonprofit Mode below drops FUTA
 *    from the total but keeps FICA.
 *  - PA new-employer UC rate (non-construction): 3.8220%, taxable wage
 *    base $10,000/employee — PA Department of Labor & Industry, in effect
 *    2023-present. This is only a starting default: your state and your
 *    OWN assigned rate (unemployment tax is experience-rated, not flat)
 *    are both editable below.
 */

export const EMPLOYEES_STORAGE_KEY = "wc.employees";

export type PayType = "hourly" | "salary";

export type Employee = {
  id: string;
  name: string;
  role: string;
  payType: PayType;
  rate: number; // $/hour when payType is "hourly", annual $ salary when "salary"
  hoursPerWeek: number; // only meaningful when payType === "hourly"
};

export type EmployeesState = {
  employees: Employee[];
  sutaRatePct: number; // employer state unemployment rate, as a percent (e.g. 3.822)
  sutaWageBase: number; // state UC taxable wage base per employee, in dollars
};

// PA new-employer (non-construction) rate + PA's UC taxable wage base —
// see file header for sources. Any state/rate works; these are just a
// sane starting point given this app's Chester County, PA focus.
export const DEFAULT_EMPLOYEES_STATE: EmployeesState = {
  employees: [],
  sutaRatePct: 3.822,
  sutaWageBase: 10_000,
};

export function blankEmployee(): Employee {
  return { id: crypto.randomUUID(), name: "", role: "", payType: "hourly", rate: 0, hoursPerWeek: 0 };
}

export function annualGrossWages(e: Employee): number {
  if (e.payType === "salary") return Math.max(0, e.rate);
  return Math.max(0, e.rate) * Math.max(0, e.hoursPerWeek) * 52;
}

export const SS_WAGE_BASE_2025 = 176_100;
export const SS_EMPLOYER_RATE = 0.062;
export const MEDICARE_EMPLOYER_RATE = 0.0145;
export const FUTA_WAGE_BASE = 7_000;
export const FUTA_NET_RATE = 0.006; // 6.0% standard rate minus the standard 5.4% timely-payment credit

export type EmployeeCost = {
  employee: Employee;
  grossWages: number;
  socialSecurity: number;
  medicare: number;
  futa: number;
  suta: number;
  totalEmployerTax: number;
  totalCost: number;
};

/** Employer-side cost of one employee for a full year. `nonprofit` drops
 * FUTA (501(c)(3) organizations are exempt by law — see file header) but
 * keeps Social Security, Medicare, and state unemployment, since none of
 * those are nonprofit-exempt. */
export function calcEmployeeCost(e: Employee, state: EmployeesState, nonprofit: boolean): EmployeeCost {
  const grossWages = annualGrossWages(e);
  const socialSecurity = Math.min(grossWages, SS_WAGE_BASE_2025) * SS_EMPLOYER_RATE;
  const medicare = grossWages * MEDICARE_EMPLOYER_RATE;
  const futa = nonprofit ? 0 : Math.min(grossWages, FUTA_WAGE_BASE) * FUTA_NET_RATE;
  const sutaWageBase = Math.max(0, state.sutaWageBase);
  const sutaRate = Math.max(0, state.sutaRatePct) / 100;
  const suta = Math.min(grossWages, sutaWageBase) * sutaRate;
  const totalEmployerTax = socialSecurity + medicare + futa + suta;
  return { employee: e, grossWages, socialSecurity, medicare, futa, suta, totalEmployerTax, totalCost: grossWages + totalEmployerTax };
}

export function calcAllEmployeeCosts(state: EmployeesState, nonprofit: boolean): EmployeeCost[] {
  return state.employees.map((e) => calcEmployeeCost(e, state, nonprofit));
}
