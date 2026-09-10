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
      
      <h3 className="text-lg mt-2">Businesses &amp; Corporations</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <RefCard title="Sole Proprietor / Single-Member LLC">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            No separate business return — reported on your personal Form 1040 using Schedule C (profit/loss) and
            Schedule SE (self-employment tax).
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Total business income, itemized expenses by category, mileage log if claiming
            vehicle use, home office square footage if applicable, any 1099-NEC/1099-K received.
          </p>
        </RefCard>
        <RefCard title="Partnership">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Two or more owners. The business files an informational return; each partner gets a Schedule K-1
            showing their share, which flows to their personal return.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Form 1065, partnership agreement, each partner&apos;s ownership %, K-1s issued
            to every partner. Due March 15.
          </p>
        </RefCard>
        <RefCard title="S-Corporation">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Pass-through like a partnership, but owners who work in the business must pay themselves a
            &quot;reasonable salary&quot; via payroll before taking distributions.
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Form 1120-S, K-1s for each shareholder, payroll records (W-2 for
            owner-employees), Form 2553 election on file with the IRS. Due March 15.
          </p>
        </RefCard>
        <RefCard title="C-Corporation">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            A separate taxable entity — the corporation pays its own flat 21% federal tax, and owners are taxed
            again on any dividends they receive (&quot;double taxation&quot;).
          </p>
          <p className="text-sm">
            <b>You&apos;ll need:</b> Form 1120, corporate financial statements (balance sheet + income statement),
            board meeting minutes/resolutions, EIN. Due April 15 (calendar year).
          </p>
        </RefCard>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Deadlines shown are typical federal due dates for tax year 2025 returns filed in 2026 and assume a
        calendar-year business; extensions and exceptions apply. Confirm exact dates on IRS.gov each year, since
        weekends/holidays shift them.
      </p>

      <h3 className="text-lg mt-2">S-Corp vs. Sole Prop: What Would You Actually Save?</h3>
      <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
        The most common reason a profitable sole proprietor elects S-Corp status is self-employment tax savings.
        As a sole prop, you pay 15.3% SE tax on nearly all your net profit. As an S-Corp, you only pay FICA on the
        &quot;reasonable salary&quot; you pay yourself — profit taken as a distribution above that salary escapes
        SE tax entirely. Run your own numbers below.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField label="Expected net business profit this year" value={state.profit} onChange={(v) => set("profit", v)} />
        <NumberField
          label="Reasonable salary you'd pay yourself (S-Corp)"
          value={state.salary}
          onChange={(v) => set("salary", v)}
        />
        <NumberField
          label="Extra S-Corp costs (payroll service, extra accounting, tax prep)"
          value={state.costs}
          onChange={(v) => set("costs", v)}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Structure</th>
            <th className="num">Payroll / SE Tax</th>
            <th className="num">Distribution (no SE tax)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sole Proprietor</td>
            <td className="num">{fmt(r.soleProp.seTax)}</td>
            <td className="num">{fmt(0)}</td>
          </tr>
          <tr>
            <td>S-Corp (salary {fmt(r.salary)})</td>
            <td className="num">{fmt(r.scorpPayrollTax)}</td>
            <td className="num">{fmt(r.distribution)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Gross tax savings from S-Corp election</td>
            <td className="num" colSpan={2}>
              {fmt(r.grossSavings)}
            </td>
          </tr>
          <tr>
            <td>Less: extra S-Corp running costs</td>
            <td className="num" colSpan={2}>
              -{fmt(state.costs)}
            </td>
          </tr>
          <tr>
            <td>
              <b>Net savings (or cost) vs. sole prop</b>
            </td>
            <td className="num" colSpan={2}>
              <b>{fmt(r.netSavings)}</b>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="result-box mt-4">
        <div className="label">Bottom line</div>
        <div className="mt-2">
          <StatusPill tone={r.tone}>{r.label}</StatusPill>
        </div>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        This compares self-employment/FICA tax only — it does not model income tax differences (usually similar
        either way since profit is taxed once as personal income regardless of entity), the Qualified Business
        Income deduction interaction, or state-level entity fees. &quot;Reasonable salary&quot; must reflect what a
        similar role would pay in the open market — the IRS actively audits S-Corps that pay artificially low
        salaries specifically to dodge payroll tax. Talk to a tax professional before making the election (Form
        2553).
      </p>
    </Card>
  );
}
