# Accounts & Cloud Sync — Design Proposal

**Status:** proposal for review. Nothing here is built yet.

## The problem

Everything a user enters in Wealth Copilot lives only in their browser's `localStorage`, under keys starting with `wc.` (one per panel: `wc.estimator`, `wc.grants`, `wc.creditHealth`, …). That means:

- Clearing browser data, or using a private window, erases everything.
- A phone and a laptop never see each other's data.
- The only safety net is Settings → export/import backup, which users have to remember to use.

## Goals

1. A user can sign in and see the same data on any device.
2. Nothing breaks for people who never sign in — the app keeps working exactly as it does today.
3. Data a signed-in user already has in their browser is carried over on first sign-in, not lost.
4. The security and legal responsibilities of holding people's financial data are understood and met *before* launch.

## Recommended approach: Supabase, local-first

**Why Supabase:** hosted Postgres plus built-in sign-in, with row-level security so each user can only ever read their own rows — enforced by the database itself, not just by app code. It has a free tier (currently 500 MB database, 50,000 monthly active users) and a $25/month Pro tier. Alternatives considered: Firebase (similar, but a document store with a different security model) and Clerk + Neon (two vendors instead of one). Supabase is the simplest single vendor that fits.

**Sign-in:** email magic link (no passwords to store or reset), with Google sign-in as an optional second step. Multi-factor authentication available from day one.

**Storage shape** — one table that mirrors the existing `wc.` keys, so no panel has to change how it stores data:

| column | type | notes |
|---|---|---|
| `user_id` | uuid | the signed-in user; row-level security restricts every read/write to your own |
| `key` | text | the same `wc.` key the panel already uses, e.g. `wc.grants` |
| `value` | jsonb | the same JSON that's in `localStorage` today |
| `updated_at` | timestamptz | used to decide which copy is newer |

**Sync model — local-first:**

- `localStorage` stays the app's working copy. Every panel keeps using `useLocalStorageState` unchanged.
- When signed in, a small sync layer pushes each changed key to Supabase (debounced, like saves already are) and pulls on sign-in and when the tab regains focus.
- Conflicts (the same key edited on two devices while offline): newest `updated_at` wins, per key. Simple, and rare for a single-person app — but it means the older edit is discarded, which the UI should say.
- First sign-in on a device that already has data: upload it. If the account also already has data, ask the user which to keep rather than silently merging.
- Signing out leaves a copy in the browser (as today) with an option to clear it.

**Not synced:** the Power Thought deck position (`wc.powerThoughtDeck`) and appearance settings — per-device preferences, not data.

## Security and legal — the part that needs a decision first

Storing people's finances on a server changes the app's obligations. In particular:

- **Power Taxx is a tax business.** The FTC Safeguards Rule (under the Gramm-Leach-Bliley Act) applies to paid tax preparers and requires a written information security program, encryption, multi-factor authentication for access to customer data, and breach notification. IRS Publication 4557 covers the same ground for tax professionals. If this app's users are Power Taxx clients, holding their data likely falls under those rules. **This should be confirmed with a professional before launch.**
- A **privacy policy and terms of use** become necessary: what's collected, why, where it's stored, how to delete it.
- Users need **"export my data" and "delete my account"** — the export already exists; deletion would be new.
- The app already avoids the most sensitive fields (no SSNs, no tax IDs, no bank logins) — that should stay a hard rule.
- Supabase encrypts data at rest and in transit; row-level security must be tested so one user can never read another's rows.

## Rollout plan

1. **Decide** the legal/security question above, and pick sign-in methods.
2. **Build sign-in only** — accounts exist, nothing syncs yet. Low risk.
3. **Build sync** behind an opt-in "Back up to my account" switch, with the first-sign-in carry-over.
4. **Test** with a few real users across two devices, including offline edits.
5. **Launch** with the privacy policy, account deletion, and a clear note on the Home page.

Rough effort: steps 2–4 are several build-and-test rounds, similar in size to the Grant Writing Tool plus Credit Health together.

## Open questions for you

1. Are the app's users Power Taxx clients (which likely triggers the Safeguards Rule), the general public, or both?
2. Email magic link only, or also Google sign-in?
3. Should signing in be optional forever, or eventually required?
4. Who will own the Supabase account and billing?
