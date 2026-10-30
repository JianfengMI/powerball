// Relatable comparisons for 1 in 292,201,338 — each one computed exactly, no folklore statistics.
import { TOTAL_COMBINATIONS } from "@powerball/shared";
import { formatInt, formatLarge, SECONDS_PER_YEAR } from "./format";

export interface Comparison {
  title: string;
  detail: string;
}

/** Largest k with base^k <= n. */
function floorLog(n: number, base: number): number {
  let k = 0;
  let v = 1;
  while (v * base <= n) {
    v *= base;
    k++;
  }
  return k;
}

export function jackpotComparisons(total = TOTAL_COMBINATIONS): Comparison[] {
  const years = total / SECONDS_PER_YEAR;
  const dayYears = total / 365.25;
  const flips = floorLog(total, 2);
  const dice = floorLog(total, 6);
  return [
    {
      title: `One specific second in ${years.toFixed(1)} years`,
      detail: `${formatInt(total)} seconds is ${years.toFixed(2)} years. Winning is like someone picking one secret second in that span, and you guessing it.`,
    },
    {
      title: `One specific day in about ${formatLarge(dayYears)} years`,
      detail: `If each ticket were one day, you'd be searching ${formatInt(dayYears)} years of calendar for a single day.`,
    },
    {
      title: `Harder than ${flips} coin flips in a row`,
      detail: `Calling ${flips} fair coin flips correctly in a row is 1 in ${formatInt(2 ** flips)}; ${flips + 1} in a row is 1 in ${formatInt(2 ** (flips + 1))}. The jackpot sits between them.`,
    },
    {
      title: `Harder than rolling ${dice} sixes in a row`,
      detail: `Rolling a six ${dice} times in a row is 1 in ${formatInt(6 ** dice)}; ${dice + 1} times is 1 in ${formatInt(6 ** (dice + 1))}.`,
    },
  ];
}
