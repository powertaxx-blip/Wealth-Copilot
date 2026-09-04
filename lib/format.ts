/**
 * fmt() — same currency formatter used everywhere in the original
 * HTML prototype, ported unchanged so every dollar figure across
 * the app is formatted identically.
 */
export function fmt(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
