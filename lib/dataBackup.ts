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

function readAllBackupKeys(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(BACKUP_KEY_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // Not JSON (shouldn't happen for a "wc." key, but never lose the
      // value over it) — keep the raw string as-is.
      data[key] = raw;
    }
  }
  return data;
}

/** Triggers a browser download of every saved panel's data as one JSON
 * file. No-ops outside the browser (SSR) since localStorage doesn't exist
 * there. */
export function exportAllData(): void {
  if (typeof window === "undefined") return;
  const payload = {
    source: "Wealth Copilot",
    exportedAt: new Date().toISOString(),
    data: readAllBackupKeys(),
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
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data: Record<string, unknown> =
          parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object"
            ? parsed.data
            : parsed;
        let restoredKeys = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith(BACKUP_KEY_PREFIX)) return;
          window.localStorage.setItem(key, JSON.stringify(value));
          restoredKeys += 1;
        });
        if (restoredKeys === 0) {
          resolve({ restoredKeys: 0, error: "That file didn't contain any recognizable Wealth Copilot data." });
          return;
        }
        resolve({ restoredKeys });
      } catch {
        resolve({ restoredKeys: 0, error: "That file doesn't look like a Wealth Copilot backup." });
      }
    };
    reader.onerror = () => resolve({ restoredKeys: 0, error: "Couldn't read that file." });
    reader.readAsText(file);
  });
}
