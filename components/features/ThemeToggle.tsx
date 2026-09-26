"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

/**
 * Reads/writes the same `data-theme` attribute the globals.css token
 * system already watches for (see the artifact-design three-state
 * theming pattern: bare :root, prefers-color-scheme, [data-theme]).
 * The old HTML prototype never had a manual toggle — this makes the
 * theming system's third state (an explicit choice) actually reachable.
 */
export function ThemeToggle() {
  // null until the saved choice has been read. Before this, the apply
  // effect ran once with the "system" default before the saved value
  // loaded — writing "system" over a saved "dark" for a moment (a brief
  // flash of the light theme) and saving a theme for every visitor who
  // never chose one, so "Clear my saved data" always left wc.theme behind.
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("wc.theme");
    } catch {
      // storage unavailable — fall back to the system theme
    }
    setChoice(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  useEffect(() => {
    if (choice === null) return;
    if (choice === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", choice);
    }
    try {
      // "Match system" is the default, so it's stored as no key at all.
      if (choice === "system") window.localStorage.removeItem("wc.theme");
      else window.localStorage.setItem("wc.theme", choice);
    } catch {
      // storage unavailable — theme choice just won't persist across reloads
    }
  }, [choice]);

  return (
    <div className="field max-w-xs">
      <label>Appearance</label>
      <select value={choice ?? "system"} onChange={(e) => setChoice(e.target.value as ThemeChoice)}>
        <option value="system">Match system</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
