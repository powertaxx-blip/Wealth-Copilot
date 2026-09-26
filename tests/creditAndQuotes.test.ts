import { describe, it, expect, beforeEach } from "vitest";
import { PERSONAL_SCALE as P, BUSINESS_SCALE as B, scoreBand, summarize, validateEntry, validEntries, sortEntries } from "@/lib/creditHealth";
import { POWER_THOUGHTS, drawPowerThought, POWER_THOUGHT_DECK_KEY } from "@/lib/powerThoughts";

const e = (id: string, date: string, score: number, bureau = "", createdAt = 0) => ({ id, date, score, bureau, createdAt });

describe("Credit Health", () => {
  it("bands personal scores at every edge", () => {
    const cases: [number, string][] = [
      [579, "Poor"], [580, "Fair"], [669, "Fair"], [670, "Good"],
      [739, "Good"], [740, "Very Good"], [799, "Very Good"], [800, "Exceptional"],
    ];
    for (const [s, label] of cases) expect(scoreBand(P, s).label, String(s)).toBe(label);
  });

  it("bands business (PAYDEX) scores at every edge", () => {
    const cases: [number, string][] = [[24, "Poor"], [25, "Fair"], [49, "Fair"], [50, "Good"], [79, "Good"], [80, "Excellent"]];
    for (const [s, label] of cases) expect(scoreBand(B, s).label, String(s)).toBe(label);
  });

  it("validates date and range", () => {
    const t = "2026-09-25";
    expect(validateEntry(P, "2026-09-01", 720, t).ok).toBe(true);
    expect(validateEntry(P, "", 720, t).ok).toBe(false);
    expect(validateEntry(P, "2026-09-26", 720, t).ok).toBe(false); // future
    expect(validateEntry(P, t, 299, t).ok).toBe(false);
    expect(validateEntry(P, t, 700.5, t).ok).toBe(false);
    expect(validateEntry(B, t, 0, t).ok).toBe(true);
    expect(validateEntry(B, t, 101, t).ok).toBe(false);
  });

  it("reports the change since the previous entry by date, not by entry order", () => {
    const s = summarize(P, [e("a", "2026-03-01", 680, "experian"), e("b", "2026-09-01", 712, "experian"), e("c", "2026-06-01", 700, "experian")]);
    expect(s.status).toBe("ok");
    if (s.status === "ok") {
      expect(s.latest.score).toBe(712);
      expect(s.change?.points).toBe(12);
      expect(s.change?.sameBureau).toBe(true);
    }
  });

  it("flags a change between different bureaus", () => {
    const s = summarize(P, [e("x", "2026-01-01", 760, "equifax"), e("y", "2026-02-01", 745, "transunion")]);
    expect(s.status === "ok" && s.change?.sameBureau).toBe(false);
  });

  it("orders same-day entries by when they were logged", () => {
    expect(sortEntries([e("p", "2026-05-01", 1, "", 10), e("q", "2026-05-01", 2, "", 20)]).map((x) => x.id)).toEqual(["q", "p"]);
  });

  it("skips malformed saved entries", () => {
    expect(validEntries([e("ok", "2026-01-01", 700), { id: "bad" }, null, "x", { ...e("n", "2026-01-01", 700), score: NaN }])).toHaveLength(1);
    expect(validEntries({ not: "an array" })).toEqual([]);
  });
});

describe("Power Thought deck", () => {
  const store = new Map<string, string>();
  const g = globalThis as { window?: unknown };

  beforeEach(() => {
    store.clear();
    g.window = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
  });

  it("has 40 distinct lines", () => {
    expect(POWER_THOUGHTS).toHaveLength(40);
    expect(new Set(POWER_THOUGHTS).size).toBe(40);
  });

  it("shows every line once before any repeats, and never the same line twice in a row", () => {
    let prev = -1;
    for (let round = 0; round < 50; round++) {
      const seen = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const n = drawPowerThought();
        expect(n).not.toBe(prev);
        prev = n;
        seen.add(n);
      }
      expect(seen.size).toBe(40);
    }
  });

  it("recovers from corrupt or stale saved decks", () => {
    store.set(POWER_THOUGHT_DECK_KEY, "{not json");
    expect(drawPowerThought()).toBeGreaterThanOrEqual(0);
    store.set(POWER_THOUGHT_DECK_KEY, JSON.stringify({ order: [0, 1, 2], next: 0, last: null }));
    drawPowerThought();
    expect(JSON.parse(store.get(POWER_THOUGHT_DECK_KEY)!).order).toHaveLength(40);
  });

  it("falls back to a random line when storage is blocked", () => {
    g.window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {},
      },
    };
    const n = drawPowerThought();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(40);
  });
});
