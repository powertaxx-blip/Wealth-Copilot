"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { SC_EXPENSE_LINES, mergeCategoryTotalsIntoScheduleC } from "@/lib/scheduleC";

/**
 * Port of the vanilla-JS `businessExpenses` array + addExpense()/
 * renderExpenses(). Same list/CRUD shape DebtPayoffPlanner already
 * demonstrates: an array of records in state, add/remove handlers, and
 * derived totals computed with useMemo instead of being rebuilt by hand
 * on every change.
 *
 * The one thing that's genuinely new here is the cross-panel push into
 * Schedule C — see lib/scheduleC.ts's file header for why that's a
 * localStorage merge instead of shared React state.
 */

type Expense = { id: string; date: string; desc: string; category: string; amount: number };

const CATEGORY_OPTIONS = [
  ...SC_EXPENSE_LINES.map((l) => ({ value: l.id, label: l.label })),
  { value: "car", label: "Car & truck (mileage — track on Schedule C tab)" },
];

function labelFor(category: string): string {
  if (category === "car") return "Car & truck (mileage)";
  return SC_EXPENSE_LINES.find((l) => l.id === category)?.label ?? category;
}

export function BusinessExpenses() {
  const [expenses, setExpenses] = useLocalStorageState<Expense[]>("wc.bizexpenses", []);
  const [draft, setDraft] = useState({ date: "", desc: "", category: SC_EXPENSE_LINES[0].id, amount: 0 });
  const [amountError, setAmountError] = useState(false);
  const router = useRouter();

  function addExpense() {
    if (draft.amount <= 0) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    setExpenses((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        date: draft.date.trim() || "(no date)",
        desc: draft.desc.trim() || "(no description)",
        category: draft.category,
        amount: draft.amount,
      },
    ]);
    setDraft((d) => ({ ...d, date: "", desc: "", amount: 0 }));
  }

  function removeExpense(id: string) {
    setExpenses((list) => list.filter((e) => e.id !== id));
  }

  const { totalsByCategory, grandTotal } = useMemo(() => {
    const totals: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
      total += e.amount;
    }
    return { totalsByCategory: totals, grandTotal: total };
  }, [expenses]);

  function pushToScheduleC() {
    // Mileage is tracked directly on the Schedule C tab (it has its own
    // miles + rate fields), not as a dollar category — so it's excluded
    // from the merge the same way the original excluded it.
    const { car: _car, ...pushable } = totalsByCategory;
    mergeCategoryTotalsIntoScheduleC(pushable);
    router.push("/schedulec");
  }

  return (
    <Card
      title="Business Expenses Tracker"
      lede="Log expenses one at a time, the way they actually happen — a receipt here, a subscription there. This keeps a running ledger and totals everything by category, then hands those totals straight to your Schedule C."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          The Temptations said it best — &quot;just my imagination, running away with me.&quot; Don&apos;t let your
          expenses do the same; a logged receipt today beats a shoebox in April.
        </div>
      </div>
