"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOrgType } from "@/lib/orgType";
import { BrandMark } from "@/components/ui/BrandMark";

type NavItem = { href: string; label: string; nonprofitLabel?: string; emoji: string };
type NavGroup = { label: string; items: NavItem[] };

/**
 * Redesigned nav (see the design-critique conversation this shipped
 * from): the old version rendered all 16 destinations as same-weight
 * pills across four wrapped rows — about 250px tall before any page
 * content appeared, with only a faint background-opacity difference
 * between "active" and everything else. This keeps the exact same
 * destinations and the same five groupings, but collapses them to one
 * row of group names, each opening a small dropdown on click, plus a
 * search box for anyone who already knows what they want and would
 * rather not hunt through a menu.
 */
const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", emoji: "🏠", label: "Home" },
      { href: "/snapshot", emoji: "📊", label: "Snapshot" },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/filing", emoji: "📋", label: "Filing Status Guide" },
      { href: "/faq", emoji: "💬", label: "FAQ" },
      { href: "/quiz", emoji: "🧠", label: "Financial IQ Quiz" },
      { href: "/wills", emoji: "📜", label: "Wills & Estates" },
      { href: "/trusts", emoji: "🏛️", label: "Trusts" },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/budgeting", emoji: "💰", label: "Budgeting" },
      { href: "/emergency", emoji: "🛟", label: "Emergency Fund", nonprofitLabel: "Operating Reserve" },
      { href: "/investment", emoji: "💹", label: "Investment Fund" },
      { href: "/breakeven", emoji: "📈", label: "Break-Even & Pricing" },
    ],
  },
  {
    label: "File",
    items: [
      { href: "/estimator", emoji: "🧮", label: "Tax Estimator" },
      { href: "/mileage", emoji: "🚗", label: "Mileage Tracker" },
      { href: "/bizexpenses", emoji: "💼", label: "Business Expenses" },
      { href: "/schedulec", emoji: "🧾", label: "Schedule C" },
      { href: "/balance", emoji: "⚖️", label: "Balance Sheet", nonprofitLabel: "Statement of Financial Position" },
      { href: "/invoices", emoji: "🧾", label: "Invoices & AR", nonprofitLabel: "Donation Receipts" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", emoji: "⚙️", label: "Settings" }],
  },
];

const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export function TopNav() {
  const pathname = usePathname();
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown or in-progress search whenever the route
  // actually changes (a real navigation), not on every render.
  useEffect(() => {
    setOpenGroup(null);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function labelFor(item: NavItem) {
    return (nonprofit && item.nonprofitLabel) || item.label;
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_ITEMS.filter((item) => labelFor(item).toLowerCase().includes(q)).slice(0, 8);
    // labelFor depends on `nonprofit`, already in scope — re-filtering on
    // query change alone is what actually matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, nonprofit]);

  return (
    // Fixed --brand-surface/--on-brand/--on-gold tokens, not --navy/--gold's
    // theme-flipping ones — see the token comment in app/globals.css (a
    // pre-deploy QA audit caught this header going unreadable in dark mode
    // when it used the flipping tokens instead).
    <header style={{ background: "var(--brand-surface)", borderBottom: "1px solid var(--line)" }}>
      <div ref={rootRef} className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" style={{ textDecoration: "none" }}>
          <BrandMark size={36} />
          <div>
            <div
              className="text-[15px] font-semibold leading-tight"
              style={{ color: "var(--on-brand)", fontFamily: "var(--font-display)" }}
            >
              Power Taxx Ltd.
            </div>
            <div
              className="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "var(--gold)", color: "var(--on-gold)" }}
            >
              Wealth Copilot
            </div>
          </div>
        </Link>

        <div className="relative" style={{ flex: "1 1 160px", maxWidth: "230px" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Jump to a tool…"
            aria-label="Search tools"
            className="w-full rounded-lg px-3 py-2 text-[13px]"
            style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "var(--on-brand)" }}
          />
          {results.length > 0 && (
            <div
              className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg"
              style={{ background: "var(--paper)", border: "1px solid var(--line)", boxShadow: "0 16px 30px -18px rgba(0,0,0,.4)" }}
            >
              {results.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px]"
                  style={{ color: "var(--ink)", textDecoration: "none" }}
                >
                  <span>{item.emoji}</span>
                  {labelFor(item)}
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="ml-auto flex flex-wrap gap-1">
          {NAV.map((group) => {
            const isCurrent = group.items.some((item) => item.href === pathname);
            const isOpen = openGroup === group.label;
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group.label)}
                  className="rounded-lg px-3 py-2 text-[13.5px]"
                  style={{
                    background: isOpen ? "rgba(255,255,255,0.08)" : "transparent",
                    color: isCurrent ? "var(--gold)" : "var(--on-brand)",
                    fontWeight: isCurrent ? 600 : 500,
                    opacity: isCurrent || isOpen ? 1 : 0.85,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {group.label} <span style={{ fontSize: "9px", opacity: 0.7 }}>▾</span>
                </button>
                {isOpen && (
                  <div
                    className="absolute right-0 z-20 mt-1.5 flex min-w-[220px] flex-col gap-0.5 rounded-lg p-1.5"
                    style={{ background: "var(--paper)", border: "1px solid var(--line)", boxShadow: "0 16px 30px -18px rgba(0,0,0,.4)" }}
                  >
                    {group.items.map((item) => {
                      const active = item.href === pathname;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px]"
                          style={{ color: active ? "var(--gold)" : "var(--ink)", fontWeight: active ? 600 : 400, textDecoration: "none" }}
                        >
                          <span>{item.emoji}</span>
                          {labelFor(item)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
