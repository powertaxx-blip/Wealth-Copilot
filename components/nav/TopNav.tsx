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
