"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { calcSETax } from "@/lib/tax";

/**
 * Direct port of three vanilla-JS panels that shared one screen in the
 * original prototype: the holdings tracker (addHolding/renderHoldings),
 * the growth projector (calcProjection — a separate "what if" calculator
 * that never touches the holdings list), and the SEP-IRA vs. Solo 401(k)
 * retirement contribution limits calculator (calcRetirementLimits, which
 * reuses the same self-employment tax math as the Tax Estimator — see
 * lib/tax.ts's calcSETax).
 *
 * The allocation-by-type bars use a fixed, CVD-safe categorical color
 * order (blue/orange/aqua/yellow/magenta/green) instead of the original's
 * CSS --series-N variables, which this React build never carried over —
 * same six hex values in both light and dark mode, kept simple since
 * this is one small supporting visual, not the app's primary chart.
 */

type HoldingType = "Stocks" | "Bonds" | "Retirement" | "RealEstate" | "Cash" | "Other";

type Holding = { id: string; name: string; type: HoldingType; contributed: number; value: number };

const TYPE_OPTIONS: { value: HoldingType; label: string }[] = [
  { value: "Stocks", label: "Stocks / ETFs" },
  { value: "Bonds", label: "Bonds" },
  { value: "Retirement", label: "Retirement (401k/IRA)" },
  { value: "RealEstate", label: "Real Estate" },
  { value: "Cash", label: "Cash / Money Market" },
  { value: "Other", label: "Other" },
];

const TYPE_LABEL: Record<HoldingType, string> = {
  Stocks: "Stocks / ETFs",
  Bonds: "Bonds",
  Retirement: "Retirement (401k/IRA)",
  RealEstate: "Real Estate",
  Cash: "Cash / Money Market",
  Other: "Other",
};

// Fixed categorical order — validated CVD-safe slots 1-6 (blue, orange,
// aqua, yellow, magenta, green). Identity is assigned by type, never by
// rank, so a type's color never changes as holdings are added/removed.
const TYPE_COLOR: Record<HoldingType, string> = {
  Stocks: "#2a78d6",
  Bonds: "#eb6834",
  Retirement: "#1baf7a",
  RealEstate: "#eda100",
  Cash: "#e87ba4",
  Other: "#008300",
};

const SOLO401K_EMPLOYEE_DEFERRAL_2025 = 23500;
const SOLO401K_CATCHUP_50 = 7500;
const SOLO401K_CATCHUP_60_63 = 11250; // SECURE 2.0 "super" catch-up, ages 60-63
const SEP_CAP_2025 = 70000;

export function InvestmentFund() {
  const [holdings, setHoldings] = useLocalStorageState<Holding[]>("wc.investment.holdings", []);
  const [draft, setDraft] = useState<{ name: string; type: HoldingType; contributed: number; value: number }>({
    name: "",
    type: "Stocks",
    contributed: 0,
    value: 0,
  });
  const [holdingError, setHoldingError] = useState(false);

  function addHolding() {
    if (draft.contributed <= 0 && draft.value <= 0) {
      setHoldingError(true);
      return;
    }
    setHoldingError(false);
    setHoldings((list) => [
      ...list,
      { id: crypto.randomUUID(), name: draft.name.trim() || "(unnamed holding)", type: draft.type, contributed: draft.contributed, value: draft.value },
    ]);
    setDraft({ name: "", type: draft.type, contributed: 0, value: 0 });
  }
  function removeHolding(id: string) {
    setHoldings((list) => list.filter((h) => h.id !== id));
  }

  const holdingTotals = useMemo(() => {
    const totalContributed = holdings.reduce((s, h) => s + h.contributed, 0);
    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const totalGL = totalValue - totalContributed;
    const byType: Partial<Record<HoldingType, number>> = {};
    holdings.forEach((h) => {
      byType[h.type] = (byType[h.type] || 0) + h.value;
    });
    return { totalContributed, totalValue, totalGL, byType };
  }, [holdings]);

  const [projInput, setProjInput] = useLocalStorageState(
    "wc.investment.projector",
    { start: 0, monthly: 0, ratePct: 7, years: 10 }
  );
  const setProj = <K extends keyof typeof projInput>(key: K, value: (typeof projInput)[K]) =>
    setProjInput((s) => ({ ...s, [key]: value }));

  const projection = useMemo(() => {
    const rMonthly = projInput.ratePct / 100 / 12;
    const n = projInput.years * 12;
    const fv =
      rMonthly === 0
        ? projInput.start + projInput.monthly * n
        : projInput.start * Math.pow(1 + rMonthly, n) + projInput.monthly * ((Math.pow(1 + rMonthly, n) - 1) / rMonthly);
    const totalContributed = projInput.start + projInput.monthly * n;
    return { fv, totalContributed, totalGrowth: fv - totalContributed };
  }, [projInput]);

  const [retInput, setRetInput] = useLocalStorageState("wc.investment.retirement", { profit: 0, age: 35 });
  const setRet = <K extends keyof typeof retInput>(key: K, value: (typeof retInput)[K]) =>
    setRetInput((s) => ({ ...s, [key]: value }));

  const retirement = useMemo(() => {
    const se = calcSETax(retInput.profit);
    const adjustedNetEarnings = Math.max(retInput.profit - se.deduction, 0);
    const sepAmount = Math.min(adjustedNetEarnings * 0.2, SEP_CAP_2025);

    let catchup = 0;
    if (retInput.age >= 60 && retInput.age <= 63) catchup = SOLO401K_CATCHUP_60_63;
    else if (retInput.age >= 50) catchup = SOLO401K_CATCHUP_50;
    const combinedCap = SEP_CAP_2025 + catchup;
    const employeeDeferral = Math.min(SOLO401K_EMPLOYEE_DEFERRAL_2025 + catchup, adjustedNetEarnings);
    const employerShare = Math.min(adjustedNetEarnings * 0.2, Math.max(combinedCap - employeeDeferral, 0));
    const soloTotal = Math.min(employeeDeferral + employerShare, combinedCap);
    const winner = soloTotal > sepAmount ? "Solo 401(k)" : sepAmount > soloTotal ? "SEP-IRA" : "Either — they tie";

    return { adjustedNetEarnings, sepAmount, employeeDeferral, employerShare, soloTotal, combinedCap, winner };
  }, [retInput]);
