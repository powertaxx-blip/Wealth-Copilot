"use client";

import { useEffect, useState } from "react";

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

  function exportData() {
    const dump: Record<string, unknown> = {};
    keys.forEach((k) => {
      try {
        dump[k] = JSON.parse(window.localStorage.getItem(k) ?? "null");
      } catch {
        dump[k] = window.localStorage.getItem(k);
      }
    });
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wealth-copilot-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
