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
 * Modeled the same way ThemeToggle reads/writes `wc.theme` — a plain
 * localStorage string, read once on mount (each page is its own route,
 * so a fresh read on mount is enough, same assumption every other panel
 * here already makes) rather than a React Context, since nothing needs
 * this to update live across two panels open at once.
 */
export type OrgType = "standard" | "nonprofit";

const ORG_TYPE_KEY = "wc.orgType";

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
  }, []);

  function setOrgType(next: OrgType) {
    setOrgTypeState(next);
    try {
      window.localStorage.setItem(ORG_TYPE_KEY, next);
    } catch {
      // storage unavailable — choice just won't persist across reloads
    }
  }

  return [orgType, setOrgType];
}
