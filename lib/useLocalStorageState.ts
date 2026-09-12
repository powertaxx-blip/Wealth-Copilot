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
 *
 * Bug found and fixed during the Volunteer Mileage Rate build: the write
 * effect's cleanup cleared the pending debounce timer on EVERY dependency
 * change, including a genuine unmount — so a change made less than 500ms
 * before navigating to another panel (e.g. add a trip, immediately click
 * a nav link) was silently dropped, never written to localStorage at all.
 * Caught by a Playwright test that toggled Nonprofit Mode right after
 * adding a trip and found the trip gone. Fixed with a `latestValue` ref
 * plus a second, mount-once effect whose cleanup runs only on true
 * unmount: it flushes the latest value immediately instead of discarding
 * it, while the per-change debounce above still avoids writing on every
 * keystroke during normal use.
 *
 * `hydrated` (added for the Financial IQ Quiz's randomized draw) is the
 * one extra thing a consumer sometimes needs to know: "has the mount-effect
 * had its chance to load whatever was already saved?" A component that
 * wants to run its own one-time setup ONLY when nothing was saved yet
 * (Quiz.tsx's "draw 12 random questions if this is a fresh session")
 * has to wait for that load to finish first — checking `hydrated` before
 * acting avoids a race where the fresh-setup logic fires before the saved
 * value has actually been read back in, and stomps on it.
 *
 * Bug found and fixed while wiring up the Quiz's randomized draw: this
 * hook was written assuming `key` stays fixed for a component instance's
 * whole life — true for every panel before Quiz.tsx, which always calls
 * it with one hardcoded key. Quiz.tsx is the first caller to compute its
 * key at runtime (`wc.quiz.standard` vs. `wc.quiz.nonprofit`, depending on
 * Nonprofit Mode) and pass a DIFFERENT key into the SAME mounted hook
 * instance when the mode toggles — the component doesn't unmount, so
 * React doesn't give this hook a fresh start the way a new key normally
 * implies. Without a guard, `value` keeps holding whatever was drawn for
 * the OLD key for one render after `key` has already changed to the new
 * one — a real crash, not just stale data: the standard mode's drawn
 * question indices, resolved against the nonprofit question pool,
 * pointed past the end of a differently-ordered array and threw. The
 * `trackedKey` check below resets `value` and `hydrated` the moment `key`
 * itself changes, using React's documented "adjust state during
 * rendering" pattern. One further subtlety that a first pass at this fix
 * missed: calling `setValue(initial)` mid-render schedules the reset for
 * the *next* render — it does NOT change what the `value` variable
 * already holds for the render currently in progress. Quiz.tsx computes
 * `pool` from Nonprofit Mode (a separate hook) and immediately maps over
 * this hook's returned `value` in the very same render pass, so without
 * also overriding the local `value` used for THIS render's own return,
 * the still-stale old-key value would get returned and rendered — paired
 * with the already-new `pool` — and crash before React ever got to apply
 * the scheduled reset. Shadowing `value` (and `hydrated`) with the reset
 * values for the in-progress render closes that gap: the render that
 * detects the key change immediately renders as if already reset, and
 * the mount effect below (its own `[key]` dependency changed too) then
 * loads whatever was actually saved under the new key, if anything.
 * Every other caller passes a constant key, so `trackedKey` never differs
 * from `key` for them and none of this ever triggers — zero behavior
 * change for the other 17 uses of this hook.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function useLocalStorageState<T>(key: string, initial: T) {
  const [valueState, setValue] = useState<T>(initial);
  const [hydratedState, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // See the file header — resets value/hydrated the instant `key` changes
  // on an already-mounted instance, before anything renders with the old
  // value paired against the new key. Safe no-op for the (overwhelming)
  // common case of a caller that never changes its key. `value`/`hydrated`
  // (not the raw `valueState`/`hydratedState`) are what the rest of this
  // hook — and its caller — actually uses, precisely so THIS render's
  // output reflects the reset immediately instead of one render late.
  const [trackedKey, setTrackedKey] = useState(key);
  let value = valueState;
  let hydrated = hydratedState;
  if (key !== trackedKey) {
    setTrackedKey(key);
    setValue(initial);
    setHydrated(false);
    value = initial;
    hydrated = false;
  }

  const latestValueRef = useRef<T>(value);
  const latestKeyRef = useRef<string>(key);
  latestValueRef.current = value;
  latestKeyRef.current = key;

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
      debounceRef.current = null;
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

  // Flush-on-unmount — see the file header. Empty dependency array means
  // this cleanup only fires when the component actually unmounts, never
  // on an ordinary re-render, so it can safely write the latest value
  // immediately instead of the debounce silently dropping it.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        try {
          window.localStorage.setItem(latestKeyRef.current, JSON.stringify(latestValueRef.current));
        } catch {
          // storage unavailable — nothing persists, same fallback as before
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue, hydrated] as const;
}
