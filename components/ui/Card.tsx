export function Card({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h2 className="text-2xl">{title}</h2>
        {lede && (
          <p className="mt-2 max-w-[62ch] text-[15px]" style={{ color: "var(--ink-soft)" }}>
            {lede}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
