"use client";

import { useMemo, useState } from "react";

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
    term: "PA State Tax & Local EIT",
    definition: "Pennsylvania's flat state rate, plus whatever your specific municipality or school district adds on top.",
    whyItMatters:
      "Local rates change block by block in PA. The number isn't the same for your neighbor two towns over — never assume, always check your own locality.",
  },
  {
    term: "Local Services Tax (LST)",
    definition: "A small flat annual tax — up to $52/year — some PA municipalities charge everyone working there, regardless of income.",
    whyItMatters:
      "It's flat, not a percentage, so it's easy to forget next to the bigger numbers — but it still shows up on what you owe.",
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
