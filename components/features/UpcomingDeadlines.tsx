"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { todayUTC } from "@/lib/form990";
import { buildDeadlines, readDeadlineSources, daysUntil, DEADLINE_WINDOW_DAYS, type Deadline } from "@/lib/deadlines";

/**
 * Home's "Upcoming Deadlines" card — see lib/deadlines.ts. Read once on
 * mount, same as Home's own snapshot read: it's client-only (localStorage)
 * and a point-in-time list, not a live subscription. Renders nothing
 * until that read has happened, and nothing at all if no panel has a
 * date to contribute — a new visitor sees no empty box.
 */

function whenLabel(d: Deadline, today: number): string {
  if (d.overdue) return "Overdue";
  const n = daysUntil(d.due, today);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

export function UpcomingDeadlines() {
  const [state, setState] = useState<{ items: Deadline[]; today: number } | null>(null);

  useEffect(() => {
    const today = todayUTC();
    setState({ items: buildDeadlines(readDeadlineSources(), today), today });
  }, []);

  if (!state || state.items.length === 0) return null;
  const { items, today } = state;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg">Upcoming Deadlines</h3>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Next {DEADLINE_WINDOW_DAYS} days, from what you&apos;ve entered
        </span>
      </div>
      <ul className="flex flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((d) => {
          const n = daysUntil(d.due, today);
          const tone = d.overdue ? "critical" : n < 30 ? "warning" : "good";
          return (
            <li key={d.id}>
              <Link
                href={d.href}
                className="flex items-center gap-3"
                style={{
                  display: "flex",
                  textDecoration: "none",
                  color: "var(--ink)",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  borderLeft: `4px solid var(--status-${tone})`,
                }}
              >
                <span style={{ minWidth: "64px", textAlign: "center", lineHeight: 1.15 }}>
                  <span className="text-xs" style={{ display: "block", color: "var(--muted)", textTransform: "uppercase" }}>
                    {new Date(d.due).toLocaleDateString("en-US", { timeZone: "UTC", month: "short" })}
                  </span>
                  <span className="text-xl font-bold" style={{ display: "block" }}>
                    {new Date(d.due).getUTCDate()}
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="text-sm font-semibold" style={{ display: "block" }}>
                    {d.title}
                  </span>
                  <span className="text-xs" style={{ display: "block", color: "var(--ink-soft)" }}>
                    {d.detail}
                  </span>
                </span>
                <span className="text-xs font-semibold" style={{ color: `var(--status-${tone})`, whiteSpace: "nowrap" }}>
                  {whenLabel(d, today)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
