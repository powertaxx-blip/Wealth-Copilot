import Link from "next/link";

/**
 * Placeholder for a panel that still only exists in the original
 * HTML prototype. Keeps the route structure honest about the full
 * scope of the app (all 15 panels get a real URL from day one) without
 * pretending every panel has been ported yet — see MIGRATION.md for
 * the port order.
 */
export function ComingNext({ title, description, oldPanelId }: { title: string; description: string; oldPanelId: string }) {
  return (
    <div className="card flex flex-col gap-3">
      <span
        className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}
      >
        Not yet ported
      </span>
      <h2 className="text-2xl">{title}</h2>
      <p style={{ color: "var(--ink-soft)" }}>{description}</p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        This panel is live and working in the original single-file prototype (
        <code>#panel-{oldPanelId}</code>) and is next in line for the React port — see the migration plan in{" "}
        <code>MIGRATION.md</code>.
      </p>
      <Link href="/" className="w-fit text-sm underline" style={{ color: "var(--navy-2)" }}>
        ← Back to Home
      </Link>
    </div>
  );
}
