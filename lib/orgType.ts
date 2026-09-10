"use client";

import { useEffect, useState } from "react";

/**
 * Nonprofit Mode — the one setting that changes what several panels call
 * themselves and how a couple of them are built, because a 501(c)(3)
 * genuinely runs on different rules than an individual or a for-profit
 * business: no owner, no personal "profit," and a different set of
 * paperwork entirely. See Settings for the plain-language explanation
 * shown next to this toggle.
 *
 * Reads/writes the same plain localStorage string ThemeToggle uses for
 * `wc.theme`, but with one addition: TopNav lives in the root layout, so
 * it mounts once and stays mounted across every client-side route
 * change — unlike Balance Sheet or Emergency Fund, it never gets a
 * fresh "read on mount" when Settings changes this value. A same-tab
 * `wc:orgtype-change` event (the native `storage` event only fires in
 * *other* tabs, never the tab that made the change) lets every mounted
 * useOrgType() — including the one inside TopNav — pick up the new
 * value immediately, without needing a React Context provider wrapped
 * around the whole app.
 */
export type OrgType = "standard" | "nonprofit";

const ORG_TYPE_KEY = "wc.orgType";
const ORG_TYPE_EVENT = "wc:orgtype-change";

export function readOrgType(): OrgType {
  if (typeof window === "undefined") return "standard";
  try {
    return window.localStorage.getItem(ORG_TYPE_KEY) === "nonprofit" ? "nonprofit" : "standard";
  } catch {
    return "standard";
  }
}

export function useOrgType(): [OrgType, (next: OrgType) => void] {
  const [orgType, setOrgTypeState] = useState<OrgType>("standard");

  useEffect(() => {
    setOrgTypeState(readOrgType());
    function onChange() {
      setOrgTypeState(readOrgType());
    }
    window.addEventListener(ORG_TYPE_EVENT, onChange);
    return () => window.removeEventListener(ORG_TYPE_EVENT, onChange);
  }, []);

  function setOrgType(next: OrgType) {
    setOrgTypeState(next);
    try {
      window.localStorage.setItem(ORG_TYPE_KEY, next);
    } catch {
      // storage unavailable — choice just won't persist across reloads
    }
    window.dispatchEvent(new Event(ORG_TYPE_EVENT));
  }

  return [orgType, setOrgType];
}
