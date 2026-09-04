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
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once on mount (client-only — localStorage doesn't exist during
  // server render, so the first render always uses `initial`).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
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
