/**
 * State individual income tax — tax year 2025 (filed 2026), all 50 states
 * + DC. Rates and brackets cross-checked against each state's own revenue
 * agency where possible (not just one aggregator) because several states
 * changed rates for 2025 and a stale figure would misinform a real client
 * number — see the code comments below for the states where a published
 * aggregator figure turned out to be wrong or ambiguous and what was used
 * instead.
 *
 * IMPORTANT SIMPLIFICATION, stated plainly: every state below is applied
 * to federal Adjusted Gross Income (the app's existing `agi`), NOT to that
 * state's own legally-defined tax base. Real state returns each have their
 * own deductions, exemptions, and add-backs that this estimator does not
 * model — the same "educational estimate, not a substitute for a licensed
 * preparer" disclaimer already shown elsewhere in this app applies here.
 * Local (city/county) income tax is intentionally NOT looked up per state
 * — there are thousands of local jurisdictions nationwide (NYC, Ohio RITA
 * municipalities, Kentucky occupational taxes, and more) and no small
 * hardcoded table could cover them honestly. Local tax stays a manual
 * rate + flat-fee field the person fills in themselves, the same honest
 * approach already used for Pennsylvania's Chester County local tax.
 */

import type { FilingStatus } from "@/lib/tax";

export type USState =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA"
  | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD"
  | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC"
  | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC";

export const US_STATES: { value: USState; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington, D.C." },
];

/** One marginal bracket: `rate` applies to the slice of income between the
 * previous bracket's ceiling and this bracket's `upTo` (null = no ceiling,
 * i.e. this is the top bracket). Brackets must be listed in ascending order
 * starting from $0. */
type Bracket = { rate: number; upTo: number | null };

type StateRule =
  | { kind: "none" } // no individual income tax on wages at all
  | { kind: "flat"; rate: number } // one rate on all taxable income
  | { kind: "brackets"; single: Bracket[]; mfj: Bracket[] }; // progressive

/** A small number of states add a flat surtax above a high fixed threshold
 * — simple enough (one extra rate, one extra threshold) to model honestly,
 * unlike full local-tax lookup. Threshold differs by filing status only
 * where the state's own law says so (Massachusetts uses the same dollar
 * threshold for every filing status). */
type Surtax = { thresholdSingle: number; thresholdMFJ: number; rate: number };

/**
 * Nine states with no individual wage income tax. Washington taxes long-
 * term capital gains only (not wages) — out of scope for this estimator,
 * which has no capital-gains input, so WA correctly shows $0 here. New
 * Hampshire's old Interest & Dividends Tax (which never touched wages) was
 * fully repealed effective tax year 2025 — confirmed directly against
 * N.H. Dept. of Revenue Administration, not just carried over from an
 * older "NH taxes interest/dividends" assumption.
 */
const NO_TAX_STATES: ReadonlySet<USState> = new Set(["AK", "FL", "NV", "SD", "TN", "TX", "WA", "WY", "NH"]);

export const STATE_TAX_RULES: Record<USState, StateRule> = {
  AL: {
    kind: "brackets",
    single: [{ rate: 0.02, upTo: 500 }, { rate: 0.04, upTo: 3000 }, { rate: 0.05, upTo: null }],
    mfj: [{ rate: 0.02, upTo: 1000 }, { rate: 0.04, upTo: 6000 }, { rate: 0.05, upTo: null }],
  },
  AK: { kind: "none" },
  AZ: { kind: "flat", rate: 0.025 },
  AR: {
    kind: "brackets",
    single: [{ rate: 0.02, upTo: 4500 }, { rate: 0.039, upTo: null }],
    mfj: [{ rate: 0.02, upTo: 4500 }, { rate: 0.039, upTo: null }],
  },
  // California — verified directly against the FTB's 2025 Schedule X/Y
  // (not just an aggregator), since an earlier pull of secondary sources
  // had the thresholds slightly off. The 1% Mental Health Services Tax
  // surtax above $1M is modeled below as CA's entry in STATE_SURTAX.
  CA: {
    kind: "brackets",
    single: [
      { rate: 0.01, upTo: 11079 },
      { rate: 0.02, upTo: 26264 },
      { rate: 0.04, upTo: 41452 },
      { rate: 0.06, upTo: 57542 },
      { rate: 0.08, upTo: 72724 },
      { rate: 0.093, upTo: 371479 },
      { rate: 0.103, upTo: 445771 },
      { rate: 0.113, upTo: 742953 },
      { rate: 0.123, upTo: null },
    ],
    mfj: [
      { rate: 0.01, upTo: 22158 },
      { rate: 0.02, upTo: 52528 },
      { rate: 0.04, upTo: 82904 },
      { rate: 0.06, upTo: 115084 },
      { rate: 0.08, upTo: 145448 },
      { rate: 0.093, upTo: 742958 },
      { rate: 0.103, upTo: 891542 },
      { rate: 0.113, upTo: 1485906 },
      { rate: 0.123, upTo: null },
    ],
  },
  CO: { kind: "flat", rate: 0.044 },
