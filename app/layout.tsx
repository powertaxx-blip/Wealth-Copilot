import type { Metadata } from "next";
import { TopNav } from "@/components/nav/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealth Copilot — Power Taxx Ltd.",
  description:
    "Power Taxx Ltd.'s Wealth Copilot — tax, budgeting, and business planning tools for Pennsylvania / Chester County filers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <TopNav />
        <main className="mx-auto max-w-[1180px] px-6 py-10">{children}</main>
        <footer className="px-6 py-10 text-center text-[12.5px]" style={{ color: "var(--muted)" }}>
          Power Taxx Ltd. — Wealth Copilot. Educational demo, not a substitute for advice from a licensed tax
          professional or CPA.
        </footer>
      </body>
    </html>
  );
}
