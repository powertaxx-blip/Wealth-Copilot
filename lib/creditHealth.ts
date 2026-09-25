/**
 * Credit Health Tracker — a self-reported log of personal and business
 * credit scores. The user looks their score up elsewhere (Credit Karma,
 * their bank, Dun & Bradstreet) and records it here; nothing is fetched
 * from a bureau, and no SSN or business tax ID is ever collected — just
 * a date, a score, and optionally which bureau it came from.
 *
 * Same list/CRUD shape as Grant Tracking (lib/grants.ts): one array of
 * entries per section in local storage, add/remove handlers, everything
 * else derived. Personal and business are fully independent — different
 * scales, bureaus, and bands — so each is described by a CreditScale.
 */

export const CREDIT_HEALTH_STORAGE_KEY = "wc.creditHealth";

export type CreditKind = "personal" | "business";

export type CreditEntry = {
  id: string;
  date: string; // "YYYY-MM-DD"
  score: number;
  bureau: string; // one of the scale's bureau values, or "" if not given
  createdAt: number; // tie-breaker when two entries share a date
};

export type CreditHealthState = {
  personal: CreditEntry[];
  business: CreditEntry[];
};

export const DEFAULT_CREDIT_HEALTH: CreditHealthState = { personal: [], business: [] };

export type ScoreTone = "good" | "warning" | "critical";

export type CreditScale = {
  kind: CreditKind;
  min: number;
  max: number;
  bureaus: { value: string; label: string }[];
  bands: { upTo: number; label: string; tone: ScoreTone }[]; // ascending; a score falls in the first band whose upTo it doesn't exceed
};

export const PERSONAL_SCALE: CreditScale = {
  kind: "personal",
  min: 300,
  max: 850,
  bureaus: [
    { value: "", label: "Not specified" },
    { value: "experian", label: "Experian" },
    { value: "equifax", label: "Equifax" },
    { value: "transunion", label: "TransUnion" },
    { value: "other", label: "Other" },
  ],
  bands: [
    { upTo: 579, label: "Poor", tone: "critical" },
    { upTo: 669, label: "Fair", tone: "warning" },
    { upTo: 739, label: "Good", tone: "good" },
    { upTo: 799, label: "Very Good", tone: "good" },
    { upTo: 850, label: "Exceptional", tone: "good" },
  ],
};

/** PAYDEX-based bands. Other business bureaus use different scales —
 * the panel says so in a Tip rather than pretending they're comparable. */
export const BUSINESS_SCALE: CreditScale = {
  kind: "business",
  min: 0,
  max: 100,
  bureaus: [
    { value: "", label: "Not specified" },
    { value: "paydex", label: "Dun & Bradstreet PAYDEX" },
    { value: "experian-business", label: "Experian Business" },
    { value: "equifax-business", label: "Equifax Business" },
    { value: "other", label: "Other" },
  ],
  bands: [
    { upTo: 24, label: "Poor", tone: "critical" },
    { upTo: 49, label: "Fair", tone: "warning" },
    { upTo: 79, label: "Good", tone: "good" },
    { upTo: 100, label: "Excellent", tone: "good" },
  ],
};

export function scoreBand(scale: CreditScale, score: number): { label: string; tone: ScoreTone } {
  const band = scale.bands.find((b) => score <= b.upTo) ?? scale.bands[scale.bands.length - 1];
  return { label: band.label, tone: band.tone };
}

export function bureauLabel(scale: CreditScale, value: string): string {
  return value ? scale.bureaus.find((b) => b.value === value)?.label ?? "" : "";
}

/** Drops anything in saved storage that isn't a well-formed entry, so a
 * hand-edited or stale value can't crash sorting (same "never trust a
 * stranger's browser storage" posture as useLocalStorageState). */
export function validEntries(entries: unknown): CreditEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (e): e is CreditEntry =>
      typeof e === "object" &&
      e !== null &&
      typeof e.id === "string" &&
      typeof e.date === "string" &&
      typeof e.score === "number" &&
      Number.isFinite(e.score) &&
      typeof e.bureau === "string" &&
      typeof e.createdAt === "number"
  );
}

/** Most recent first: by date, then by when it was logged. */
export function sortEntries(entries: CreditEntry[]): CreditEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export type CreditSummary =
  | { status: "empty" }
  | {
      status: "ok";
      latest: CreditEntry;
      label: string;
      tone: ScoreTone;
      // Change since the previous entry (by date); null when there's only one.
      change: { points: number; previous: CreditEntry; sameBureau: boolean } | null;
    };

export function summarize(scale: CreditScale, entries: CreditEntry[]): CreditSummary {
  const sorted = sortEntries(entries);
  if (sorted.length === 0) return { status: "empty" };
  const [latest, previous] = sorted;
  const band = scoreBand(scale, latest.score);
  return {
    status: "ok",
    latest,
    label: band.label,
    tone: band.tone,
    change: previous
      ? {
          points: latest.score - previous.score,
          previous,
          // Scores from different bureaus aren't directly comparable —
          // the UI flags a cross-bureau change instead of hiding it.
          sameBureau: latest.bureau === previous.bureau || !latest.bureau || !previous.bureau,
        }
      : null,
  };
}

export type EntryValidation = { ok: true } | { ok: false; message: string };

export function validateEntry(scale: CreditScale, date: string, score: number, today: string): EntryValidation {
  if (!date) return { ok: false, message: "Pick the date you checked this score." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "That isn't a valid date." };
  if (date > today) return { ok: false, message: "That date is in the future — log a score once you've actually checked it." };
  if (!Number.isInteger(score) || score < scale.min || score > scale.max) {
    return { ok: false, message: `Enter a whole-number score between ${scale.min} and ${scale.max}.` };
  }
  return { ok: true };
}

/** Today's local date as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function formatEntryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}
