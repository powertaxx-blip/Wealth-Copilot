"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { calcSETax, ficaOnWages } from "@/lib/tax";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * Direct port of the vanilla-JS "Filing Status Guide" panel — two static
 * reference sections (who needs what, for individuals and for business
 * entity types) plus the one interactive piece, the S-Corp vs. Sole Prop
 * savings calculator (`calcSCorpSavings()` in the prototype). Reuses
 * `calcSETax()` (already ported for the Tax Estimator) and the new
 * `ficaOnWages()` helper so the payroll-tax math lives in one place.
 */

function RefCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ boxShadow: "none", borderStyle: "dashed" }}>
      <h4 className="mt-0" style={{ color: "var(--navy)" }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

type ScorpState = { profit: number; salary: number; costs: number };
const initial: ScorpState = { profit: 0, salary: 0, costs: 0 };

export function FilingStatusGuide() {
  const [state, setState] = useLocalStorageState<ScorpState>("wc.scorp", initial);
  const set = <K extends keyof ScorpState>(key: K, value: ScorpState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const r = useMemo(() => {
    const profit = state.profit;
    const salary = Math.min(state.salary, profit);
    const extraCosts = state.costs;

    const soleProp = calcSETax(profit);
    const scorpFica = ficaOnWages(salary);
    const scorpPayrollTax = scorpFica.total;
    const distribution = Math.max(profit - salary, 0);
    const grossSavings = soleProp.seTax - scorpPayrollTax;
    const netSavings = grossSavings - extraCosts;

    let tone: "good" | "warning" | "critical" = "warning";
    let label = "Enter your numbers above";
    if (profit > 0) {
      if (netSavings > 0) {
        tone = "good";
        label = `Saves about ${fmt(netSavings)}/yr`;
      } else {
        tone = "critical";
        label = `Costs about ${fmt(Math.abs(netSavings))}/yr more`;
      }
    }

    return { salary, soleProp, scorpPayrollTax, distribution, grossSavings, netSavings, tone, label };
  }, [state]);

  return (
    <Card
      title="What You Need to File — Filing Status Guide"
      lede="Filing status isn't just a checkbox — it decides your standard deduction, your tax brackets, and which credits you can even claim. Here's what each one means and what paperwork it takes, in plain English."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          The Bhagavad Gita teaches that every person has their own <i>dharma</i> — their own rightful duty and
          place. Your filing status works the same way: it&apos;s not about which one sounds best, it&apos;s about
          which one actually fits your real life on December 31st.
        </div>
      </div>

      <h3 className="text-lg">Individuals</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <RefCard title="Single">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Unmarried, divorced, or legally separated as of Dec 31, and not qualifying for Head of Household.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Social Security number, all W-2s and 1099s, records of any deductible expenses
            (student loan interest, IRA contributions), last year&apos;s return for reference.
          </p>
        </RefCard>
        <RefCard title="Married Filing Jointly (MFJ)">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Married as of Dec 31; you and your spouse combine income on one return. Usually the lowest combined tax.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Both spouses&apos; SSNs, all W-2s/1099s for both, both spouses&apos; signatures
            (or e-file PIN), joint or separate account info for refund/payment.
          </p>
        </RefCard>
        <RefCard title="Married Filing Separately (MFS)">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Married, but filing on two separate returns — sometimes used to protect one spouse from the
            other&apos;s tax issues, or when it lowers a specific credit calculation.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Same as MFJ but split by spouse; note many credits (EITC, education credits)
            are reduced or unavailable under MFS — worth a real conversation before choosing this one.
          </p>
        </RefCard>
        <RefCard title="Head of Household (HOH)">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Unmarried, paid more than half the cost of keeping up a home, and had a qualifying dependent living
            with you more than half the year.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Dependent&apos;s SSN and proof of residency (school/medical records showing
            your address), proof you paid over half of household costs.
          </p>
        </RefCard>
        <RefCard title="Qualifying Surviving Spouse (QSS)">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Available for the two tax years right after your spouse&apos;s death (the year they died, you still
            typically file MFJ). You must have a dependent child living with you, pay over half the cost of the
            home, and not have remarried — it lets you keep the joint-return tax rates and standard deduction even
            though you&apos;re now filing alone.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Your spouse&apos;s date of death, your dependent child&apos;s SSN and proof
            they lived with you all year, proof you paid over half the cost of keeping up the home.
          </p>
        </RefCard>
      </div>
