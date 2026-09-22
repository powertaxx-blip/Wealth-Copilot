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
        {/*
          Applies the saved Appearance choice (Settings → ThemeToggle, which
          stores "wc.theme" in localStorage) BEFORE the page paints. Without
          this, `data-theme` was only ever set by ThemeToggle itself while
          you're on /settings, so it survived clicking around the app but
          was silently wiped on any hard refresh, bookmark, or shared link —
          the page would just fall back to "system"/light. This inline
          script runs synchronously in <head>, so there's no flash of the
          wrong theme either.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('wc.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
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
