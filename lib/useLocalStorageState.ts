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
        // Second QA finding, found live: a shape check alone isn't enough
        // for plain objects — it only catches "the wrong kind of thing
        // entirely," not "the right kind of thing, missing a field this
        // version needs." When EstimatorInput grew a required `state`
        // field for the 50-state tax feature, a browser that had saved
        // the *old* EstimatorInput (real object, just without `state`)
        // passed the shape check, got trusted as-is, and then crashed
        // calcStateTax() with "Cannot read properties of undefined
        // (reading 'kind')" the moment it tried to look up tax rules for
        // a state of `undefined`. Merging onto `initial` instead of
        // replacing it means any field a newer version added — or any
        // field missing for whatever reason — quietly falls back to its
        // default instead of reaching app code as `undefined`. Arrays
        // (e.g. DebtPayoffPlanner's debt list) don't get this treatment:
        // there's no per-field default to merge in for a list, so an
        // array either matches or it doesn't.
        if (Array.isArray(initial)) {
          if (Array.isArray(parsed)) setValue(parsed as T);
        } else if (isPlainObject(initial)) {
          if (isPlainObject(parsed)) setValue({ ...initial, ...parsed } as T);
        } else if (typeof parsed === typeof initial) {
          setValue(parsed as T);
        }
      }
    } catch {
      // private browsing or storage unavailable — fail silently, same as before
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // storage unavailable — nothing persists, same fallback as before
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
