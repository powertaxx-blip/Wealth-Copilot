/**
 * Wills & Estates — new panel, no equivalent in the original prototype.
 * Two small pieces of real math live here (the rest of the panel is
 * reference content, same as FAQ and parts of the Filing Status Guide):
 * a federal estate tax exposure estimate, and a bequest-language
 * generator for Nonprofit Mode's planned-giving content.
 *
 * 2025 federal estate/gift tax figures, verified directly against the
 * IRS's own Form 709 instructions (irs.gov/instructions/i709):
 * basic exclusion amount $13,990,000 per person, annual gift exclusion
 * $19,000 per recipient. The One Big Beautiful Bill Act (OBBBA, signed
 * July 2025) raises the basic exclusion to $15,000,000 per person
 * starting with the 2026 tax year and makes that higher exemption
 * permanent — no more built-in sunset back down to roughly half that
 * amount, which is what the pre-OBBBA law had scheduled for the end of
 * 2025. Both years are surfaced here since this app already frames
 * everything as "Tax Year 2025 (filed 2026)" — worth knowing the number
 * is about to move again, and for the better this time.
 */

export const ESTATE_EXCLUSION_2025 = 13_990_000;
export const ESTATE_EXCLUSION_2026 = 15_000_000;
export const ANNUAL_GIFT_EXCLUSION_2025 = 19_000;

export type MaritalStatusAtDeath = "single" | "married";

export type EstateExposureResult = {
  effectiveExclusion: number;
  taxableEstate: number;
  likelyExposed: boolean;
};

/**
 * A deliberately simplified estimate — real estate tax planning depends
 * on prior lifetime gifts already used against the exclusion, whether a
 * surviving spouse actually files the portability (DSUE) election, state
 * estate/inheritance taxes (many states apply their own, at thresholds
 * far below the federal one), and more. This exists to answer one
 * question honestly — "is this even something I need to think about?"
 * — not to replace an estate attorney's actual calculation.
 */
export function estimateEstateExposure(estateValue: number, maritalStatus: MaritalStatusAtDeath): EstateExposureResult {
  // Portability: a surviving spouse can elect to use whatever of the
  // first spouse's exclusion went unused, effectively doubling the
  // couple's combined shelter — but only if that election is actually
  // filed on a timely estate tax return for the first spouse to die.
  const effectiveExclusion = maritalStatus === "married" ? ESTATE_EXCLUSION_2025 * 2 : ESTATE_EXCLUSION_2025;
  const taxableEstate = Math.max(0, estateValue - effectiveExclusion);
  return { effectiveExclusion, taxableEstate, likelyExposed: taxableEstate > 0 };
}

export type BequestType = "specific" | "percentage" | "residuary";

export type BequestInput = {
  orgName: string;
  ein: string;
  bequestType: BequestType;
  specificAmount: number;
  percentage: number;
};

/**
 * Generates the plain-language bequest clause a donor's estate attorney
 * would still need to review and formally draft into the will — this is
 * a starting point for a conversation, not a legal document by itself.
 * Modeled on the same "generate the standard wording from a few fields"
 * approach as donationAcknowledgmentText() in lib/invoices.ts.
 */
export function bequestLanguage(input: BequestInput): string {
  const org = input.orgName.trim() || "[Your Organization's Legal Name]";
  const ein = input.ein.trim() || "[EIN]";
  const base = `I give, devise, and bequeath to ${org}, a nonprofit organization (EIN ${ein}), `;
  if (input.bequestType === "specific") {
    const amt = input.specificAmount > 0 ? `$${input.specificAmount.toLocaleString()}` : "[dollar amount]";
    return base + `the sum of ${amt}, to be used for its general charitable purposes.`;
  }
  if (input.bequestType === "percentage") {
    const pct = input.percentage > 0 ? `${input.percentage}%` : "[percentage]";
    return base + `${pct} of my total estate, to be used for its general charitable purposes.`;
  }
  return base + "all the rest, residue, and remainder of my estate, to be used for its general charitable purposes.";
}
