# Wealth Copilot — React Rebuild

This is the start of a real Next.js/TypeScript rebuild of the Power Taxx Ltd. Wealth
Copilot prototype, which today lives as one self-contained HTML file
(`power-taxx-app.html`) with all its logic in vanilla JavaScript template
literals. That file is a great demo — it's zero-dependency and you can text a
link to a client — but it can't grow a real backend, a real database, or a
real AI layer behind it. This project is the first step toward the
architecture described in the `Wealth Copilot Blueprint` document (Section
02, "Target System Architecture").

## What's actually working here (not just scaffolded)

Two panels are fully ported with real logic, not placeholders:

- **`/breakeven`** — `components/features/BreakEvenCalculator.tsx`. Single-form
  calculator pattern: local state via a small persistence hook, derived
  values computed on every render, conditional result rendering.
- **`/budgeting`** — `components/features/DebtPayoffPlanner.tsx`. List/CRUD
  pattern: an array of records in state, add/remove handlers, and a pure
  simulation function (`simulate()`) run inside `useMemo` so it only
  re-computes when the inputs actually change.

Between the two, every state-management pattern the rest of the app needs is
already demonstrated. Porting the remaining 11 panels is repetition of these
two shapes, not new architecture.

**`/settings`** is new — the original app never had a dedicated settings
screen. It exists here because a real app needs one: a manual light/dark
override (`ThemeToggle.tsx`, using the same `data-theme` attribute the CSS
tokens already watch for) and a data-export/clear control
(`DataControls.tsx`) that supersedes the old footer's "Clear my saved data"
link with an actual export-to-JSON option first.

Every other panel (`/snapshot`, `/filing`, `/faq`, `/quiz`, `/emergency`,
`/investment`, `/estimator`, `/mileage`, `/bizexpenses`, `/schedulec`,
`/balance`, `/invoices`) has a real route and a labeled "not yet ported"
placeholder, so the URL structure and nav reflect the full app from day one
instead of only the parts that are done.

## Architecture decisions

**State management: no Redux/Zustand, on purpose.** Each panel's state is
local to its component, persisted through `lib/useLocalStorageState.ts` — a
typed hook that mirrors the old app's `saveState()`/`loadState()` behavior
(debounced writes, silent failure in private browsing) but gives each panel
its own storage key instead of one shared blob. This matches how the old app
actually behaved (every panel was independent) without inventing a global
store that the current feature set doesn't need yet. If/when the backend in
the system blueprint exists, these hooks are the seam: swap
`useLocalStorageState` for a hook that reads/writes the API instead, and no
component code changes.

**Design tokens ported, not redesigned.** `app/globals.css` carries over the
exact CSS custom properties from the HTML prototype — same three-state
light/dark pattern (bare `:root`, a `prefers-color-scheme` block, a
`[data-theme]` override block), same navy/gold palette, same component class
names (`.card`, `.result-box`, `.stat-strip`, `.status-pill`). Tailwind is
used only for layout utilities (`flex`, `grid`, `gap-*`) — color and
component styling stays token-driven so the visual identity didn't have to
be rebuilt from scratch.

**Routing: one URL per panel.** The old app was a single page with
JavaScript-driven tab switching (`showTab()`); this rebuild gives every panel
a real Next.js route instead. That means a link to `/estimator` or
`/invoices` works on its own, refreshes correctly, and is ready for
route-level code-splitting — none of which a client-side tab switch can do.

## Port order (recommended)

1. **Tax Estimator** (`/estimator`) — the pure calculation functions
   (`calcFederalTax`, `calcSETax`, `calcEITC`) port almost unchanged into a
   `lib/tax.ts` module; the component work is mostly the results layout.
2. **Schedule C** (`/schedulec`) and **Business Expenses** (`/bizexpenses`) —
   share the list/CRUD pattern `DebtPayoffPlanner.tsx` already demonstrates,
   plus the "push totals to Schedule C" cross-panel flow, which becomes a
   small shared context or a lifted-state hook once both panels exist.
3. **Mileage Tracker** (`/mileage`) and **Invoices** (`/invoices`) — same
   list/CRUD shape again.
4. **Investment Fund** (`/investment`), **Emergency Fund** (`/emergency`),
   **Balance Sheet** (`/balance`) — single-form calculators, same shape as
   `BreakEvenCalculator.tsx`.
5. **Filing Status Guide** (`/filing`), **FAQ** (`/faq`), **Quiz** (`/quiz`) —
   mostly static content plus one calculator (S-Corp vs. Sole Prop) and one
   piece of interactive state (the quiz's scoring). Good candidates to
   revisit once the Phase 1 AI layer exists, since the FAQ panel is the one
   the system blueprint plans to replace with a real assistant.
6. **Snapshot** (`/snapshot`) — deliberately last, since it reads a bit of
   state from every other panel and only makes sense once most of them are
   real.

## Running this project

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Verified: `npm install`, `npm run build` (all 17 routes compile and type-check
clean), and `npm run dev` with the `/`, `/breakeven`, `/budgeting`,
`/settings`, and a stub route all smoke-tested with real HTTP requests before
this was handed off. One harmless build-time warning shows up in network-
restricted sandboxes: Next.js tries to pre-fetch and minify the Google Fonts
stylesheet during `next build` and can't reach `fonts.googleapis.com` if that
host isn't allowlisted — it just skips that optimization and falls back to
loading the font normally via the `<link>` tag in `app/layout.tsx`, so the
page still renders with the right fonts. With normal internet access (any
real dev machine or CI) that warning won't appear at all.

## Relationship to the other two documents

- `power-taxx-app.html` — the original working prototype. Still the fastest
  way to demo the full feature set to a client today; this rebuild doesn't
  replace it until every panel above is ported.
- **Wealth Copilot Blueprint** (published artifact) — the system-level plan:
  backend, database, AI layer, integrations, security, and the business
  model. This project is the first concrete step inside that blueprint's
  "Client Experience" layer.
