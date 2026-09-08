"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-16">
      <div className="card flex flex-col gap-3">
        <span
          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--status-critical-bg)", color: "var(--status-critical)" }}
        >
          Something went wrong
        </span>
        <h2 className="text-2xl">This page hit an unexpected error.</h2>
        <p style={{ color: "var(--ink-soft)" }}>
          Nothing you entered was lost — your saved numbers stay in this browser either way. Try again, or head back
          to the homepage.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="btn gold">
            Try again
          </button>
          <a href="/" className="btn ghost">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
