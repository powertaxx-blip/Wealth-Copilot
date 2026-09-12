"use client";

import { useOrgType } from "@/lib/orgType";
import { MentorNote } from "@/components/ui/MentorNote";

/**
 * The one switch behind "Nonprofit Mode." A 501(c)(3) isn't a for-profit
 * business that just doesn't keep the money — it runs on a different
 * rulebook (no owner, no personal profit, different filings), so instead
 * of building a whole second app, this toggle relabels and reshapes the
 * handful of panels that are genuinely different: the Balance Sheet
 * becomes a Statement of Financial Position (Net Assets instead of
 * Owner Equity), and the Emergency Fund becomes an Operating Reserve.
 * Everything else in the app works the same either way.
 */
export function OrgTypeToggle() {
  const [orgType, setOrgType] = useOrgType();

  return (
    <div className="flex flex-col gap-3">
      <div className="field max-w-sm">
        <label>Who is this Wealth Copilot for?</label>
        <select value={orgType} onChange={(e) => setOrgType(e.target.value as "standard" | "nonprofit")}>
          <option value="standard">Individual / For-Profit Business</option>
          <option value="nonprofit">Nonprofit Organization (501(c)(3), etc.)</option>
        </select>
      </div>

      <MentorNote>
        The Bhagavad Gita teaches that you have the right to your labor, but never to the fruits of it. A
        for-profit owner takes those fruits home as equity; a nonprofit&apos;s fruits — its net assets — belong
        to the mission, not to any person. That one idea is why a nonprofit&apos;s numbers get called something
        different, not just smaller.
      </MentorNote>

      {orgType === "nonprofit" ? (
        <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
          Nonprofit Mode is on. The <b>Balance Sheet</b> is now a <b>Statement of Financial Position</b> (Net
          Assets, split into With and Without Donor Restrictions, instead of Owner Equity), and the{" "}
          <b>Emergency Fund</b> is now an <b>Operating Reserve</b> — same math, the terms your board and auditor
          actually use. Everything else in the app works exactly the same.
        </p>
      ) : (
        <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
          Set to Nonprofit Organization if you&apos;re managing the books for a 501(c)(3) or similar tax-exempt
          org — it swaps the Balance Sheet and Emergency Fund panels to the terms nonprofits actually use (Net
          Assets, Operating Reserve) instead of relabeling them yourself.
        </p>
      )}
    </div>
  );
}
