import Link from "next/link";
import { WelcomeVideoLauncher } from "@/components/features/WelcomeVideo";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <WelcomeVideoLauncher />

      <div className="card">
        <h2 className="text-2xl">Welcome. Let&apos;s build financial wisdom together.</h2>
        <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
          This is Power Taxx Ltd.&apos;s <strong>Wealth Copilot</strong> — built to sit beside you like an assistant
          to your own financial success. Every number you enter stays right here in this app; nothing is sent
          anywhere or connected to a real bank yet.
        </p>
      </div>

      <div className="card">
        <h3 className="text-lg">Ten panels are fully live in this React build</h3>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
          The Tax Estimator now includes an AI Insight panel and a full Term Dictionary alongside the core
          calculator, Business Expenses and Mileage Tracker both push straight into a real Schedule C builder,
          Invoices generates a real printable invoice, and Balance Sheet, Emergency Fund, and Investment Fund round
          out the full financial picture. Every other feature is scaffolded with a real URL and route, ported from
          the original HTML prototype in order — see <code>MIGRATION.md</code> for the plan.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/estimator" className="btn gold">
            🧮 Tax Estimator + AI Insight
          </Link>
          <Link href="/mileage" className="btn gold">
            🚗 Mileage Tracker
          </Link>
          <Link href="/bizexpenses" className="btn gold">
            💼 Business Expenses
          </Link>
          <Link href="/schedulec" className="btn gold">
            🧾 Schedule C
          </Link>
          <Link href="/invoices" className="btn gold">
            🧾 Invoices
          </Link>
          <Link href="/balance" className="btn gold">
            ⚖️ Balance Sheet
          </Link>
          <Link href="/emergency" className="btn gold">
            🛟 Emergency Fund
          </Link>
          <Link href="/investment" className="btn gold">
            💹 Investment Fund
          </Link>
          <Link href="/breakeven" className="btn gold">
            📈 Break-Even &amp; Pricing
          </Link>
          <Link href="/budgeting" className="btn gold">
            💰 Debt Payoff Planner
          </Link>
          <Link href="/settings" className="btn ghost">
            ⚙️ Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
