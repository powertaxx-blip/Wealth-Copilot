"use client";

import { useState, type ReactNode } from "react";

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

  return (
    <div className="mentor" data-open={open}>
      <div style={{ width: "100%" }}>
        <button
          type="button"
          className="mentor-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            Mentor&apos;s Note
          </span>
          <span className="mentor-toggle-hint">{open ? "Hide ▲" : "Tap to read ▼"}</span>
        </button>
        {open && <div className="mentor-body">{children}</div>}
      </div>
    </div>
  );
}
