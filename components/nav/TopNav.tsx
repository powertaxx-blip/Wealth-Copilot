"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrgType } from "@/lib/orgType";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

// Same four groupings as the original app's tab bar (Overview / Learn /
// Plan / File) plus a new Account group for Settings, which the old
// single-file build never had — see MIGRATION.md.
const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "🏠 Home" },
      { href: "/snapshot", label: "📊 Snapshot" },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/filing", label: "📋 Filing Status Guide" },
      { href: "/faq", label: "💬 FAQ" },
      { href: "/quiz", label: "🧠 Financial IQ Quiz" },
      { href: "/wills", label: "📜 Wills & Estates" },
      { href: "/trusts", label: "🏛️ Trusts" },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/budgeting", label: "💰 Budgeting" },
      { href: "/emergency", label: "🛟 Emergency Fund" },
      { href: "/investment", label: "💹 Investment Fund" },
      { href: "/breakeven", label: "📈 Break-Even & Pricing" },
    ],
  },
  {
    label: "File",
    items: [
      { href: "/estimator", label: "🧮 Tax Estimator" },
      { href: "/mileage", label: "🚗 Mileage Tracker" },
      { href: "/bizexpenses", label: "💼 Business Expenses" },
      { href: "/schedulec", label: "🧾 Schedule C" },
      { href: "/balance", label: "⚖️ Balance Sheet" },
      { href: "/invoices", label: "🧾 Invoices & AR" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "⚙️ Settings" }],
  },
];

// Nonprofit Mode swaps these tab labels to match what the panels
// themselves are called once toggled — see lib/orgType.ts for why TopNav
// specifically needs the live same-tab update (it mounts once in the
// root layout, not fresh per page like most other panels).
const NONPROFIT_LABEL_OVERRIDES: Record<string, string> = {
  "/balance": "⚖️ Statement of Financial Position",
  "/emergency": "🛟 Operating Reserve",
  "/invoices": "🧾 Donation Receipts",
};

export function TopNav() {
  const pathname = usePathname();
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";

  return (
    // Fixed --brand-surface/--on-brand/--on-gold tokens, not --navy/--gold's
    // theme-flipping ones — the header used to invert to a light background
    // in dark mode while its text stayed hardcoded light, which made the
    // entire nav bar unreadable for every dark-mode visitor. Caught in the
    // pre-deploy QA audit. See the token comment in app/globals.css.
    <header style={{ background: "var(--brand-surface)", borderBottom: "1px solid var(--line)" }}>
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-6 py-4">
        <div
          className="flex h-10 w-10 items-center justify-center text-sm font-semibold"
          style={{ background: "var(--gold)", color: "var(--on-gold)" }}
        >
          PT
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: "var(--on-brand)", fontFamily: "var(--font-display)" }}>
            Power Taxx Ltd.
          </div>
          <div
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "var(--gold)", color: "var(--on-gold)" }}
          >
            Wealth Copilot
          </div>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1180px] flex-wrap gap-x-8 gap-y-3 px-6 pb-4">
        {NAV.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gold)" }}>
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const label = (nonprofit && NONPROFIT_LABEL_OVERRIDES[item.href]) || item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-3 py-1.5 text-[13px] transition-colors"
                    style={{
                      background: active ? "var(--gold)" : "rgba(255,255,255,0.08)",
                      color: active ? "var(--on-gold)" : "var(--on-brand)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </header>
  );
}
