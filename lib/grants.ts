/**
 * Grant Tracking — a nonprofit's pipeline of grant applications, from
 * first research through a funder's final decision. Distinct from
 * Invoices/Donation Receipts (money already given) and from Balance
 * Sheet's "Pledges / grants receivable" line (a grant already awarded,
 * waiting to be collected): this panel is the earlier, riskier stage —
 * money asked for that may or may not come through, tracked from the
 * moment someone starts researching a funder.
 *
 * Same list/CRUD shape as Employees & Payroll: an array of records in
 * local storage, add/remove handlers, totals derived with useMemo.
 */

export const GRANTS_STORAGE_KEY = "wc.grants";

export type GrantStatus = "researching" | "drafting" | "submitted" | "awarded" | "declined";

export type Grant = {
  id: string;
  grantName: string;
  funderName: string;
  amountRequested: number;
  amountAwarded: number;
  applicationDeadline: string; // free-text date, e.g. "2026-03-15" — same convention as Invoices' due date
  decisionDate: string;
  status: GrantStatus;
};

export type GrantsState = {
  grants: Grant[];
};

export const DEFAULT_GRANTS_STATE: GrantsState = { grants: [] };

export const GRANT_STATUS_OPTIONS: { value: GrantStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "drafting", label: "Drafting" },
  { value: "submitted", label: "Submitted" },
  { value: "awarded", label: "Awarded" },
  { value: "declined", label: "Declined" },
];

export function blankGrant(): Grant {
  return {
    id: crypto.randomUUID(),
    grantName: "",
    funderName: "",
    amountRequested: 0,
    amountAwarded: 0,
    applicationDeadline: "",
    decisionDate: "",
    status: "researching",
  };
}

/** Tone for the same .status-pill classes StatusPill renders — "neutral"
 * covers the two pre-decision stages that aren't good, bad, or waiting
 * on someone else yet. */
export function grantStatusTone(status: GrantStatus): "good" | "warning" | "critical" | "neutral" {
  switch (status) {
    case "awarded":
      return "good";
    case "declined":
      return "critical";
    case "submitted":
      return "warning";
    default:
      return "neutral";
  }
}

/** Soonest deadline first; grants with no deadline entered sink to the
 * bottom rather than sorting as if their deadline were already past. */
export function grantsSortedByDeadline(grants: Grant[]): Grant[] {
  return [...grants].sort((a, b) => {
    if (!a.applicationDeadline && !b.applicationDeadline) return 0;
    if (!a.applicationDeadline) return 1;
    if (!b.applicationDeadline) return -1;
    return a.applicationDeadline.localeCompare(b.applicationDeadline);
  });
}

export type GrantTotals = {
  totalRequested: number;
  totalAwarded: number;
  pendingCount: number; // researching + drafting + submitted
  awardRatePct: number | null; // null once nothing has been decided yet
};

export function calcGrantTotals(grants: Grant[]): GrantTotals {
  let totalRequested = 0;
  let totalAwarded = 0;
  let pendingCount = 0;
  let decidedCount = 0;
  let awardedCount = 0;
  for (const g of grants) {
    totalRequested += Math.max(0, g.amountRequested);
    if (g.status === "awarded") {
      totalAwarded += Math.max(0, g.amountAwarded);
      decidedCount++;
      awardedCount++;
    } else if (g.status === "declined") {
      decidedCount++;
    } else {
      pendingCount++;
    }
  }
  const awardRatePct = decidedCount > 0 ? (awardedCount / decidedCount) * 100 : null;
  return { totalRequested, totalAwarded, pendingCount, awardRatePct };
}
