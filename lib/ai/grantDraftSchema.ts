import {
  PROPOSAL_SECTION_KEYS,
  TAX_EXEMPT_OPTIONS,
  type OrgProfile,
  type ProposalSectionKey,
  type ProposalSections,
  type TaxExemptStatus,
} from "@/lib/grantWriting";

/**
 * Input boundary for the Grant Writing "Draft with AI" feature — same
 * throw-don't-coerce discipline as lib/ai/schema.ts and scheduleCSchema.ts.
 *
 * One deliberate difference from those two: they guarantee no
 * user-authored string ever reaches the prompt. That can't hold here —
 * drafting a proposal from the user's own org profile and program notes
 * IS the feature. What's enforced instead: every field is a known key
 * with a length cap, angle brackets are stripped (so user text can't
 * close the <app_data> block the prompt wraps it in), the section being
 * drafted and the tax-exempt status come from fixed allowlists, and the
 * system prompt tells the model to treat everything inside <app_data> as
 * data, never as instructions. The text only ever came from this same
 * user's own browser, and the output still goes through
 * sanitizeExplainResponse's markup stripping and grounding check.
 */

export type GrantDraftRequest = {
  section: ProposalSectionKey;
  grant: { grantName: string; funderName: string; amountRequested: number; applicationDeadline: string };
  orgProfile: OrgProfile;
  sections: ProposalSections;
};

export class GrantDraftInputValidationError extends Error {}

const MAX_SHORT = 200; // names, dates, founding year
const MAX_PROFILE_TEXT = 2_000; // mission, key achievements
const MAX_SECTION_TEXT = 6_000; // each proposal section
const AMOUNT_BOUNDS = 50_000_000; // matches lib/ai/schema.ts's RESULT_BOUNDS
const ALLOWED_TAX_STATUSES: ReadonlySet<string> = new Set(TAX_EXEMPT_OPTIONS.map((o) => o.value));

function cleanText(name: string, v: unknown, max: number): string {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") {
    throw new GrantDraftInputValidationError(`"${name}" must be a string`);
  }
  if (v.length > max) {
    throw new GrantDraftInputValidationError(`"${name}" is longer than ${max} characters`);
  }
  // Angle brackets out (see file header); other control characters out,
  // but newlines and tabs kept — paragraph breaks are meaningful here.
  return v.replace(/[<>]/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function asObject(name: string, v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new GrantDraftInputValidationError(`"${name}" must be an object`);
  }
  return v as Record<string, unknown>;
}

export function sanitizeGrantDraftRequest(raw: unknown): GrantDraftRequest {
  const body = asObject("body", raw);

  if (typeof body.section !== "string" || !(PROPOSAL_SECTION_KEYS as string[]).includes(body.section)) {
    throw new GrantDraftInputValidationError('"section" must be one of: ' + PROPOSAL_SECTION_KEYS.join(", "));
  }
  const section = body.section as ProposalSectionKey;

  const g = asObject("grant", body.grant);
  const grantName = cleanText("grant.grantName", g.grantName, MAX_SHORT);
  if (!grantName) {
    throw new GrantDraftInputValidationError('"grant.grantName" is required');
  }
  const amount = g.amountRequested ?? 0;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > AMOUNT_BOUNDS) {
    throw new GrantDraftInputValidationError('"grant.amountRequested" must be a number between 0 and 50,000,000');
  }
  const grant = {
    grantName,
    funderName: cleanText("grant.funderName", g.funderName, MAX_SHORT),
    amountRequested: amount,
    applicationDeadline: cleanText("grant.applicationDeadline", g.applicationDeadline, MAX_SHORT),
  };

  const p = asObject("orgProfile", body.orgProfile ?? {});
  const taxExemptStatus = p.taxExemptStatus ?? "";
  if (typeof taxExemptStatus !== "string" || !ALLOWED_TAX_STATUSES.has(taxExemptStatus)) {
    throw new GrantDraftInputValidationError('"orgProfile.taxExemptStatus" is not a recognized status');
  }
  const orgProfile: OrgProfile = {
    orgName: cleanText("orgProfile.orgName", p.orgName, MAX_SHORT),
    mission: cleanText("orgProfile.mission", p.mission, MAX_PROFILE_TEXT),
    foundingYear: cleanText("orgProfile.foundingYear", p.foundingYear, MAX_SHORT),
    taxExemptStatus: taxExemptStatus as TaxExemptStatus,
    keyAchievements: cleanText("orgProfile.keyAchievements", p.keyAchievements, MAX_PROFILE_TEXT),
  };

  const s = asObject("sections", body.sections ?? {});
  const sections = {} as ProposalSections;
  for (const key of PROPOSAL_SECTION_KEYS) {
    sections[key] = cleanText(`sections.${key}`, s[key], MAX_SECTION_TEXT);
  }

  return { section, grant, orgProfile, sections };
}
