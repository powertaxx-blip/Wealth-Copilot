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
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = (window.localStorage.getItem("wc.theme") as ThemeChoice | null) ?? "system";
    setChoice(stored);
  }, []);

  useEffect(() => {
    if (choice === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", choice);
    }
    try {
      window.localStorage.setItem("wc.theme", choice);
    } catch {
      // storage unavailable — theme choice just won't persist across reloads
    }
  }, [choice]);

  return (
    <div className="field max-w-xs">
      <label>Appearance</label>
      <select value={choice} onChange={(e) => setChoice(e.target.value as ThemeChoice)}>
        <option value="system">Match system</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
