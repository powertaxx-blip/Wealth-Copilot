"use client";

import { useEffect, useState } from "react";
import { useOrgType } from "@/lib/orgType";
import { exportAllData, importAllData, clearAllData, listBackupKeys, describeSavedData } from "@/lib/dataBackup";

/**
 * Settings → Your Data. Lists what's saved on this device by friendly
 * name (describeSavedData — internal settings like the theme are left
 * out of the list but still exported), and offers the same Download /
 * Restore as Home's backup card (lib/dataBackup.ts), plus Clear.
 *
 * Clear asks first, in the page rather than a browser pop-up, and puts a
 * "Download a backup first" button right in that confirmation — clearing
 * can't be undone, and the backup file is the only way back.
 */
export function DataControls() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [keys, setKeys] = useState<string[] | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [backedUpNow, setBackedUpNow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setKeys(listBackupKeys());
  }, []);

  const names = keys ? describeSavedData(keys, nonprofit) : [];
  const hasAnything = (keys?.length ?? 0) > 0;

  function download() {
    exportAllData();
    setBackedUpNow(true);
    setMessage("Downloaded. Check your Downloads folder, then keep the file somewhere safe.");
  }

  function clearEverything() {
    clearAllData();
    setConfirmingClear(false);
    setMessage("All saved data was cleared from this browser. Reloading…");
    // Reload so every setting on the page (Nonprofit Mode, theme) reflects the reset.
    setTimeout(() => window.location.reload(), 1000);
  }

  if (keys === null) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
        {names.length === 0 ? (
          "Nothing saved on this device yet."
        ) : (
          <>
            Saved on this device:
            <ul className="mt-2 flex flex-wrap gap-2" style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {names.map((n) => (
                <li key={n} className="status-pill neutral" style={{ color: "var(--ink-soft)" }}>
                  {n}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn ghost" onClick={download} disabled={!hasAnything}>
          ⬇ Export my data (.json)
        </button>
        <label className="btn ghost" style={{ cursor: "pointer" }}>
          ⬆ Restore from backup
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
        {!confirmingClear && (
          <button
            className="btn ghost"
            onClick={() => {
              setConfirmingClear(true);
              setBackedUpNow(false);
              setMessage(null);
            }}
            disabled={!hasAnything}
          >
            🗑 Clear my saved data
          </button>
        )}
      </div>

      {confirmingClear && (
        <div className="note" role="alertdialog" aria-label="Confirm clearing saved data" style={{ borderLeftColor: "var(--status-critical)", margin: 0 }}>
          <b>Clear everything saved in this browser?</b> This permanently deletes all of your Wealth Copilot data on this
          device — every tool, plus your settings — and it can&apos;t be undone.{" "}
          {backedUpNow ? (
            <>Your backup file has been downloaded, so you can restore it later with &ldquo;Restore from backup.&rdquo;</>
          ) : (
            <>
              <b>Download a backup first</b> so you can bring it back later with &ldquo;Restore from backup.&rdquo;
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!backedUpNow && (
              <button className="btn gold" onClick={download}>
                ⬇ Download a backup first
              </button>
            )}
            <button
              className="btn ghost"
              onClick={clearEverything}
              style={{ color: "var(--status-critical)", borderColor: "var(--status-critical)" }}
            >
              {backedUpNow ? "Clear my saved data" : "Clear without a backup"}
            </button>
            <button className="btn ghost" onClick={() => setConfirmingClear(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className="text-sm" role="status" style={{ color: "var(--ink-soft)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
