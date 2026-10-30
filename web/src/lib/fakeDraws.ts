// "Spot the real draw": numbers that look random to humans vs. what randomness really does.
import {
  combinations,
  defaultSource,
  POWERBALL_MAX,
  randomInt,
  WHITE_COUNT,
  WHITE_MAX,
  type RandomSource,
  type Ticket,
} from "@powerball/shared";

/** Decade group: 1-9 -> 0, 10-19 -> 1, ... 60-69 -> 6. */
export function decadeOf(n: number): number {
  return Math.floor(n / 10);
}

export interface PatternReport {
  consecutivePairs: [number, number][];
  /** Decades holding two or more of the numbers, e.g. "40s". */
  sharedDecades: string[];
  /** Last digits shared by two or more numbers. */
  sharedLastDigits: number[];
}

function decadeName(d: number): string {
  return d === 0 ? "single digits" : `${d * 10}s`;
}

export function describePattern(whites: readonly number[]): PatternReport {
  const sorted = [...whites].sort((a, b) => a - b);
  const consecutivePairs: [number, number][] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! - sorted[i - 1]! === 1) consecutivePairs.push([sorted[i - 1]!, sorted[i]!]);
  }
  const byDecade = new Map<number, number>();
  const byDigit = new Map<number, number>();
  for (const n of sorted) {
    byDecade.set(decadeOf(n), (byDecade.get(decadeOf(n)) ?? 0) + 1);
    byDigit.set(n % 10, (byDigit.get(n % 10) ?? 0) + 1);
  }
  return {
    consecutivePairs,
    sharedDecades: [...byDecade].filter(([, c]) => c > 1).map(([d]) => decadeName(d)),
    sharedLastDigits: [...byDigit].filter(([, c]) => c > 1).map(([d]) => d),
  };
}

/** Whether a set of whites has the "too even" look people produce when trying to be random. */
export function looksHumanRandom(whites: readonly number[]): boolean {
  const r = describePattern(whites);
  return r.consecutivePairs.length === 0 && r.sharedDecades.length === 0 && r.sharedLastDigits.length === 0;
}

/**
 * A pick in the style people make when asked to "pick random numbers": spread across different
 * decades, no consecutive numbers, no repeated last digits. Uniform over all such picks.
 */
export function humanLikePick(rng: RandomSource = defaultSource): Ticket {
  for (;;) {
    const whites = new Set<number>();
    while (whites.size < WHITE_COUNT) whites.add(randomInt(WHITE_MAX, rng) + 1);
    const sorted = [...whites].sort((a, b) => a - b);
    if (looksHumanRandom(sorted)) {
      return { whites: sorted, powerball: randomInt(POWERBALL_MAX, rng) + 1 };
    }
  }
}

/** Exact probability that a fair draw has at least one pair of consecutive white balls. */
export function probConsecutive(): number {
  // Choosing 5 non-adjacent numbers from 69 is C(65, 5) ways.
  return 1 - combinations(WHITE_MAX - WHITE_COUNT + 1, WHITE_COUNT) / combinations(WHITE_MAX, WHITE_COUNT);
}

/** Exact probability that a fair draw has two or more white balls in the same decade. */
export function probSharedDecade(): number {
  const sizes = [9, 10, 10, 10, 10, 10, 10]; // 1-9, 10-19, ..., 60-69
  // Elementary symmetric polynomial e5(sizes) = ways to pick one number from 5 different decades.
  let e = [1, 0, 0, 0, 0, 0];
  for (const s of sizes) {
    const next = [...e];
    for (let k = 1; k <= 5; k++) next[k] = e[k]! + e[k - 1]! * s;
    e = next;
  }
  return 1 - e[5]! / combinations(WHITE_MAX, WHITE_COUNT);
}

/** Plain-English list of the clumps in a draw, for the reveal. */
export function patternSentence(whites: readonly number[]): string {
  const r = describePattern(whites);
  const parts: string[] = [];
  if (r.consecutivePairs.length) {
    parts.push(`consecutive numbers (${r.consecutivePairs.map(([a, b]) => `${a}-${b}`).join(", ")})`);
  }
  if (r.sharedDecades.length) parts.push(`more than one number in the ${r.sharedDecades.join(" and ")}`);
  if (r.sharedLastDigits.length) {
    parts.push(`repeated last digit${r.sharedLastDigits.length > 1 ? "s" : ""} (${r.sharedLastDigits.join(", ")})`);
  }
  return parts.length ? `Has ${parts.join("; ")}.` : "Perfectly spread out: no clumps at all.";
}
