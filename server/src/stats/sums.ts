import { WHITE_COUNT, WHITE_MAX, type DrawRecord, type SumsResponse } from "@powerball/shared";

export interface SumProbability {
  sum: number;
  probability: number;
}

/**
 * Exact distribution of the sum of `count` distinct numbers drawn from 1..max, by dynamic
 * programming over subsets: ways[k][s] = number of k-element subsets with sum s.
 */
export function sumDistribution(count: number = WHITE_COUNT, max: number = WHITE_MAX): SumProbability[] {
  const maxSum = (count * (2 * max - count + 1)) / 2;
  const minSum = (count * (count + 1)) / 2;
  const ways = Array.from({ length: count + 1 }, () => new Array<number>(maxSum + 1).fill(0));
  ways[0]![0] = 1;
  for (let n = 1; n <= max; n++) {
    // Iterate k downwards so each number is used at most once.
    for (let k = Math.min(count, n); k >= 1; k--) {
      const row = ways[k]!;
      const prev = ways[k - 1]!;
      for (let s = maxSum; s >= n; s--) row[s]! += prev[s - n]!;
    }
  }
  const counts = ways[count]!;
  let total = 0;
  for (let s = minSum; s <= maxSum; s++) total += counts[s]!;
  const result: SumProbability[] = [];
  for (let s = minSum; s <= maxSum; s++) result.push({ sum: s, probability: counts[s]! / total });
  return result;
}

const THEORETICAL = sumDistribution();
const THEORETICAL_MEAN = THEORETICAL.reduce((m, p) => m + p.sum * p.probability, 0);

export function computeSums(draws: readonly DrawRecord[]): SumsResponse {
  const bySum = new Map<number, number>();
  let total = 0;
  for (const d of draws) {
    const s = d.whites.reduce((a, b) => a + b, 0);
    total += s;
    bySum.set(s, (bySum.get(s) ?? 0) + 1);
  }
  const observed = [...bySum.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sum, count]) => ({ sum, count }));
  return {
    drawCount: draws.length,
    observed,
    theoretical: THEORETICAL.map((p) => ({ ...p })),
    observedMean: draws.length ? total / draws.length : 0,
    // Exact value is 5 * 35 = 175; round away float noise from the summation.
    theoreticalMean: Math.round(THEORETICAL_MEAN * 1e9) / 1e9,
  };
}
