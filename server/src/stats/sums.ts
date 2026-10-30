import { sumDistribution, type DrawRecord, type SumsResponse } from "@powerball/shared";

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
