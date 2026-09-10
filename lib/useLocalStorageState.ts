   "use client";

import { useEffect, useRef, useState } from "react";

/**
 * useLocalStorageState — the React equivalent of the old app's global
 * saveState()/loadState()/scheduleSave() trio. Each old panel stored
 * its fields as ad-hoc entries in one big shared localStorage blob;
 * here every component owns its own typed slice under its own key,
 * which is the more idiomatic React pattern and means one panel's
 * shape can change without any risk of breaking another's saved data.
 *
 * Debounced the same way the original did (500ms) so fast typing
 * doesn't hit localStorage on every keystroke.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once on mount (client-only — localStorage doesn't exist during
  // server render, so the first render always uses `initial`).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        // QA audit finding: the old version trusted the parsed JSON's
        // *shape* completely once parsing itself succeeded — a stale or
        // hand-edited value whose top-level type didn't match `initial`
        // (e.g. an object where an array was expected) would flow straight
        // into state and crash the first component that tried to use it
        // as an array (DebtPayoffPlanner's `[...debts].sort(...)`, for
        // one). A quick top-level shape check falls back to `initial`
        // instead — safe default, no crash — rather than trusting
        // whatever happens to be sitting in a visitor's browser storage.
        //
