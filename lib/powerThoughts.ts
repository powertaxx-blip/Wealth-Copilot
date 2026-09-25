/**
 * Power Thoughts — 40 standalone lines from *Power Thought* by Steven
 * "Sudhaa" Hutchinson (AuthorHouse, 2014), the app author's own book,
 * selected and approved by the author for use here. Wording is the book's own;
 * the only edits are rejoined line-break hyphenation, sentence case for
 * lines the book prints in all caps, a dropped leading "Therefore" (#20),
 * and "themselves" for "himself" (#20) — both approved. Important words
 * are capitalized for emphasis (the author's request, in the spirit of
 * the book's own capitals, e.g. "A Thought is a Seed.").
 *
 * Shown by MentorNote (components/ui/MentorNote.tsx) underneath each
 * panel's own Mentor's Note, one line per note, drawn from a shuffled
 * deck so every line appears once before any line repeats — the app's
 * standing "don't quote the same thing over and over" rule.
 */

export const POWER_THOUGHT_SOURCE = { author: "Steven Hutchinson", title: "Power Thought" };

export const POWER_THOUGHTS: readonly string[] = [
  // Thought and mindset
  "A Thought is a Seed. What r u Planting?",
  "Be aware of what you Think about, because what you Think about is what your Life becomes.",
  "If I want to improve the Quality of my Life, I must improve the Quality of my Thought.",
  "Your Thoughts are the Company your Mind keeps.",
  "Probably you have unconsciously thought your way into your present Circumstances, but in order to Advance, you must Consciously think your way out.",
  "When you Change you, you Change the World.",
  "It is better to be Positive and Challenged than to be Negative and Privileged.",
  "Negativity is always conquered by Proactivity.",
  // Perseverance and potential
  "Determination is the Antidote for Stagnation.",
  "No matter how bad it gets, remember your Potential is yet to be Fulfilled.",
  "97% of your Limitations are Self-Imposed.",
  "There is only one Force in the Universe strong enough to stop You, and that's You.",
  "Never give up on Possibility.",
  "One thing I definitely know about Change is, it won't happen to me if I stay the Same.",
  "Hardship is a Molder of Character.",
  // Winning, losing and failure
  "The Loser is not the one who misses the Mark; the Loser is the one who has no Mark.",
  "Failure is an Experience, not an Existence.",
  "It is more important to Learn from Losing than to Win.",
  "Failure is Fuel for Success.",
  "A person who knows how to Fail without thinking themselves a Failure is the greatest Success.",
  "A Wrong Decision has more Potential than Indecision.",
  // Planning, time and patience
  "Your Past is no indication of your Future unless you make it so.",
  "If you fail to Plan your Future, you will inevitably live in the Graveyard of the Past.",
  "If you want to do something in the Future, do it Now.",
  "51% of Success is just being Present.",
  "First the Vision, then the Provisions.",
  "Patience is a main ingredient in every fertile Plan.",
  "Before rushing to do something, make sure your Priorities are right.",
  "Intentions should dictate Expectations.",
  // Wealth and value
  "My Financial Literacy will eliminate my Poverty.",
  "Time is infinitely more valuable than Money.",
  "Wealth is not something we Attract; it is something we Emanate.",
  "Wealth is created in the Mind, not the Market-place.",
  "It is more important to Appreciate what I have than to Accumulate more.",
  "Be cautious in sacrificing Quality for Quantity.",
  // Growth and self-worth
  "If you neglect the Roots, you cannot have the Fruits.",
  "A person who believes there is no Opportunity will see no Opportunity.",
  "If you don't Matter to yourself, you will not Matter to anyone else.",
  "Success and Discipline are Siamese Twins.",
  "The highest Mountain you will ever climb is Within you.",
];

export const POWER_THOUGHT_DECK_KEY = "wc.powerThoughtDeck";

type Deck = { order: number[]; next: number; last: number | null };

function shuffledOrder(count: number, avoidFirst: number | null): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // A fresh deck never opens with the line that closed the previous one,
  // so the reshuffle can't show the same thought twice in a row.
  if (avoidFirst !== null && order.length > 1 && order[0] === avoidFirst) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

function isValidDeck(d: unknown, count: number): d is Deck {
  if (typeof d !== "object" || d === null) return false;
  const deck = d as Deck;
  return (
    Array.isArray(deck.order) &&
    deck.order.length === count &&
    new Set(deck.order).size === count &&
    deck.order.every((i) => Number.isInteger(i) && i >= 0 && i < count) &&
    Number.isInteger(deck.next) &&
    deck.next >= 0
  );
}

/**
 * Draws the next Power Thought index from a shuffled deck kept in
 * localStorage, reshuffling once all 40 have been shown. Client-only
 * (call it from an event handler or effect, never during render — the
 * server has no localStorage and a render-time random pick would cause a
 * hydration mismatch). If storage is unavailable (private browsing), it
 * falls back to a plain random pick rather than failing.
 */
export function drawPowerThought(): number {
  const count = POWER_THOUGHTS.length;
  try {
    const raw = window.localStorage.getItem(POWER_THOUGHT_DECK_KEY);
    let deck: Deck | null = null;
    if (raw) {
      const parsed = JSON.parse(raw);
      // A deck saved when the list had a different length (lines added or
      // removed later) is discarded rather than trusted.
      if (isValidDeck(parsed, count)) deck = parsed;
    }
    if (!deck || deck.next >= count) {
      deck = { order: shuffledOrder(count, deck?.last ?? null), next: 0, last: deck?.last ?? null };
    }
    const index = deck.order[deck.next];
    window.localStorage.setItem(POWER_THOUGHT_DECK_KEY, JSON.stringify({ ...deck, next: deck.next + 1, last: index }));
    return index;
  } catch {
    return Math.floor(Math.random() * count);
  }
}
