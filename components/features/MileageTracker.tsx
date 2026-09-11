"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Trip,
  type MileageRateType,
  MILEAGE_STORAGE_KEY,
  IRS_MILEAGE_RATE_2025,
  CHARITABLE_MILEAGE_RATE,
  calcMileageDeduction,
} from "@/lib/mileage";
import { mergeMilesIntoScheduleC } from "@/lib/scheduleC";

/**
 * New to this build — no equivalent in the original prototype (see
 * MIGRATION.md). Designed fresh in the same list/CRUD shape Business
 * Expenses and Debt Payoff Planner already use: an array of trips in
 * state, add/remove handlers, and a total computed with useMemo. The one
 * thing that's genuinely new is the same cross-panel push Business
 * Expenses does — see lib/scheduleC.ts's file header for why that's a
 * localStorage merge instead of shared React state.
 *
 * Nonprofit Mode (lib/orgType.ts) adds a per-trip rate type — see
 * lib/mileage.ts's file header for why a volunteer's mileage is a
 * completely different rate (and a different kind of tax benefit
 * entirely) than a staff member's. Every trip is always saved with a
 * `rateType`, but the selector to change it only appears here in
 * Nonprofit Mode, and the "push to Schedule C" button (which only makes
 * sense for a sole prop/individual filer, not a tax-exempt organization)
 * is hidden there instead.
 */

const RATE_TYPE_OPTIONS: { value: MileageRateType; label: string }[] = [
  { value: "business", label: "Staff / Business Travel (IRS rate)" },
  { value: "charitable", label: "Volunteer Driving (charitable rate)" },
];

export function MileageTracker() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [trips, setTrips] = useLocalStorageState<Trip[]>(MILEAGE_STORAGE_KEY, []);
  const [draft, setDraft] = useState<{ date: string; purpose: string; miles: number; rateType: MileageRateType }>({
    date: "",
    purpose: "",
    miles: 0,
    rateType: "business",
  });
  const [milesError, setMilesError] = useState(false);
  const router = useRouter();

  function addTrip() {
    if (draft.miles <= 0) {
      setMilesError(true);
      return;
    }
    setMilesError(false);
    setTrips((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        date: draft.date.trim() || "(no date)",
        purpose: draft.purpose.trim() || "(no purpose noted)",
        miles: draft.miles,
        rateType: nonprofit ? draft.rateType : "business",
      },
    ]);
    setDraft((d) => ({ ...d, date: "", purpose: "", miles: 0, rateType: "business" }));
  }

  function removeTrip(id: string) {
    setTrips((list) => list.filter((t) => t.id !== id));
  }

  const r = useMemo(() => calcMileageDeduction(trips, nonprofit), [trips, nonprofit]);

  function pushToScheduleC() {
    mergeMilesIntoScheduleC(r.businessMiles);
    router.push("/schedulec");
  }

  return (
    <Card
      title="Mileage Tracker"
      lede={
        nonprofit
          ? "Log trips one at a time — date, purpose, miles, and who was driving — and this totals them at the right rate for each: staff travel at the IRS business rate, volunteer driving at the separate charitable rate."
          : "Log business trips one at a time — date, purpose, miles — and this totals them automatically at the IRS standard mileage rate, then hands that total straight to your Schedule C."
      }
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              The Four Tops sang &quot;reach out, I&apos;ll be there&quot; — that&apos;s exactly what a volunteer
              driving on your organization&apos;s behalf is doing. The tax code honors it too, just at its own
              fixed rate: 14¢/mile, set by law and unchanged since 1998.
            </>
          ) : (
            <>
              Marvin Gaye asked &quot;what&apos;s going on?&quot; With mileage, the answer&apos;s simple — log the
              trip the day it happens, before the odometer (or your memory) moves on.
            </>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${nonprofit ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <TextField
          label="Date"
          value={draft.date}
          onChange={(v) => setDraft((d) => ({ ...d, date: v }))}
          placeholder="e.g., 2026-03-14"
        />
        <TextField
          label="Purpose / destination"
          value={draft.purpose}
          onChange={(v) => setDraft((d) => ({ ...d, purpose: v }))}
          placeholder={nonprofit ? "e.g., Food pantry delivery run" : "e.g., Client meeting — downtown office"}
        />
        <NumberField
          label="Miles driven"
          value={draft.miles}
          onChange={(v) => {
            setDraft((d) => ({ ...d, miles: v }));
            if (v > 0) setMilesError(false);
          }}
        />
        {nonprofit && (
          <SelectField
            label="Mileage Type"
            value={draft.rateType}
            onChange={(v) => setDraft((d) => ({ ...d, rateType: v as MileageRateType }))}
            options={RATE_TYPE_OPTIONS}
          />
        )}
      </div>
      <button className="btn gold" onClick={addTrip}>
        + Add Trip
      </button>
      {milesError && (
        <p className="text-sm" style={{ color: "var(--status-critical)" }}>
          Enter miles greater than 0 before adding the trip.
        </p>
      )}

      <h3 className="text-lg">Trip Log</h3>
      {trips.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No trips logged yet — add your first one above.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Purpose</th>
              {nonprofit && <th>Type</th>}
              <th className="num">Miles</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.purpose}</td>
                {nonprofit && <td>{t.rateType === "charitable" ? "Volunteer" : "Staff"}</td>}
                <td className="num">{t.miles.toLocaleString()}</td>
                <td>
                  <button className="btn ghost" onClick={() => removeTrip(t.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {nonprofit ? (
        <ResultBox
          label="Estimated total mileage deduction"
          big={fmt(r.deduction)}
          stats={[
            { v: `${r.businessMiles.toLocaleString()} mi`, k: `Staff Miles @ $${IRS_MILEAGE_RATE_2025.toFixed(2)}/mi` },
            {
              v: `${r.charitableMiles.toLocaleString()} mi`,
              k: `Volunteer Miles @ $${CHARITABLE_MILEAGE_RATE.toFixed(2)}/mi`,
            },
          ]}
        />
      ) : (
        <ResultBox
          label={`Estimated mileage deduction at $${IRS_MILEAGE_RATE_2025.toFixed(2)}/mile (IRS 2025 rate)`}
          big={fmt(r.deduction)}
          stats={[{ v: `${r.totalMiles.toLocaleString()} mi`, k: "Total Business Miles" }]}
        />
      )}
      {!nonprofit && (
        <button className="btn gold mt-2" onClick={pushToScheduleC}>
          Push total miles into Schedule C →
        </button>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        {nonprofit
          ? "This tracks miles you tell it about — it doesn't read GPS or auto-detect trips yet. Volunteer mileage is a personal itemized deduction on the volunteer's own return, not an organizational expense — if the organization reimburses a volunteer above 14¢/mile, the excess is generally taxable income to them."
          : "This tracks miles you tell it about — it doesn't read GPS or auto-detect trips yet. Entries live only in this browser for now, and pushing to Schedule C replaces its mileage field with this total (its other fields are untouched)."}
      </p>
    </Card>
  );
}
