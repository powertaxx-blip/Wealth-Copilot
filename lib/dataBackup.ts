/**
 * Data ownership — every panel in this app writes only to this browser's
 * own localStorage (see lib/snapshot.ts's header comment and MIGRATION.md:
 * there is no server yet). That's good for privacy, but it also means
 * clearing site data, switching browsers, or a bad update wipes a
 * visitor's entire financial picture with zero warning and no way back.
 *
 * These two functions are the escape hatch: export walks every "wc."
 * prefixed key (the prefix every panel already uses — see
 * useLocalStorageState and each panel's own STORAGE_KEY constant) into one
 * JSON file the visitor can keep, and import writes a previously-exported
 * file straight back. Neither function knows or cares what shape any
 * individual panel's data is in — it treats every key as an opaque blob,
 * so a new panel added later is automatically covered without this file
 * needing to change.
 */

export const BACKUP_KEY_PREFIX = "wc.";

/** When this browser last downloaded a backup — shown on Home's backup
 * card. Deliberately NOT under the "wc." prefix: it describes this
 * device, not the user's data, so it's never written into a backup file
 * (and restoring a file can't make an old backup look recent). */
export const LAST_BACKUP_KEY = "wc-meta.lastBackupAt";

export function readLastBackupAt(): string | null {
  try {
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/**
 * Friendly names for Settings → Your Data, which lists what's saved
 * without showing raw keys. Several keys can share one name (the debt
 * planner keeps three). `null` marks internal keys — settings shown
 * elsewhere on Settings, or bookkeeping the person never sees — which are
 * left out of the list but are still in every export. A key that isn't
 * mapped here (a tool added later) shows as "Other saved data" rather
 * than as a raw key.
 */
const SAVED_DATA_LABELS: Record<string, { label: string; nonprofitLabel?: string } | null> = {
  "wc.budgeting": { label: "Budgeting" },
  "wc.debts": { label: "Debt Payoff Planner" },
  "wc.debts.extra": { label: "Debt Payoff Planner" },
  "wc.debts.strategy": { label: "Debt Payoff Planner" },
  "wc.cashFlow": { label: "Cash-Flow Forecast" },
  "wc.emergency": { label: "Emergency Fund", nonprofitLabel: "Operating Reserve" },
  "wc.financialHealth": { label: "Financial Health" },
  "wc.creditHealth": { label: "Credit Health" },
  "wc.investment.holdings": { label: "Investment Fund" },
  "wc.investment.projector": { label: "Investment Fund" },
  "wc.investment.retirement": { label: "Investment Fund" },
  "wc.breakeven": { label: "Break-Even & Pricing" },
  "wc.estimator": { label: "Tax Estimator" },
  "wc.mileage": { label: "Mileage Tracker" },
  "wc.bizexpenses": { label: "Business Expenses" },
  "wc.schedulec": { label: "Schedule C" },
  "wc.form990": { label: "Form 990" },
  "wc.balance": { label: "Balance Sheet", nonprofitLabel: "Statement of Financial Position" },
  "wc.invoices": { label: "Invoices", nonprofitLabel: "Donation Receipts" },
  "wc.invoices.draft": { label: "Invoices", nonprofitLabel: "Donation Receipts" },
  "wc.employees": { label: "Employees & Payroll" },
  "wc.contractors": { label: "1099 Contractors" },
  "wc.grants": { label: "Grants" },
  "wc.grantWriting": { label: "Grant Proposals" },
  "wc.donorRetention": { label: "Donor Retention" },
  "wc.paycheckcheckup": { label: "Paycheck Checkup" },
  "wc.scorp": { label: "Filing Status Guide calculators" },
  "wc.ubit": { label: "Filing Status Guide calculators" },
  "wc.estatePlanning.bequest": { label: "Wills & Estates" },
  "wc.estatePlanning.exposure": { label: "Wills & Estates" },
  "wc.quiz.standard": { label: "Financial IQ Quiz" },
  "wc.quiz.nonprofit": { label: "Financial IQ Quiz" },
  "wc.ownerName": { label: "Your name" },
  // Internal — kept in exports, hidden from the list.
  "wc.orgType": null, // shown as its own setting on Settings
  "wc.theme": null, // shown as its own setting on Settings
  "wc.welcomeVideoSeen": null,
  "wc.powerThoughtDeck": null,
  "wc.schedulec.netProfit": null, // derived from Schedule C, which is listed
};

/** The friendly, de-duplicated, sorted names for a set of saved keys,
 * with internal keys left out. */
export function describeSavedData(keys: string[], nonprofit: boolean): string[] {
  const names = new Set<string>();
  for (const key of keys) {
    if (!key.startsWith(BACKUP_KEY_PREFIX)) continue;
    const entry = SAVED_DATA_LABELS[key];
    if (entry === null) continue; // internal
    if (entry === undefined) {
      names.add("Other saved data");
      continue;
    }
    names.add((nonprofit && entry.nonprofitLabel) || entry.label);
  }
  return [...names].sort((a, b) => (a === "Other saved data" ? 1 : b === "Other saved data" ? -1 : a.localeCompare(b)));
}

/** Every "wc." key currently saved, sorted. */
export function listBackupKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(BACKUP_KEY_PREFIX)) keys.push(k);
    }
  } catch {
    // storage unavailable — nothing to list
  }
  return keys.sort();
}

/** Deletes every "wc." key (the "Clear my saved data" action). The
 * last-backup marker is left alone: it describes this device's downloads,
 * not the person's data. */
export function clearAllData(): void {
  for (const k of listBackupKeys()) window.localStorage.removeItem(k);
}

/** How many "wc." keys are saved — i.e. how much a backup would contain. */
export function countBackupKeys(): number {
  try {
    let n = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith(BACKUP_KEY_PREFIX)) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

/**
 * Most keys hold JSON (everything written through useLocalStorageState),
 * but a couple are written as plain text: Nonprofit Mode ("wc.orgType" =
 * nonprofit) and the theme ("wc.theme" = dark). Those must be restored
 * exactly as they were — wrapping them in JSON quotes on the way back in
 * turned Nonprofit Mode silently off after a restore. So the export
 * records which keys were plain text ("plainTextKeys"), and restore writes
 * those back verbatim. Backup files made before that list existed fall
 * back to this known set.
 */
const KNOWN_PLAIN_TEXT_KEYS = ["wc.orgType", "wc.theme"];

function readAllBackupKeys(): { data: Record<string, unknown>; plainTextKeys: string[] } {
  const data: Record<string, unknown> = {};
  const plainTextKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(BACKUP_KEY_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // Not JSON — a plain-text key. Keep the string as-is and remember
      // that it was plain text, so restore doesn't JSON-encode it.
      data[key] = raw;
      plainTextKeys.push(key);
    }
  }
  return { data, plainTextKeys };
}

/** Triggers a browser download of every saved panel's data as one JSON
 * file. No-ops outside the browser (SSR) since localStorage doesn't exist
 * there. */
export function exportAllData(): void {
  if (typeof window === "undefined") return;
  const { data, plainTextKeys } = readAllBackupKeys();
  const payload = {
    source: "Wealth Copilot",
    exportedAt: new Date().toISOString(),
    plainTextKeys,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wealth-copilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  try {
    window.localStorage.setItem(LAST_BACKUP_KEY, payload.exportedAt);
  } catch {
    // storage unavailable — the download itself still happened
  }
}

export type ImportResult = { restoredKeys: number; error?: string };

/** Reads a previously-exported backup file and writes its keys straight
 * back into localStorage. Accepts either the wrapped `{ data: {...} }`
 * shape exportAllData produces, or a bare `{ "wc.xxx": ... }` object, so a
 * hand-edited or older-format file still works. Only keys already
 * prefixed "wc." are restored — anything else in the file is ignored
 * rather than risking an unrelated key getting overwritten. */
export function importAllData(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(restoreFromText(String(reader.result)));
    reader.onerror = () => resolve({ restoredKeys: 0, error: "Couldn't read that file." });
    reader.readAsText(file);
  });
}

/** The restore itself, given the backup file's text — separate from
 * importAllData's FileReader plumbing so it can be tested directly. */
export function restoreFromText(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { restoredKeys: 0, error: "That file doesn't look like a Wealth Copilot backup." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { restoredKeys: 0, error: "That file doesn't look like a Wealth Copilot backup." };
  }
  const file = parsed as { data?: unknown; plainTextKeys?: unknown };
  const data = (file.data && typeof file.data === "object" && !Array.isArray(file.data) ? file.data : parsed) as Record<string, unknown>;
  const plainText = new Set<string>(
    Array.isArray(file.plainTextKeys) ? file.plainTextKeys.filter((k): k is string => typeof k === "string") : KNOWN_PLAIN_TEXT_KEYS
  );

  let restoredKeys = 0;
  try {
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith(BACKUP_KEY_PREFIX)) continue;
      const raw = plainText.has(key) && typeof value === "string" ? value : JSON.stringify(value);
      window.localStorage.setItem(key, raw);
      restoredKeys += 1;
    }
  } catch {
    return { restoredKeys, error: "Couldn't save the restored data in this browser (storage may be full or blocked)." };
  }
  if (restoredKeys === 0) {
    return { restoredKeys: 0, error: "That file didn't contain any recognizable Wealth Copilot data." };
  }
  return { restoredKeys };
}
