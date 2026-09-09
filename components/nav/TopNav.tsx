"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

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
export function TopNav() {
  const pathname = usePathname();

  return (
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
                    {item.label}
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
