/**
 * Financial IQ Quiz — new build, not a port. The original single-file
 * prototype never had a working quiz panel (see MIGRATION.md's port
 * order — it was left for last, as mostly-static content). Rather than
 * invent generic trivia, every question here maps directly onto a
 * calculator or concept that already lives somewhere else in this app
 * (Mileage Tracker's rates, Budgeting's guideline split, the S-Corp
 * calculator, the UBIT calculator, etc.) — the quiz is meant to check
 * whether a fact from another panel actually stuck, not to introduce
 * brand-new material cold.
 *
 * Nonprofit Mode gets its own 12-question set instead of relabeling the
 * standard one, the same way Budgeting and Filing Status Guide got their
 * own nonprofit content rather than a reskinned version of the
 * for-profit material — a 501(c)(3)'s fundamentals (UBIT, Form 990,
 * donor restrictions) aren't a relabeling of an individual's fundamentals
 * (marginal tax rates, SE tax, diversification), they're a different
 * body of knowledge entirely.
 */

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const STANDARD_QUESTIONS: QuizQuestion[] = [
  {
    question: "About how many months of expenses does this app's Emergency Fund calculator recommend keeping on hand?",
    options: ["About 1 month", "About 3–6 months", "A full 12 months", "None — invest all of it instead"],
    correctIndex: 1,
    explanation:
      "3–6 months of essential expenses is the standard cushion — enough to survive a lost job or a slow season without going into debt, but not so much that the money sits idle instead of working for you.",
  },
  {
    question: "What is the self-employment (SE) tax rate on net self-employment income?",
    options: ["7.65%", "15.3%", "21%", "37%"],
    correctIndex: 1,
    explanation:
      "15.3% — it's the employee half (7.65%) and the employer half (7.65%) of Social Security and Medicare combined, because a self-employed person is standing in for both sides of that equation.",
  },
  {
    question: "If your top tax bracket is 22%, does the IRS take 22% of your entire income?",
    options: [
      "Yes, all of it is taxed at 22%",
      "No — only the slice of income that falls inside that bracket is taxed at 22%",
      "No — only your very first dollar earned",
      "It depends only on which state you live in",
    ],
    correctIndex: 1,
    explanation:
      "Tax brackets are marginal, not flat. Each slice of income is taxed at its own bracket's rate on the way up, so your effective (overall) rate always lands lower than your top marginal bracket.",
  },
  {
    question: "What's the IRS standard business mileage rate this app's Mileage Tracker uses for 2025?",
    options: ["14¢/mile", "58.5¢/mile", "70¢/mile", "$1.00/mile"],
    correctIndex: 2,
    explanation:
      "70¢/mile for 2025. Unlike the 14¢/mile charitable rate (fixed by statute since 1998), the business rate is set by the IRS and adjusts periodically for fuel and vehicle costs.",
  },
  {
    question: "A worker who receives a 1099-NEC instead of a W-2 is generally classified as:",
    options: ["An employee", "An independent contractor", "A volunteer", "A shareholder"],
    correctIndex: 1,
    explanation:
      "A 1099-NEC reports nonemployee compensation — the hallmark of an independent contractor, who pays their own SE tax instead of having FICA withheld the way a W-2 employee does.",
  },
  {
    question: "The Earned Income Tax Credit (EITC) is best described as:",
    options: [
      "A deduction that lowers taxable income",
      "A refundable credit that can boost a refund for qualifying lower-income workers",
      "A credit only businesses can claim",
      "A penalty applied to high earners",
    ],
    correctIndex: 1,
    explanation:
      "The EITC is refundable — meaning it can increase a refund beyond what was withheld, not just zero out a tax bill — targeted at working people with lower to moderate income.",
  },
  {
    question: "In the Break-Even Calculator, what does \"contribution margin\" mean?",
    options: [
      "Selling price minus fixed costs",
      "Selling price minus variable cost per unit",
      "Total revenue for the month",
      "Your overall profit margin percentage",
    ],
    correctIndex: 1,
    explanation:
      "Contribution margin is price minus variable cost per unit — what's left from each sale to \"contribute\" toward covering fixed costs first, and profit after that.",
  },
  {
    question: "The \"avalanche\" method in the Debt Payoff Planner tackles which debt first?",
    options: [
      "The smallest balance, for a quick motivational win",
      "The highest interest rate, to minimize total interest paid",
      "Whichever debt is newest",
      "The largest balance, regardless of rate",
    ],
    correctIndex: 1,
    explanation:
      "Avalanche pays the highest-interest-rate debt first — mathematically optimal. (The \"snowball\" method targets the smallest balance first instead, trading a little extra interest for faster motivational wins.)",
  },
  {
    question: "Why must an S-Corp owner pay themselves a \"reasonable salary\" before taking distributions?",
    options: [
      "Distributions are illegal for S-Corps",
      "Only salary is subject to payroll (FICA) tax, and shifting everything to distributions to dodge that is exactly what the IRS watches for",
      "The IRS requires 100% of profit to be salary",
      "It's optional — just a polite suggestion",
    ],
    correctIndex: 1,
    explanation:
      "Distributions skip FICA tax entirely. An unreasonably low salary paired with large distributions is a well-known audit flag — the \"reasonable\" requirement exists specifically to close that gap.",
  },
  {
    question: "In the 50/30/20 budgeting guideline, what does the \"20\" stand for?",
    options: ["Wants", "Needs", "Savings & extra debt paydown", "Taxes"],
    correctIndex: 2,
    explanation:
      "50% needs, 30% wants, 20% savings and extra debt paydown — the 20 is what builds your future instead of covering your present.",
  },
  {
    question: "\"Don't put all your eggs in one basket\" is the core idea behind which investing principle?",
    options: ["Timing the market", "Diversification", "Day trading", "Leverage"],
    correctIndex: 1,
    explanation:
      "Diversification spreads risk across different assets so one bad basket doesn't take down the whole plan.",
  },
  {
    question: "Taking the standard deduction instead of itemizing generally makes sense when:",
    options: [
      "Your itemizable expenses add up to less than the standard deduction",
      "You own any business at all",
      "You have a mortgage, no matter the amount",
      "You want to lower your audit risk specifically",
    ],
    correctIndex: 0,
    explanation:
      "The math is simple: whichever number is bigger — your itemized total or the standard deduction — is the one that lowers your taxable income more.",
  },
];

export const NONPROFIT_QUESTIONS: QuizQuestion[] = [
  {
    question:
      "What's the fixed charitable/volunteer mileage rate — set by law since 1998 — used in this app's Mileage Tracker for Volunteer Driving?",
    options: ["70¢/mile", "58.5¢/mile", "14¢/mile", "21¢/mile"],
    correctIndex: 2,
    explanation:
      "14¢/mile, fixed by statute (IRC §170(i)) since 1998 — unlike the business rate, it doesn't adjust for fuel or vehicle costs, so it stays flat year after year no matter how prices move.",
  },
  {
    question: "A nonprofit must file Form 990-T once its gross unrelated business income reaches:",
    options: ["$100", "$1,000", "$10,000", "$50,000"],
    correctIndex: 1,
    explanation:
      "$1,000 gross triggers the filing requirement — even if, after the $1,000 specific deduction and expenses, the actual tax owed comes out to $0.",
  },
  {
    question: "Which nonprofits are eligible to file the simplest \"990-N e-Postcard\"?",
    options: [
      "Any 501(c)(3), regardless of size",
      "Only those with gross receipts of $50,000 or less",
      "Only private foundations",
      "Only nonprofits with zero employees",
    ],
    correctIndex: 1,
    explanation:
      "Gross receipts of $50,000 or less qualifies for the 990-N. Above that, it's a 990-EZ or a full 990 depending on receipts and assets — and a private foundation files a 990-PF regardless of size.",
  },
  {
    question:
      "A nonprofit that fails to file any version of Form 990 for how many consecutive years automatically loses its tax-exempt status?",
    options: ["1 year", "2 years", "3 years", "5 years"],
    correctIndex: 2,
    explanation:
      "Three consecutive years of non-filing triggers automatic revocation — no warning letter required by that point, which is why so many small orgs lose their exemption without realizing it happened.",
  },
  {
    question:
      "In this app's nonprofit Budgeting guideline (a 65/20/15 split), what does the \"65\" represent?",
    options: ["Management & general", "Fundraising", "Program services", "Executive salaries"],
    correctIndex: 2,
    explanation:
      "Program services — the direct mission work. A funder or watchdog group looking at a nonprofit's functional expenses wants to see the bulk of spending land here, not in overhead.",
  },
  {
    question:
      "On a nonprofit's Statement of Financial Position, \"net assets with donor restrictions\" means:",
    options: [
      "Money the board can spend on anything, freely",
      "Funds a donor has legally limited to a specific purpose or time period",
      "Money the organization currently owes to vendors",
      "The organization's total revenue for the year",
    ],
    correctIndex: 1,
    explanation:
      "A restriction is the donor's condition, not the board's preference — spending that money outside the donor's stated purpose is a real legal problem, not just a policy one.",
  },
  {
    question:
      "For a single donation of $250 or more, what must a charity's written acknowledgment state (per this app's Donation Receipts panel)?",
    options: [
      "Nothing — a verbal thank-you is legally sufficient",
      "Whether any goods or services were provided in exchange, and their estimated value",
      "The donor's Social Security number",
      "The organization's total annual budget",
    ],
    correctIndex: 1,
    explanation:
      "The receipt has to disclose any goods or services given in exchange (a gala dinner, a tote bag) and their fair market value — only the amount above that value is actually tax-deductible to the donor.",
  },
  {
    question:
      "What's a key difference between a 501(c)(3) public charity and a 501(c)(4) social welfare organization?",
    options: [
      "501(c)(4) donations are tax-deductible; 501(c)(3) donations are not",
      "501(c)(3) donations are generally tax-deductible; a 501(c)(4) can lobby more freely, but its donations are not deductible",
      "They are legally identical in every respect",
      "A 501(c)(4) cannot legally accept any donations",
    ],
    correctIndex: 1,
    explanation:
      "It's a trade-off: 501(c)(3) status gets deductible donations but tight limits on lobbying; 501(c)(4) status trades away donation deductibility for much more room to lobby and engage in advocacy.",
  },
  {
    question:
      "A private foundation is generally required to distribute what share of its assets for charitable purposes each year?",
    options: ["1%", "5%", "15%", "50%"],
    correctIndex: 1,
    explanation:
      "5% minimum annual payout — a rule that exists specifically so a foundation can't just sit on its endowment indefinitely while doing little to no actual charitable work.",
  },
  {
    question: "A nonprofit board member's \"duty of care\" means:",
    options: [
      "Personally guaranteeing the organization's debts",
      "Exercising the same care an ordinarily prudent person would in a similar position",
      "Simply showing up to meetings",
      "Donating a minimum dollar amount every year",
    ],
    correctIndex: 1,
    explanation:
      "Duty of care is a standard of attention and diligence — read the financials, ask questions, show up informed — not a financial guarantee or a minimum-donation requirement.",
  },
  {
    question:
      "This app's Operating Reserve calculator mirrors the personal Emergency Fund idea, sized around:",
    options: [
      "About 1 week of operating expenses",
      "About 3–6 months of operating expenses",
      "10 years of operating expenses",
      "Exactly last year's total revenue",
    ],
    correctIndex: 1,
    explanation:
      "Same underlying idea as a personal emergency fund, just scaled to an organization: 3–6 months of operating expenses is enough runway to survive a funding gap without shutting down programs.",
  },
  {
    question:
      "Paying a nonprofit executive an \"excess benefit\" — unreasonably high pay relative to comparable organizations — can trigger:",
    options: [
      "A small administrative parking fine",
      "IRS intermediate sanctions — excise taxes on the individual who received it",
      "Automatic loss of exemption, effective immediately",
      "Nothing — nonprofits can pay any amount they choose",
    ],
    correctIndex: 1,
    explanation:
      "Intermediate sanctions hit the individual (and sometimes board members who approved it) with excise taxes — a targeted penalty that exists as a real deterrent short of the \"nuclear option\" of revoking the org's exemption.",
  },
];

export type QuizProgress = {
  answers: (number | null)[];
};

export function blankProgress(count: number): QuizProgress {
  return { answers: Array(count).fill(null) };
}

export type QuizScore = {
  correct: number;
  answered: number;
  total: number;
  complete: boolean;
};

export function calcQuizScore(questions: QuizQuestion[], progress: QuizProgress): QuizScore {
  let correct = 0;
  let answered = 0;
  questions.forEach((q, i) => {
    const a = progress.answers[i];
    if (a !== null && a !== undefined) {
      answered++;
      if (a === q.correctIndex) correct++;
    }
  });
  return { correct, answered, total: questions.length, complete: answered === questions.length };
}
