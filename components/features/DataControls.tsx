"use client";

import { useEffect, useState } from "react";
import { exportAllData } from "@/lib/dataBackup";

/**
 * The one thing the original app's footer did ("Clear my saved data"),
 * plus something it didn't: an export-to-file button, so a client can
 * back up their own numbers before clearing them. Real Settings page,
 * not a stub — this is the first page in the rebuild that didn't exist
 * in the original single-file prototype at all.
 */
export function DataControls() {
  const [keys, setKeys] = useState<string[]>([]);

  function refresh() {
    const found: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("wc.")) found.push(k);
    }
    setKeys(found.sort());
  }

  useEffect(() => {
    refresh();
  }, []);

  // Same export as Home's "Download My Data" (lib/dataBackup.ts), so both
  // buttons produce the same file — one that Restore reads back exactly,
  // including plain-text settings like Nonprofit Mode.
  function exportData() {
    exportAllData();
  }

  function clearAll() {
    if (!window.confirm("Clear all saved Wealth Copilot data on this device? This can't be undone.")) return;
    keys.forEach((k) => window.localStorage.removeItem(k));
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {keys.length === 0
            ? "Nothing saved on this device yet."
            : `${keys.length} saved item${keys.length === 1 ? "" : "s"} on this device: ${keys.join(", ")}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="btn ghost" onClick={exportData} disabled={keys.length === 0}>
          ⬇ Export my data (.json)
        </button>
        <button className="btn ghost" onClick={clearAll} disabled={keys.length === 0}>
          🗑 Clear my saved data
        </button>
      </div>
    </div>
  );
}
