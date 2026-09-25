"use client";

import { useState, type ReactNode } from "react";
import { POWER_THOUGHTS, POWER_THOUGHT_SOURCE, drawPowerThought } from "@/lib/powerThoughts";

/**
 * The Mentor's Note card (see app/globals.css's ".mentor" comment for the
 * visual design) used to render its full quote inline, every time, on
 * every panel. Per user feedback: the note should still clearly be
 * *there* — nobody should think a panel is missing its mentor's note —
 * but reading it should be a deliberate click, not something forced into
 * view above the actual numbers someone came to enter. So this collapses
 * to a single-line strip showing just the "Mentor's Note" label, and
 * expands in place on click.
 *
 * Every features/*.tsx panel that used to render:
 *   <div className="mentor"><div><span className="eyebrow">Mentor's Note</span>...text...</div></div>
 * now renders:
 *   <MentorNote>...text...</MentorNote>
 * with the exact same note text passed through unchanged.
 */
export function MentorNote({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Power Thought rotation: underneath every panel's own note, one line
  // from the app author's book (lib/powerThoughts.ts). Drawn the first
  // time this note is opened on a visit — not on mount — so a note nobody
  // opens doesn't use up a line from the deck, and so the random pick
  // happens client-side in an event handler (no hydration mismatch, and
  // no double draw from React Strict Mode's doubled effects in dev). It
  // then stays the same for the rest of the visit; the next visit draws
  // a fresh one.
  const [thoughtIndex, setThoughtIndex] = useState<number | null>(null);

  function toggle() {
    if (!open && thoughtIndex === null) setThoughtIndex(drawPowerThought());
    setOpen((o) => !o);
  }

  return (
    <div className="mentor" data-open={open}>
      <div style={{ width: "100%" }}>
        <button
          type="button"
          className="mentor-toggle"
          onClick={toggle}
          aria-expanded={open}
        >
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            Mentor&apos;s Note
          </span>
          <span className="mentor-toggle-hint">{open ? "Hide ▲" : "Tap to read ▼"}</span>
        </button>
        {open && (
          <div className="mentor-body">
            {children}
            {thoughtIndex !== null && (
              <div className="mentor-power-thought">
                <span className="eyebrow">Power Thought</span>
                &ldquo;{POWER_THOUGHTS[thoughtIndex]}&rdquo;
                <span className="mentor-power-thought-credit">
                  — {POWER_THOUGHT_SOURCE.author}, <i>{POWER_THOUGHT_SOURCE.title}</i>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
