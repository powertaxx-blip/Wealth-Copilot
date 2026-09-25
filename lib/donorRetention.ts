/**
 * Donor Retention Rate — what share of last year's donors gave again
 * this year. The one number fundraising benchmarks lean on most, because
 * keeping an existing donor is usually far cheaper than finding a new
 * one. Brand-new donors are collected for context (total donors this
 * year, net change) but deliberately left out of the rate itself — a
 * year with lots of new donors can hide a leaky base, which is exactly
 * what this number exists to expose.
 */

export const DONOR_RETENTION_STORAGE_KEY = "wc.donorRetention";

export type DonorRetentionInput = {
  donorsLastYear: number;
  returningDonors: number;
  newDonors: number;
};

export const DEFAULT_DONOR_RETENTION: DonorRetentionInput = {
  donorsLastYear: 0,
  returningDonors: 0,
  newDonors: 0,
};

/** Sector benchmark band, roughly 40–45% for nonprofits. */
export const SECTOR_AVG_LOW_PCT = 40;
export const SECTOR_AVG_HIGH_PCT = 45;

export type RetentionBand = "below" | "at" | "above";

export const RETENTION_BAND_LABELS: Record<RetentionBand, string> = {
  below: "Below sector average",
  at: "At sector average",
  above: "Above sector average",
};

export type DonorRetentionResult =
  | { status: "empty" } // no donors last year entered yet — nothing to divide by
  | { status: "invalid" } // more returning donors than last year had in total
  | {
      status: "ok";
      ratePct: number; // rounded to 1 decimal — the same value that's displayed and banded
      band: RetentionBand;
      label: string;
      tone: "good" | "warning";
      lostDonors: number; // last year's donors who didn't give again
      totalDonorsThisYear: number; // returning + new
      netChange: number; // this year's total minus last year's
    };

export function calcDonorRetention(input: DonorRetentionInput): DonorRetentionResult {
  const last = Math.max(0, input.donorsLastYear);
  const returning = Math.max(0, input.returningDonors);
  const fresh = Math.max(0, input.newDonors);
  if (last <= 0) return { status: "empty" };
  if (returning > last) return { status: "invalid" };

  // Banded on the rounded value, so a displayed "45.0%" can never be
  // labeled "Above sector average" because the raw value was 45.04.
  const ratePct = Math.round((returning / last) * 1000) / 10;
  const band: RetentionBand =
    ratePct < SECTOR_AVG_LOW_PCT ? "below" : ratePct <= SECTOR_AVG_HIGH_PCT ? "at" : "above";
  const totalDonorsThisYear = returning + fresh;

  return {
    status: "ok",
    ratePct,
    band,
    label: RETENTION_BAND_LABELS[band],
    tone: band === "below" ? "warning" : "good",
    lostDonors: last - returning,
    totalDonorsThisYear,
    netChange: totalDonorsThisYear - last,
  };
}
