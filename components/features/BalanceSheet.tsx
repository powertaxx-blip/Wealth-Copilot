"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField } from "@/components/ui/Field";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS `calcBalanceSheet()` panel — same 14
 * original fields across Assets / Liabilities / Equity, same math, same
 * balanced-check. Nonprofit Mode (see lib/orgType.ts) adds two more
 * fields and swaps what the bottom section is called and how it's
 * totaled: a 501(c)(3) has no owner, so "Equity" (contributions,
 * retained earnings, draws) doesn't apply — instead it's "Net Assets,"
 * split into With and Without Donor Restrictions (FASB ASU 2016-14).
 * Both sets of fields live in state at all times so switching Nonprofit
 * Mode on and off never loses either version of a user's numbers —
 * only which two or three fields are shown, and which formula totals
 * them, changes.
 */

type BalanceSheetState = {
  cash: number;
  ar: number;
  inv: number;
  equip: number;
  property: number;
  otherAsset: number;
  ap: number;
  cc: number;
  stloan: number;
  ltloan: number;
  otherLiab: number;
  // For-profit / individual equity fields
  contrib: number;
  retained: number;
  draws: number;
  // Nonprofit net asset fields
  netWithoutRestriction: number;
  netWithRestriction: number;
};

const initial: BalanceSheetState = {
  cash: 0,
  ar: 0,
  inv: 0,
  equip: 0,
  property: 0,
  otherAsset: 0,
  ap: 0,
  cc: 0,
  stloan: 0,
  ltloan: 0,
  otherLiab: 0,
  contrib: 0,
  retained: 0,
  draws: 0,
  netWithoutRestriction: 0,
  netWithRestriction: 0,
};

export function BalanceSheet() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [state, setState] = useLocalStorageState<BalanceSheetState>("wc.balance", initial);
  const set = <K extends keyof BalanceSheetState>(key: K, value: BalanceSheetState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const totals = useMemo(() => {
    const totalAssets = state.cash + state.ar + state.inv + state.equip + state.property + state.otherAsset;
    const totalLiabilities = state.ap + state.cc + state.stloan + state.ltloan + state.otherLiab;
    const totalEquity = nonprofit
      ? state.netWithoutRestriction + state.netWithRestriction
      : state.contrib + state.retained - state.draws;
    const totalLiabEquity = totalLiabilities + totalEquity;
    const diff = totalAssets - totalLiabEquity;
    const balanced = Math.abs(diff) < 0.01;
    return { totalAssets, totalLiabilities, totalEquity, totalLiabEquity, diff, balanced };
  }, [state, nonprofit]);

  const bottomLabel = nonprofit ? "Net Assets" : "Equity";

  return (
    <Card
      title={nonprofit ? "Statement of Financial Position" : "Balance Sheet Builder"}
      lede={
        nonprofit
          ? "A nonprofit's version of the balance sheet answers the same question: what does the organization own, and who has a claim on it? Assets = Liabilities + Net Assets, always — and Net Assets is split by whether a donor restricted how it can be used."
          : "A balance sheet answers one question: what does the business own, and who has a claim on it? Assets = Liabilities + Equity, always. If it doesn't balance, something's missing."
      }
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              As the Bhagavad Gita reminds us, &quot;you have the right to your labor, but never to the fruits of
              your labor.&quot; A nonprofit&apos;s balance sheet keeps that same honesty — the fruits (Net Assets)
              belong to the mission, not to any person, and this shows exactly how much of it a donor has
              earmarked versus how much the board is free to direct.
            </>
          ) : (
            <>
              As the Bhagavad Gita reminds us, &quot;you have the right to your labor, but never to the fruits of
              your labor.&quot; A balance sheet keeps that same honesty — it shows exactly what&apos;s truly
              yours (equity) versus what you owe others (liabilities), no matter how good business felt this
              year.
            </>
          )}
        </div>
      </div>
