"use client";

import { useEffect, useState } from "react";

/**
 * "Print / Save as PDF" for report-style pages (Snapshot, Financial
 * Health, Cash-Flow Forecast) — a clean printout to hand a board or a
 * loan officer. Same mechanism Invoices already uses: window.print(),
 * whose dialog offers "Save as PDF" in every modern browser, so no PDF
 * library is needed. The print styles in app/globals.css hide the site
 * header, buttons, Mentor's Notes and anything marked .no-print; this
 * component adds a report header that appears only on paper.
 */
export function PrintReport({ title }: { title: string }) {
  // Filled in client-side so the server render and hydration agree.
  const [prepared, setPrepared] = useState("");
  useEffect(() => {
    setPrepared(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  return (
    <>
      <div className="flex justify-end no-print">
        <button type="button" className="btn ghost" onClick={() => window.print()}>
          🖨 Print / Save as PDF
        </button>
      </div>
      <div className="print-only print-report-header">
        <div className="print-report-title">{title}</div>
        <div className="print-report-meta">
          Prepared {prepared} · Wealth Copilot by Power Taxx Ltd. · Figures are as entered by the user; not tax, legal, or
          investment advice.
        </div>
      </div>
    </>
  );
}
