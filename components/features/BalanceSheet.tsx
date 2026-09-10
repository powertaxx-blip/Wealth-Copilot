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
      
      <table>
        <thead>
          <tr>
            <th>Assets</th>
            <th className="num"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cash & bank balances</td>
            <td className="num">{fmt(state.cash)}</td>
          </tr>
          <tr>
            <td>Accounts receivable</td>
            <td className="num">{fmt(state.ar)}</td>
          </tr>
          <tr>
            <td>Inventory</td>
            <td className="num">{fmt(state.inv)}</td>
          </tr>
          <tr>
            <td>Equipment & vehicles</td>
            <td className="num">{fmt(state.equip)}</td>
          </tr>
          <tr>
            <td>Property / real estate</td>
            <td className="num">{fmt(state.property)}</td>
          </tr>
          <tr>
            <td>Other assets</td>
            <td className="num">{fmt(state.otherAsset)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total Assets</td>
            <td className="num">{fmt(totals.totalAssets)}</td>
          </tr>
        </tfoot>
        <thead>
          <tr>
            <th>Liabilities</th>
            <th className="num"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Accounts payable</td>
            <td className="num">{fmt(state.ap)}</td>
          </tr>
          <tr>
            <td>Credit card balances</td>
            <td className="num">{fmt(state.cc)}</td>
          </tr>
          <tr>
            <td>Short-term loans</td>
            <td className="num">{fmt(state.stloan)}</td>
          </tr>
          <tr>
            <td>Long-term loans / mortgage</td>
            <td className="num">{fmt(state.ltloan)}</td>
          </tr>
          <tr>
            <td>Other liabilities</td>
            <td className="num">{fmt(state.otherLiab)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total Liabilities</td>
            <td className="num">{fmt(totals.totalLiabilities)}</td>
          </tr>
        </tfoot>
        <thead>
          <tr>
            <th>Equity</th>
            <th className="num"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Owner contributions</td>
            <td className="num">{fmt(state.contrib)}</td>
          </tr>
          <tr>
            <td>Retained earnings</td>
            <td className="num">{fmt(state.retained)}</td>
          </tr>
          <tr>
            <td>Owner draws</td>
            <td className="num">-{fmt(state.draws)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total Equity</td>
            <td className="num">{fmt(totals.totalEquity)}</td>
          </tr>
        </tfoot>
      </table>

      <div
        className="result-box mt-4"
        style={{ background: totals.balanced ? "var(--status-good-bg)" : "var(--status-critical-bg)" }}
      >
        <div className="label" style={{ color: totals.balanced ? "var(--status-good)" : "var(--status-critical)" }}>
          {totals.balanced ? "✓ Balanced — Assets = Liabilities + Equity" : "⚠ Not balanced yet"}
        </div>
        <div className="big" style={{ color: totals.balanced ? "var(--status-good)" : "var(--status-critical)" }}>
          {fmt(totals.totalAssets)} {totals.balanced ? "=" : "≠"} {fmt(totals.totalLiabEquity)}
        </div>
        {!totals.balanced && (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            Difference of {fmt(Math.abs(totals.diff))} —{" "}
            {totals.diff > 0
              ? "you have assets not yet accounted for in liabilities or equity (often means retained earnings should be higher)."
              : "your liabilities + equity exceed assets (check for a data entry error, or equity should be lower)."}
          </p>
        )}
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        This is a simplified single-period snapshot for demo and educational purposes. A full balance sheet for
        filing or audit purposes should tie back to your bookkeeping ledger (QuickBooks, etc.) and be reviewed by a
        professional.
      </p>
    </Card>
  );
}
