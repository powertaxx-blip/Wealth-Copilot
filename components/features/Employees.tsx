"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Employee,
  type EmployeesState,
  EMPLOYEES_STORAGE_KEY,
  DEFAULT_EMPLOYEES_STATE,
  blankEmployee,
  annualGrossWages,
  calcAllEmployeeCosts,
  SS_WAGE_BASE_2025,
} from "@/lib/employees";

/**
 * New panel — a business's first tool here for paying someone ELSE,
 * separate from the "File" group (Schedule C, Business Expenses,
 * Invoices) on purpose. See lib/employees.ts's file header for why a W-2
 * employee is a different animal from a 1099 contractor, and for the
 * source on every tax figure used below.
 *
 * Same list/CRUD shape as Business Expenses and Invoices: an array of
 * records in local storage, add/remove handlers, totals derived with
 * useMemo. The one new piece is the employer tax settings block (state
 * unemployment rate + wage base) — those two numbers apply to every
 * employee at once, so they live alongside the roster in the same
 * storage key rather than being re-entered per employee.
 */

const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
];

export function Employees() {
  const [state, setState] = useLocalStorageState<EmployeesState>(EMPLOYEES_STORAGE_KEY, DEFAULT_EMPLOYEES_STATE);
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [draft, setDraft] = useState<Omit<Employee, "id">>({
    name: "",
    role: "",
    payType: "hourly",
    rate: 0,
    hoursPerWeek: 0,
  });
  const [nameError, setNameError] = useState(false);

  function addEmployee() {
    if (!draft.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setState((s) => ({
      ...s,
      employees: [...s.employees, { ...blankEmployee(), ...draft, name: draft.name.trim(), role: draft.role.trim() }],
    }));
    setDraft({ name: "", role: "", payType: "hourly", rate: 0, hoursPerWeek: 0 });
  }

  function removeEmployee(id: string) {
    setState((s) => ({ ...s, employees: s.employees.filter((e) => e.id !== id) }));
  }

  const costs = useMemo(() => calcAllEmployeeCosts(state, nonprofit), [state, nonprofit]);

  const totals = useMemo(() => {
    return costs.reduce(
      (acc, c) => ({
        grossWages: acc.grossWages + c.grossWages,
        employerTax: acc.employerTax + c.totalEmployerTax,
        totalCost: acc.totalCost + c.totalCost,
      }),
      { grossWages: 0, employerTax: 0, totalCost: 0 }
    );
  }, [costs]);

  return (
    <Card
      title="Employees & Payroll"
      lede="Every other File tool tracks money that flows through YOUR taxes — Schedule C, Business Expenses, Invoices. This one is different: it's the cost of paying someone else. Log who's on payroll and see the full employer cost, wages plus the employer-side taxes the business owes on top."
    >
      <MentorNote>
        The Bhagavad Gita puts it plainly: &quot;let right deeds be thy motive, not the fruit which comes from
        them.&quot; Paying a team fairly and on the books is one of those right deeds — the employer payroll tax
        below isn&apos;t a penalty for hiring, it&apos;s simply the honest full cost of it, worth knowing before
        you commit to it rather than after.
      </MentorNote>

      <h3 className="text-lg">Add an Employee</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          value={draft.name}
          onChange={(v) => {
            setDraft((d) => ({ ...d, name: v }));
            if (v.trim()) setNameError(false);
          }}
          placeholder="e.g., Jordan Alvarez"
        />
        <TextField
          label="Role"
          value={draft.role}
          onChange={(v) => setDraft((d) => ({ ...d, role: v }))}
          placeholder="e.g., Shop assistant"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Pay type"
          value={draft.payType}
          onChange={(v) => setDraft((d) => ({ ...d, payType: v as Employee["payType"] }))}
          options={PAY_TYPE_OPTIONS}
        />
        <NumberField
          label={draft.payType === "salary" ? "Annual salary ($)" : "Hourly rate ($)"}
          value={draft.rate}
          onChange={(v) => setDraft((d) => ({ ...d, rate: v }))}
          step={draft.payType === "salary" ? 500 : 0.5}
        />
        {draft.payType === "hourly" && (
          <NumberField
            label="Hours per week"
            value={draft.hoursPerWeek}
            onChange={(v) => setDraft((d) => ({ ...d, hoursPerWeek: v }))}
          />
        )}
      </div>
      <div>
        <button className="btn gold" onClick={addEmployee}>
          + Add Employee
        </button>
      </div>
      {nameError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          Enter a name before adding the employee.
        </p>
      )}

      <h3 className="text-lg">Your Employees</h3>
      {state.employees.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No employees logged yet — add your first one above.
        </p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Pay Type</th>
              <th className="num">Annual Gross Wages</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.role || "—"}</td>
                <td>{e.payType === "salary" ? "Salary" : `Hourly (${e.hoursPerWeek} hrs/wk)`}</td>
                <td className="num">{fmt(annualGrossWages(e))}</td>
                <td>
                  <button className="btn ghost" onClick={() => removeEmployee(e.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <h3 className="text-lg">Employer Tax Settings</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="State unemployment (SUTA) rate (%)"
          value={state.sutaRatePct}
          onChange={(v) => setState((s) => ({ ...s, sutaRatePct: v }))}
          step={0.001}
        />
        <NumberField
          label="State UC taxable wage base per employee ($)"
          value={state.sutaWageBase}
          onChange={(v) => setState((s) => ({ ...s, sutaWageBase: v }))}
          step={500}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Defaults above are Pennsylvania&apos;s new-employer (non-construction) rate and taxable wage base — PA
        Department of Labor &amp; Industry. State unemployment is experience-rated, not flat, so edit both if
        you&apos;re outside PA or already know your own assigned rate.
      </p>

      <h3 className="text-lg">Employer Cost Breakdown</h3>
      {costs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Add an employee above to see the full employer cost.
        </p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th className="num">Gross Wages</th>
              <th className="num">Employer SS (6.2%)</th>
              <th className="num">Medicare (1.45%)</th>
              <th className="num">FUTA</th>
              <th className="num">State UC</th>
              <th className="num">Total Employer Tax</th>
              <th className="num">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.employee.id}>
                <td>{c.employee.name}</td>
                <td className="num">{fmt(c.grossWages)}</td>
                <td className="num">{fmt(c.socialSecurity)}</td>
                <td className="num">{fmt(c.medicare)}</td>
                <td className="num">{nonprofit ? "Exempt" : fmt(c.futa)}</td>
                <td className="num">{fmt(c.suta)}</td>
                <td className="num">{fmt(c.totalEmployerTax)}</td>
                <td className="num">{fmt(c.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {nonprofit && costs.length > 0 && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          FUTA shows as Exempt because 501(c)(3) organizations are exempt from federal unemployment tax by law —
          Social Security, Medicare, and state unemployment still apply the same as any other employer.
        </p>
      )}

      <ResultBox
        label="Total fully-loaded payroll cost"
        big={fmt(totals.totalCost)}
        stats={[
          { v: String(state.employees.length), k: "Employees" },
          { v: fmt(totals.grossWages), k: "Total gross wages" },
          { v: fmt(totals.employerTax), k: "Employer payroll tax" },
        ]}
      />

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        A deliberately simplified estimate for planning, not a payroll filing — it doesn&apos;t account for
        workers&apos; comp, benefits, wages above the {fmt(SS_WAGE_BASE_2025)} Social Security wage base changing
        mid-year, or a state credit-reduction year raising the real FUTA rate. Entries here live only in this
        browser for now — nothing is saved to an account or synced yet.
      </p>
    </Card>
  );
}
