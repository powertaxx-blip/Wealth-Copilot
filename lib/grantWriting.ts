/**
 * Grant Writing Tool — proposal drafting for grants already logged in
 * Grant Tracking (lib/grants.ts). Kept under its own storage key rather
 * than widening the Grant record: a Grant stays the small pipeline row
 * Grant Tracking and Snapshot already read, and proposal text (which can
 * run to thousands of characters per section) lives here, keyed by the
 * grant's id. A proposal whose grant has since been removed from Grant
 * Tracking is simply ignored — see proposalsForGrants().
 *
 * The Organization Profile is filled out once and shared by every
 * proposal, so the same mission/founding/tax-status details never have
 * to be retyped per grant.
 */

import type { Grant } from "@/lib/grants";

export const GRANT_WRITING_STORAGE_KEY = "wc.grantWriting";

export type ProposalSectionKey =
  | "orgBackground"
  | "statementOfNeed"
  | "goalsObjectives"
  | "methodology"
  | "budgetNarrative"
  | "evaluationPlan"
  | "sustainabilityPlan";

export type ProposalSections = Record<ProposalSectionKey, string>;

export type TaxExemptStatus = "" | "501c3" | "501cOther" | "pending" | "fiscalSponsor" | "notExempt";

export type OrgProfile = {
  orgName: string;
  mission: string;
  foundingYear: string; // free text, same convention as Grant Tracking's dates
  taxExemptStatus: TaxExemptStatus;
  keyAchievements: string;
};

export type GrantWritingState = {
  orgProfile: OrgProfile;
  proposals: Record<string, ProposalSections>; // keyed by Grant.id
};

export const PROPOSAL_SECTIONS: { key: ProposalSectionKey; label: string; help: string; placeholder: string }[] = [
  {
    key: "orgBackground",
    label: "Organization Background",
    help: "Who you are, how long you've been doing this work, and why you're credible to do it. Funders read this to decide whether to trust you with the money.",
    placeholder: "Who you are, when you started, and what you've accomplished — or pull in your Organization Profile below.",
  },
  {
    key: "statementOfNeed",
    label: "Statement of Need",
    help: "The problem this grant will address and who it affects. The strongest ones use real local data you can cite, not general statements.",
    placeholder: "What problem are you solving, for whom, and how do you know it's real?",
  },
  {
    key: "goalsObjectives",
    label: "Goals and Objectives",
    help: "Goals are the big-picture outcome; objectives are the specific, measurable steps toward it (how many, by when).",
    placeholder: "What will be different when this grant is done? List measurable objectives if you have them.",
  },
  {
    key: "methodology",
    label: "Methodology / Program Plan",
    help: "How the work actually gets done — activities, who does them, and the timeline. This is where program details go.",
    placeholder: "Activities, staff or volunteers involved, timeline, and where the work happens.",
  },
  {
    key: "budgetNarrative",
    label: "Budget Narrative",
    help: "Explains each budget line in words — why each cost is needed and how it was calculated. It should match your budget spreadsheet exactly.",
    placeholder: "What the money pays for, line by line, and why each cost is necessary.",
  },
  {
    key: "evaluationPlan",
    label: "Evaluation Plan",
    help: "How you'll measure whether the program worked, and what you'll report back to the funder.",
    placeholder: "What you'll measure, how you'll collect it, and when you'll report results.",
  },
  {
    key: "sustainabilityPlan",
    label: "Sustainability Plan",
    help: "How the program continues after this grant runs out — other funding, earned revenue, partnerships.",
    placeholder: "How will this work keep going once this grant's money is spent?",
  },
];

export const PROPOSAL_SECTION_KEYS: ProposalSectionKey[] = PROPOSAL_SECTIONS.map((s) => s.key);

export const TAX_EXEMPT_OPTIONS: { value: TaxExemptStatus; label: string }[] = [
  { value: "", label: "Select…" },
  { value: "501c3", label: "501(c)(3) public charity or foundation" },
  { value: "501cOther", label: "Other 501(c) organization" },
  { value: "pending", label: "Tax-exempt application pending" },
  { value: "fiscalSponsor", label: "Fiscally sponsored project" },
  { value: "notExempt", label: "Not tax-exempt (business or individual)" },
];

export const BLANK_ORG_PROFILE: OrgProfile = {
  orgName: "",
  mission: "",
  foundingYear: "",
  taxExemptStatus: "",
  keyAchievements: "",
};

export const DEFAULT_GRANT_WRITING_STATE: GrantWritingState = {
  orgProfile: BLANK_ORG_PROFILE,
  proposals: {},
};

export function blankProposal(): ProposalSections {
  return {
    orgBackground: "",
    statementOfNeed: "",
    goalsObjectives: "",
    methodology: "",
    budgetNarrative: "",
    evaluationPlan: "",
    sustainabilityPlan: "",
  };
}

export function taxExemptLabel(status: TaxExemptStatus): string {
  return TAX_EXEMPT_OPTIONS.find((o) => o.value === status && o.value !== "")?.label ?? "";
}

export function isOrgProfileStarted(p: OrgProfile): boolean {
  return Boolean(p.orgName.trim() || p.mission.trim() || p.foundingYear.trim() || p.taxExemptStatus || p.keyAchievements.trim());
}

export function isOrgProfileComplete(p: OrgProfile): boolean {
  return Boolean(p.orgName.trim() && p.mission.trim() && p.foundingYear.trim() && p.taxExemptStatus && p.keyAchievements.trim());
}

/** The Organization Profile as plain paragraphs, ready to drop into a
 * proposal's Organization Background section. Only includes what's been
 * filled in — never a "Founded in ." sentence with a blank. */
export function orgProfileToText(p: OrgProfile): string {
  const name = p.orgName.trim() || "Our organization";
  const lines: string[] = [];
  const intro: string[] = [];
  if (p.foundingYear.trim()) intro.push(`${name} was founded in ${p.foundingYear.trim()}.`);
  const status = taxExemptLabel(p.taxExemptStatus);
  if (status) intro.push(`Tax-exempt status: ${status}.`);
  if (intro.length) lines.push(intro.join(" "));
  if (p.mission.trim()) lines.push(`Mission: ${p.mission.trim()}`);
  if (p.keyAchievements.trim()) lines.push(`Key achievements:\n${p.keyAchievements.trim()}`);
  return lines.join("\n\n");
}

/** A saved proposal merged onto a blank one, so a section added in a
 * later version never reaches the UI as `undefined` — same reasoning as
 * useLocalStorageState's merge-onto-initial for plain objects. */
export function proposalFor(state: GrantWritingState, grantId: string): ProposalSections {
  return { ...blankProposal(), ...(state.proposals[grantId] ?? {}) };
}

export function countFilledSections(p: ProposalSections): number {
  return PROPOSAL_SECTION_KEYS.filter((k) => (p[k] ?? "").trim().length > 0).length;
}

export function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Only proposals whose grant still exists in Grant Tracking. */
export function proposalsForGrants(state: GrantWritingState, grants: Grant[]): { grant: Grant; proposal: ProposalSections }[] {
  return grants
    .filter((g) => state.proposals[g.id])
    .map((g) => ({ grant: g, proposal: proposalFor(state, g.id) }));
}

export type GrantWritingTotals = {
  proposalsStarted: number; // grants with at least one section written
  sectionsWritten: number; // across all of them
  orgProfileComplete: boolean;
  orgProfileStarted: boolean;
};

export function calcGrantWritingTotals(state: GrantWritingState, grants: Grant[]): GrantWritingTotals {
  let proposalsStarted = 0;
  let sectionsWritten = 0;
  for (const { proposal } of proposalsForGrants(state, grants)) {
    const n = countFilledSections(proposal);
    if (n > 0) proposalsStarted++;
    sectionsWritten += n;
  }
  const profile = { ...BLANK_ORG_PROFILE, ...state.orgProfile };
  return {
    proposalsStarted,
    sectionsWritten,
    orgProfileComplete: isOrgProfileComplete(profile),
    orgProfileStarted: isOrgProfileStarted(profile),
  };
}
