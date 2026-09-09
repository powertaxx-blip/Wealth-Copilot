"use client";

import { useMemo, useState } from "react";

/**
 * The Term Dictionary — a plain-English glossary of every technical term
 * that shows up on the Tax Estimator's results panel. The Tip component
 * already answers "what does EITC mean?" one word at a time; this answers
 * a bigger question the app hadn't addressed yet: "why should I care about
 * any of this?" Each entry is deliberately two parts — a definition, and a
 * separate "why it matters" line — because knowing what a term means and
 * knowing why it's worth understanding are two different kinds of
 * knowledge, and the second one is what actually changes a decision.
 */
type Term = { term: string; definition: string; whyItMatters: string };

const TERMS: Term[] = [
  {
    term: "Adjusted Gross Income (AGI)",
    definition: "Your total income minus a few specific adjustments — like half of your self-employment tax.",
    whyItMatters:
      "Almost every deduction and credit on this page is calculated off AGI, not your raw income. Get this number wrong and everything downstream is wrong too.",
  },
  {
    term: "Standard Deduction",
    definition: "A flat amount the IRS lets you subtract before tax is calculated — no receipts required.",
    whyItMatters:
      "You only itemize if your real deductible expenses beat this number. Otherwise, taking the smaller amount on purpose is money left on the table.",
  },
  {
    term: "QBI Deduction",
    definition: "An extra 20% deduction on qualifying self-employment or business profit, on top of everything else.",
    whyItMatters:
      "It's one of the biggest tax breaks available to self-employed people — and one of the easiest to miss if nobody ever told you to look for it.",
  },
  {
    term: "Federal Taxable Income",
    definition: "What's left of your income after deductions — the actual number tax brackets get applied to.",
    whyItMatters:
      "It's never the same as what you earned. That gap is why you don't pay your top bracket's rate on every single dollar you made.",
  },
  {
    term: "Child Tax Credit (CTC)",
    definition: "A credit — not a deduction — of up to $2,200 per qualifying child that comes directly off your tax bill.",
    whyItMatters:
      "A credit is worth more than a deduction of the same size: a deduction shrinks the number tax is calculated on, a credit shrinks the bill itself, dollar for dollar.",
  },
  {
    term: "Self-Employment Tax",
    definition: "The Social Security and Medicare tax self-employed people pay on their own behalf.",
    whyItMatters:
      "First-time freelancers get blindsided by this one — there's no employer quietly covering half of it anymore. It's on you now, both halves.",
  },
  {
    term: "State Income Tax",
    definition:
      "Your selected state's own income tax, calculated automatically from that state's published 2025 rate schedule — flat-rate, bracketed, or $0 depending on the state.",
    whyItMatters:
      "Nine states (Texas, Florida, Washington, and others) charge no wage income tax at all, while a few charge a top rate over 10%. Where you're taxed can matter as much as how much you earn.",
  },
  {
    term: "Local Tax & Flat Fee",
    definition:
      "City or county income tax, plus any small flat local fee — Pennsylvania's Local Services Tax (up to $52/year) is one well-known example, but plenty of other places nationwide have their own version.",
    whyItMatters:
      "Local rates and fees change block by block nationwide — the number isn't the same for your neighbor two towns over. Never assume, always check your own locality.",
  },
  {
    term: "Earned Income Tax Credit (EITC)",
    definition: "A credit for low-to-moderate earners that can lower tax owed or add straight to a refund.",
    whyItMatters:
      "It's one of the most under-claimed credits in the entire tax code — real money that goes unclaimed every year by people who qualify and never realize it.",
  },
  {
    term: "Effective Tax Rate",
    definition: "The actual share of your total income that went to tax, after every credit and deduction is applied.",
    whyItMatters:
      "It's almost always lower than your top bracket — and it's the number that tells the true story of what you paid, not the scary-sounding bracket percentage.",
  },
  {
    term: "Estimated Take-Home",
    definition: "What's left of your total income after every tax on this page is subtracted.",
    whyItMatters: "This is the number that actually runs your household budget — not your gross income before tax.",
  },
  {
    term: "Quarterly Estimated Payments",
    definition: "Four payments spread through the year instead of one lump sum in April, required once you expect to owe $1,000 or more.",
    whyItMatters:
      "Missing these carries its own IRS penalty, separate from whatever tax you owe. It stops being optional the moment you cross that threshold.",
  },
];

export function TermDictionary() {
  const [query, setQuery] = useState("");
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TERMS;
    return TERMS.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="card mt-4" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
      <h3 className="mt-0 text-lg">Term Dictionary</h3>
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        Every technical term on this page, in plain English — and why each one is actually worth understanding, not
        just memorizing.
      </p>

      <input
        type="text"
        placeholder="Search a term (e.g. &quot;EITC&quot;, &quot;deduction&quot;)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-2 w-full"
        style={{
          padding: "10px 12px",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          background: "var(--bg)",
          color: "var(--ink)",
          fontSize: "14px",
        }}
      />

      <div className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No terms match &quot;{query}&quot;.
          </p>
        )}
        {filtered.map((t) => {
          const isOpen = openTerm === t.term;
          return (
            <div key={t.term} style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpenTerm(isOpen ? null : t.term)}
                className="w-full text-left"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background: isOpen ? "var(--line-soft)" : "transparent",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "var(--navy)",
                  cursor: "pointer",
                }}
                aria-expanded={isOpen}
              >
                {t.term}
                <span style={{ color: "var(--gold)", fontSize: "16px", flexShrink: 0 }}>{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="text-sm" style={{ padding: "0 14px 14px", color: "var(--ink-soft)" }}>
                  <p style={{ margin: "0 0 8px" }}>{t.definition}</p>
                  <p style={{ margin: 0 }}>
                    <b style={{ color: "var(--navy-2)" }}>Why it matters:</b> {t.whyItMatters}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
