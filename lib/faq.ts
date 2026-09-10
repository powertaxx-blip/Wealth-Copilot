/**
 * Direct port of the vanilla-JS `FAQ_ITEMS` array — same 15 entries,
 * same tags, same question/answer text, unchanged. Only addition is a
 * stable `id` per item (the prototype used the array index, which is
 * fine for a static `<script>` array but breaks as a React `key` once
 * the list gets filtered by a search box — the id keeps each item's
 * open/closed state attached to the right question even while the
 * visible list is being filtered).
 */

export type FaqItem = {
  id: string;
  tags: string[];
  q: string;
  a: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "filing-status",
    tags: ["filing status", "single", "married"],
    q: "What's the difference between filing statuses, and can I choose any one I want?",
    a: "No — your filing status is determined by your actual situation on December 31 of the tax year, not by preference. Married couples can choose MFJ or MFS, but a single person can't file as Head of Household without a qualifying dependent and paying more than half the household costs. Picking the wrong one is a common audit trigger, so when in doubt, check the Filing Status Guide tab or ask your preparer directly.",
  },
  {
    id: "w2-vs-1099",
    tags: ["w-2", "1099", "employee", "contractor"],
    q: "What's the difference between a W-2 and a 1099?",
    a: "A W-2 means you're an employee — your employer withholds taxes from every paycheck and pays half your Social Security/Medicare tax. A 1099 (usually 1099-NEC) means you're an independent contractor — no taxes are withheld, and you're responsible for the full 15.3% self-employment tax yourself, usually via quarterly estimated payments.",
  },
  {
    id: "quarterly-estimated",
    tags: ["quarterly", "estimated taxes", "self-employed"],
    q: "Do I need to pay quarterly estimated taxes?",
    a: "If you expect to owe $1,000 or more when you file, and you're not having enough withheld (common for self-employed people and business owners), yes. The IRS wants payments spread through the year — due mid-April, mid-June, mid-September, and mid-January. Skipping them can mean an underpayment penalty even if you pay in full by the deadline.",
  },
  {
    id: "schedule-c",
    tags: ["schedule c", "sole proprietor", "business"],
    q: "What is a Schedule C and who has to file one?",
    a: "Schedule C reports profit or loss from a business you run as a sole proprietor or single-member LLC. If you had business income last year — freelance work, a side hustle, a shop — you likely need one. It flows into your personal Form 1040, and the net profit is also subject to self-employment tax via Schedule SE.",
  },
  {
    id: "se-tax",
    tags: ["self-employment tax", "se tax"],
    q: "Why is self-employment tax so much higher than what my employed friend pays?",
    a: "Because when you're employed, your employer quietly pays half of your Social Security and Medicare tax (7.65%) and you pay the other half. When you're self-employed, there's no employer to split it with — you pay both halves, 15.3% total. The upside: you get to deduct half of that SE tax from your taxable income.",
  },
  {
    id: "standard-vs-itemize",
    tags: ["standard deduction", "itemize"],
    q: "Should I take the standard deduction or itemize?",
    a: "Take whichever number is bigger. For 2025 the standard deduction is $15,750 (single) or $31,500 (married filing jointly). If your mortgage interest, state/local taxes (up to the cap), charitable gifts, and medical expenses over the threshold add up to more than that, itemize instead. Most people are better off with the standard deduction — that's exactly why it exists.",
  },
  {
    id: "ein",
    tags: ["ein", "tax id", "business"],
    q: "Do I need an EIN for my small business?",
    a: "If you're a sole proprietor with no employees, you can often use your Social Security number instead. But you'll need an EIN (Employer Identification Number) if you hire employees, operate as a partnership/corporation, or simply want to keep your SSN off business paperwork — which many owners prefer anyway. It's free and takes minutes on IRS.gov.",
  },
  {
    id: "mileage",
    tags: ["mileage", "vehicle", "deduction"],
    q: "How do I deduct my vehicle for business use?",
    a: "Two ways: the standard mileage rate (70 cents per business mile for 2025) or the actual expense method (a percentage of gas, insurance, repairs, and depreciation based on business-use %). The standard mileage rate is simpler and requires a mileage log — date, destination, business purpose, and miles driven for each trip.",
  },
  {
    id: "emergency-fund",
    tags: ["emergency fund", "savings"],
    q: "How much should I keep in an emergency fund?",
    a: "The general rule of thumb is 3 to 6 months of essential living expenses — rent/mortgage, utilities, food, insurance, minimum debt payments. Business owners with less predictable income often lean toward 6 months or more. It's not a savings goal for fun purchases — it's the wall between you and a credit card emergency.",
  },
  {
    id: "balance-sheet",
    tags: ["balance sheet", "assets", "liabilities"],
    q: "Why does my balance sheet matter if I already have a profit & loss statement?",
    a: "A profit & loss statement shows how you did over a period of time (a month, a year). A balance sheet shows where you stand at one exact moment — what you own, what you owe, and what's actually yours (equity). Lenders and investors almost always ask for both, because profit on paper doesn't mean cash in the bank.",
  },
  {
    id: "s-corp-vs-c-corp",
    tags: ["corporation", "c-corp", "s-corp"],
    q: "Should my business be an S-corp or a C-corp?",
    a: "C-corps pay their own 21% flat tax, and then owners are taxed again on dividends — double taxation, but useful for businesses raising outside investment. S-corps avoid that double tax (income passes through to your personal return) but come with payroll requirements and ownership restrictions (100 shareholders max, US individuals only). Most small service businesses lean S-corp once profits are consistent; talk it through with a professional before electing.",
  },
  {
    id: "extension",
    tags: ["extension", "deadline"],
    q: "What happens if I can't file by the deadline?",
    a: "File Form 4868 for an automatic 6-month extension to file — but that's an extension to file, not an extension to pay. If you owe money, estimate it and pay by the original deadline anyway, or penalties and interest start accruing on the unpaid balance immediately.",
  },
  {
    id: "refund-vs-owe",
    tags: ["refund", "withholding"],
    q: "Why did I owe money this year when I usually get a refund?",
    a: "Usually one of a few things: a side income or 1099 job with no withholding, a life change (marriage, new dependent, lost a deduction), or your W-4 withholding was set too low. A big refund isn't necessarily good news either — it usually means you gave the government an interest-free loan all year instead of keeping that money working for you.",
  },
  {
    id: "record-keeping",
    tags: ["record keeping", "receipts", "audit"],
    q: "How long should I keep my tax records?",
    a: "Generally 3 years from the filing date, which is how long the IRS typically has to audit a return. Keep records for 6 years if you underreported income by more than 25%, and keep them indefinitely if you didn't file a return at all or filed a fraudulent one. When in doubt, keep it — digital storage is cheap, an audit without proof is expensive.",
  },
  {
    id: "chester-county-local-tax",
    tags: ["chester", "pennsylvania", "local tax"],
    q: "What local taxes apply if I live or work in Chester County, PA?",
    a: "On top of the PA flat state income tax (3.07%), most Chester County municipalities levy a local Earned Income Tax (EIT), commonly 1% total split between the municipality and school district — though it varies by exact township or borough (West Chester Borough, for example, runs 1.25%). Many municipalities also charge a small flat Local Services Tax, typically $52/year, if your earned income tops $12,000.",
  },
];
