"use client";

import { useEffect, useState } from "react";
import { exportAllData, importAllData, readLastBackupAt, countBackupKeys } from "@/lib/dataBackup";

/**
 * Home's "Your data" card — the app's backup, moved up near the top of
 * Home so it's hard to miss. Wealth Copilot keeps everything in this
 * browser only (no accounts, no server), so downloading this file is the
 * only way a person keeps their own copy. The export itself
 * (lib/dataBackup.ts) saves every "wc." key, so every panel — including
 * ones added later — is covered automatically.
 *
 * Shows when this device last downloaded a backup, read client-side on
 * mount (localStorage), so a first-time visitor is nudged and a regular
 * backer-upper can see it's current.
 */

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function BackupCard() {
  const [info, setInfo] = useState<{ lastBackupAt: string | null; savedCount: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setInfo({ lastBackupAt: readLastBackupAt(), savedCount: countBackupKeys() });
  }, []);

  function download() {
    exportAllData();
    setInfo({ lastBackupAt: readLastBackupAt(), savedCount: countBackupKeys() });
    setMessage("Downloaded. Check your Downloads folder, then keep the file somewhere safe.");
  }

  const last = info?.lastBackupAt ? formatWhen(info.lastBackupAt) : "";

  return (
    <div className="card backup-card">
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <h3 className="text-lg">💾 Your data, your copy</h3>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
          Everything you enter in Wealth Copilot lives only in this browser — there&apos;s no account, and nothing is
          uploaded to a server. That keeps it private, but it also means clearing your browser or switching to another
          device would leave it behind. <b>Downloading your data is how you keep your own backup.</b> Save the file
          anywhere you like: your computer, a USB drive, or your own Google Drive or Dropbox.
        </p>
        {info && (
          <p className="mt-2 text-xs" style={{ color: last ? "var(--muted)" : "var(--status-warning)" }}>
            {last ? `Last downloaded on this device: ${last}.` : "You haven't downloaded a backup on this device yet."}
            {info.savedCount === 0 && " Nothing is saved yet — once you start entering numbers, they'll be included."}
          </p>
        )}
      </div>
      <div className="backup-card-actions">
        <button type="button" className="btn gold" onClick={download}>
          ⬇ Download My Data
        </button>
        <label className="btn ghost" style={{ cursor: "pointer", textAlign: "center" }}>
          ⬆ Restore from a file
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const result = await importAllData(file);
              setMessage(result.error ?? `Restored ${result.restoredKeys} saved item${result.restoredKeys === 1 ? "" : "s"}. Reloading…`);
              if (!result.error) setTimeout(() => window.location.reload(), 1200);
            }}
          />
        </label>
        <small style={{ color: "var(--muted)", textAlign: "center" }}>One file with everything you&apos;ve entered</small>
      </div>
      {message && (
        <p className="w-full text-sm" role="status" style={{ color: "var(--ink-soft)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
