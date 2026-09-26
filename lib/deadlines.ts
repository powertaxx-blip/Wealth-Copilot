/**
 * Upcoming Deadlines — one list on Home of the dates that already exist
 * scattered across other panels:
 *   - quarterly estimated tax payments (Tax Estimator, when it shows one owed)
 *   - the Form 990 deadline, or its Form 8868 extended date (990 Compliance)
 *   - grant application deadlines still being researched or drafted (Grant Tracking)
 *   - 1099-NEC filing, when any contractor needs one (1099 Contractors)
 *   - W-2 filing, when anyone is on payroll (Employees & Payroll)
 *
 * Read-only, like Snapshot: this never writes to another panel's key.
 * buildDeadlines() is pure (everything passed in, "today" included) so
 * it's testable; readDeadlineSources() does the localStorage reads.
 * Dates are UTC calendar dates, same convention as lib/form990.ts.
 */

import { fmt } from "@/lib/format";
import { estimateTax, type EstimatorInput } from "@/lib/tax";
import { calcForm990, parseISODate, DEFAULT_FORM_990, FORM_990_STORAGE_KEY, type Form990Input } from "@/lib/form990";
import { GRANTS_STORAGE_KEY, type Grant } from "@/lib/grants";
import {
  calcContractorTotals,
  nec1099DueDate,
  validContractors,
  CONTRACTORS_STORAGE_KEY,
  DEFAULT_CONTRACTORS_STATE,
  type ContractorsState,
} from "@/lib/contractors";
import { EMPLOYEES_STORAGE_KEY } from "@/lib/employees";

const DAY_MS = 86_400_000;
export const DEADLINE_WINDOW_DAYS = 120;

export type Deadline = {
  id: string;
  due: number; // UTC midnight
  title: string;
  detail: string;
  href: string;
  overdue: boolean;
};

export type DeadlineSources = {
  estimator: EstimatorInput | null;
  form990: Form990Input | null;
  grants: Grant[];
  contractors: ContractorsState | null;
  hasEmployees: boolean;
};

/** A weekend due date moves to the following Monday. */
function businessDay(t: number): number {
  const dow = new Date(t).getUTCDay();
  return t + (dow === 6 ? 2 : dow === 0 ? 1 : 0) * DAY_MS;
}

/** The next quarterly estimated-tax due date on or after `today`
 * (Apr 15, Jun 15, Sep 15, and Jan 15 of the following year). */
export function nextEstimatedTaxDate(today: number): { due: number; label: string } {
  const year = new Date(today).getUTCFullYear();
  const candidates = [
    { due: businessDay(Date.UTC(year, 0, 15)), label: `4th-quarter ${year - 1} payment` },
    { due: businessDay(Date.UTC(year, 3, 15)), label: `1st-quarter ${year} payment` },
    { due: businessDay(Date.UTC(year, 5, 15)), label: `2nd-quarter ${year} payment` },
    { due: businessDay(Date.UTC(year, 8, 15)), label: `3rd-quarter ${year} payment` },
    { due: businessDay(Date.UTC(year + 1, 0, 15)), label: `4th-quarter ${year} payment` },
  ];
  return candidates.find((c) => c.due >= today)!;
}

export function buildDeadlines(src: DeadlineSources, today: number, windowDays = DEADLINE_WINDOW_DAYS): Deadline[] {
  const out: Deadline[] = [];
  const horizon = today + windowDays * DAY_MS;

  // Estimated taxes — only when the Tax Estimator actually shows one owed.
  if (src.estimator) {
    try {
      const q = estimateTax(src.estimator).quarterlyPayment;
      if (q > 0) {
        const next = nextEstimatedTaxDate(today);
        out.push({
          id: "estimated-tax",
          due: next.due,
          title: "Estimated tax payment",
          detail: `${next.label} — about ${fmt(q)}, per your Tax Estimator`,
          href: "/estimator",
          overdue: false,
        });
      }
    } catch {
      // A malformed saved estimator shouldn't take down the whole list.
    }
  }

  // Form 990 — the regular deadline, or the extended one once it's passed.
  if (src.form990 && src.form990.fiscalYearEnd) {
    const f = calcForm990({ ...DEFAULT_FORM_990, ...src.form990 }, today);
    const d = f.deadline;
    if (d.status === "upcoming") {
      out.push({ id: "form990", due: d.due, title: `Form ${f.form} due`, detail: f.formLabel, href: "/form990", overdue: false });
    } else if (d.status === "passed") {
      if (d.extendedDue !== null && d.extendedDue >= today) {
        out.push({
          id: "form990-extended",
          due: d.extendedDue,
          title: `Form ${f.form} extended deadline`,
          detail: "Only if you filed Form 8868 by the original deadline",
          href: "/form990",
          overdue: false,
        });
      } else {
        out.push({ id: "form990", due: d.due, title: `Form ${f.form} deadline passed`, detail: "File as soon as you can", href: "/form990", overdue: true });
      }
    }
  }

  // Grant applications still in progress with a real date entered.
  for (const g of src.grants) {
    if (g.status !== "researching" && g.status !== "drafting") continue;
    const due = parseISODate(g.applicationDeadline ?? "");
    if (due === null || due < today) continue;
    out.push({
      id: `grant-${g.id}`,
      due,
      title: `Grant application: ${g.grantName}`,
      detail: g.funderName ? `To ${g.funderName}` : "Application deadline",
      href: "/grants",
      overdue: false,
    });
  }

  // 1099-NECs — only if at least one contractor needs one.
  if (src.contractors) {
    const t = calcContractorTotals(src.contractors);
    const due = nec1099DueDate(src.contractors.taxYear);
    if (t.needing1099 > 0 && due >= today) {
      out.push({
        id: "1099-nec",
        due,
        title: `File ${t.needing1099} Form 1099-NEC${t.needing1099 === 1 ? "" : "s"}`,
        detail: t.missingW9 ? `For ${src.contractors.taxYear} payments — ${t.missingW9} still missing a W-9` : `For ${src.contractors.taxYear} payments`,
        href: "/contractors",
        overdue: false,
      });
    }
  }

  // W-2s — due Jan 31 for the year just ended, to employees and the SSA.
  if (src.hasEmployees) {
    const year = new Date(today).getUTCFullYear();
    // Before this year's Jan 31 passes, last year's W-2s are the ones due.
    const thisJan31 = businessDay(Date.UTC(year, 0, 31));
    const due = today <= thisJan31 ? thisJan31 : businessDay(Date.UTC(year + 1, 0, 31));
    const forYear = new Date(due).getUTCFullYear() - 1;
    out.push({ id: "w2", due, title: "W-2s due", detail: `For ${forYear} wages — to employees and the Social Security Administration`, href: "/employees", overdue: false });
  }

  return out
    .filter((d) => d.overdue || d.due <= horizon)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.due - b.due);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Client-only: reads every source panel's saved state. */
export function readDeadlineSources(): DeadlineSources {
  const grantsState = readJSON<{ grants?: unknown }>(GRANTS_STORAGE_KEY, {});
  const grants = Array.isArray(grantsState.grants)
    ? (grantsState.grants as Grant[]).filter((g) => g && typeof g.id === "string" && typeof g.grantName === "string")
    : [];
  const contractorsRaw = readJSON<Partial<ContractorsState> | null>(CONTRACTORS_STORAGE_KEY, null);
  const employees = readJSON<{ employees?: unknown }>(EMPLOYEES_STORAGE_KEY, {});
  return {
    estimator: readJSON<EstimatorInput | null>("wc.estimator", null),
    form990: readJSON<Form990Input | null>(FORM_990_STORAGE_KEY, null),
    grants,
    contractors: contractorsRaw
      ? {
          taxYear: Number.isInteger(contractorsRaw.taxYear) ? (contractorsRaw.taxYear as number) : DEFAULT_CONTRACTORS_STATE.taxYear,
          contractors: validContractors(contractorsRaw.contractors),
        }
      : null,
    hasEmployees: Array.isArray(employees.employees) && employees.employees.length > 0,
  };
}

export function daysUntil(due: number, today: number): number {
  return Math.round((due - today) / DAY_MS);
}
