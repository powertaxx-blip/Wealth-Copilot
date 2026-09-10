"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { type Trip, MILEAGE_STORAGE_KEY, IRS_MILEAGE_RATE_2025, calcMileageDeduction } from "@/lib/mileage";
import { mergeMilesIntoScheduleC } from "@/lib/scheduleC";

/**
 * New to this build — no equivalent in the original prototype (see
 * MIGRATION.md). Designed fresh in the same list/CRUD shape Business
 * Expenses and Debt Payoff Planner already use: an array of trips in
 * state, add/remove handlers, and a total computed with useMemo. The one
 * thing that's genuinely new is the same cross-panel push Business
 * Expenses does — see lib/scheduleC.ts's file header for why that's a
 * localStorage merge instead of shared React state.
 */
export function MileageTracker() {
  const [trips, setTrips] = useLocalStorageState<Trip[]>(MILEAGE_STORAGE_KEY, []);
  const [draft, setDraft] = useState({ date: "", purpose: "", miles: 0 });
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
      },
    ]);
    setDraft((d) => ({ ...d, date: "", purpose: "", miles: 0 }));
  }

  function removeTrip(id: string) {
    setTrips((list) => list.filter((t) => t.id !== id));
  }

  const { totalMiles, deduction } = useMemo(() => calcMileageDeduction(trips), [trips]);

  function pushToScheduleC() {
    mergeMilesIntoScheduleC(totalMiles);
    router.push("/schedulec");
  }

  return (
    <Card
      title="Mileage Tracker"
      lede="Log business trips one at a time — date, purpose, miles — and this totals them automatically at the IRS standard mileage rate, then hands that total straight to your Schedule C."
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          Marvin Gaye asked &quot;what&apos;s going on?&quot; With mileage, the answer&apos;s simple — log the trip
          the day it happens, before the odometer (or your memory) moves on.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          placeholder="e.g., Client meeting — downtown office"
        />
        <NumberField
          label="Miles driven"
          value={draft.miles}
          onChange={(v) => {
            setDraft((d) => ({ ...d, miles: v }));
            if (v > 0) setMilesError(false);
          }}
        />
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
              <th className="num">Miles</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.purpose}</td>
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

      <ResultBox
        label={`Estimated mileage deduction at $${IRS_MILEAGE_RATE_2025.toFixed(2)}/mile (IRS 2025 rate)`}
        big={fmt(deduction)}
        stats={[{ v: `${totalMiles.toLocaleString()} mi`, k: "Total Business Miles" }]}
      />
      <button className="btn gold mt-2" onClick={pushToScheduleC}>
        Push total miles into Schedule C →
      </button>

      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        This tracks miles you tell it about — it doesn&apos;t read GPS or auto-detect trips yet. Entries live only
        in this browser for now, and pushing to Schedule C replaces its mileage field with this total (its other
        fields are untouched).
      </p>
    </Card>
  );
}
