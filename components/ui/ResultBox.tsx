export function ResultBox({
  label,
  big,
  stats,
}: {
  label: string;
  big: string;
  stats?: { v: string; k: string }[];
}) {
  return (
    <div className="result-box">
      <div className="label">{label}</div>
      <div className="big">{big}</div>
      {stats && stats.length > 0 && (
        <div className="stat-strip">
          {stats.map((s) => (
            <div className="stat" key={s.k}>
              <div className="v">{s.v}</div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "good" | "warning" | "critical";
  children: React.ReactNode;
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}
