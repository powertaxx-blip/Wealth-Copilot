"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField } from "@/components/ui/Field";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS `calcBalanceSheet()` panel — same 14
 * fields across Assets / Liabilities / Equity, same math, same
 * balanced-check. The only real difference from the original is state
 * living in React (useLocalStorageState) instead of being read out of
 * the DOM on every keystroke.
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
  contrib: number;
  retained: number;
  draws: number;
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
};

export function BalanceSheet() {
  const [state, setState] = useLocalStorageState<BalanceSheetState>("wc.balance", initial);
  const set = <K extends keyof BalanceSheetState>(key: K, value: BalanceSheetState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const totals = useMemo(() => {
    const totalAssets = state.cash + state.ar + state.inv + state.equip + state.property + state.otherAsset;
    const totalLiabilities = state.ap + state.cc + state.stloan + state.ltloan + state.otherLiab;
    const totalEquity = state.contrib + state.retained - state.draws;
    const totalLiabEquity = totalLiabilities + totalEquity;
    const diff = totalAssets - totalLiabEquity;
    const balanced = Math.abs(diff) < 0.01;
    return { totalAssets, totalLiabilities, totalEquity, totalLiabEquity, diff, balanced };
  }, [state]);

  return (
    <Card
      title="Balance Sheet Builder"
      lede="A balance sheet answers one question: what does the business own, and who has a claim on it? Assets = Liabilities + Equity, always. If it doesn't balance, something's missing."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          As the Bhagavad Gita reminds us, &quot;you have the right to your labor, but never to the fruits of your
          labor.&quot; A balance sheet keeps that same honesty — it shows exactly what&apos;s truly yours (equity)
          versus what you owe others (liabilities), no matter how good business felt this year.
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-lg">Assets</h3>
          <div className="flex flex-col gap-3">
            <NumberField label="Cash & bank balances" value={state.cash} onChange={(v) => set("cash", v)} />
            <NumberField
              label="Accounts receivable (owed to you)"
              value={state.ar}
              onChange={(v) => set("ar", v)}
            />
            <NumberField label="Inventory" value={state.inv} onChange={(v) => set("inv", v)} />
            <NumberField label="Equipment & vehicles" value={state.equip} onChange={(v) => set("equip", v)} />
            <NumberField label="Property / real estate" value={state.property} onChange={(v) => set("property", v)} />
            <NumberField label="Other assets" value={state.otherAsset} onChange={(v) => set("otherAsset", v)} />
          </div>
        </div>
        <div>
          <h3 className="text-lg">Liabilities</h3>
          <div className="flex flex-col gap-3">
            <NumberField label="Accounts payable (you owe)" value={state.ap} onChange={(v) => set("ap", v)} />
            <NumberField label="Credit card balances" value={state.cc} onChange={(v) => set("cc", v)} />
            <NumberField
              label="Short-term loans (due < 1 yr)"
              value={state.stloan}
              onChange={(v) => set("stloan", v)}
            />
            <NumberField
              label="Long-term loans / mortgage"
              value={state.ltloan}
              onChange={(v) => set("ltloan", v)}
            />
            <NumberField label="Other liabilities" value={state.otherLiab} onChange={(v) => set("otherLiab", v)} />
          </div>
          <h3 className="text-lg mt-4">Equity</h3>
          <div className="flex flex-col gap-3">
            <NumberField
              label="Owner contributions (capital put in)"
              value={state.contrib}
              onChange={(v) => set("contrib", v)}
            />
            <NumberField
              label="Retained earnings (profit kept in business)"
              value={state.retained}
              onChange={(v) => set("retained", v)}
            />
            <NumberField
              label="Owner draws (money taken out)"
              value={state.draws}
              onChange={(v) => set("draws", v)}
            />
          </div>
        </div>
      </div>
