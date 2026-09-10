"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FAQ_ITEMS } from "@/lib/faq";

/**
 * Direct port of the vanilla-JS `renderFAQ()` panel — same search box,
 * same match logic (question text, answer text, or tags), same
 * expand/collapse-per-question behavior. The one difference: the
 * original toggled a CSS class on a DOM node found by index
 * (`toggleFAQ(i)` -> `getElementById('faq-'+i)`); here each item's
 * open/closed state is tracked in a React Set keyed by the item's
 * stable `id`, so a question stays open even if the search box changes
 * which items are visible around it.
 */

export function FAQ() {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q) || q.includes(t))
    );
  }, [query]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card
      title="FAQ & Ask a Question"
      lede="Type a question in your own words, or browse the list below. This searches a curated library of real client questions — it's not a live AI chat, just a well-organized brain to draw from."
    >
      <div className="field">
        <label htmlFor="faq-search">Search the FAQ library</label>
        <input
          id="faq-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: 'do I need to pay quarterly taxes?' or 'what's the difference between a W-2 and 1099?'"
        />
      </div>

      <div className="mt-3">
        {items.length === 0 ? (
          <div className="mentor">
            <div>
              No exact match yet in the FAQ library for that. Add it as a new entry, or bring it to a Power Taxx
              Ltd. advisor directly — every good FAQ library started with someone asking the question first.
            </div>
          </div>
        ) : (
          items.map((item) => {
            const open = openIds.has(item.id);
            return (
              <div key={item.id} style={{ borderBottom: "1px solid var(--line)", padding: "12px 0" }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(item.id);
                    }
                  }}
                  style={{
                    fontWeight: 700,
                    color: "var(--navy)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{item.q}</span>
                  <span>{open ? "−" : "+"}</span>
                </div>
                {open && (
                  <div className="mt-2 text-sm" style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
                    <p>{item.a}</p>
                    <div className="mt-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="mr-1.5 mb-1.5 inline-block"
                          style={{
                            fontSize: 11,
                            background: "var(--line-soft)",
                            color: "var(--ink-soft)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
        {items.length} of {FAQ_ITEMS.length} questions shown. This is a curated library, not a live AI chat — for
        anything specific to your own return, bring it to a Power Taxx Ltd. advisor directly.
      </p>
    </Card>
  );
}
