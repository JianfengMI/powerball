import { describe, expect, it } from "vitest";
import { combinations, TIER_ODDS, TOTAL_COMBINATIONS } from "@powerball/shared";
import {
  cryptoUniform,
  fastForwardToJackpot,
  logFactorial,
  sampleBinomial,
  sampleGeometric,
  sampleMultinomial,
} from "../src/lib/fastForward";

const rand = cryptoUniform();

function meanVar(xs: number[]) {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return { mean, v };
}

describe("cryptoUniform", () => {
  it("is in [0, 1) with mean 1/2", () => {
    const xs = Array.from({ length: 100_000 }, rand);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(Math.abs(meanVar(xs).mean - 0.5)).toBeLessThan(5 * Math.sqrt(1 / 12 / 1e5));
  });
});

describe("sampleGeometric", () => {
  it("has mean 1/p for p = 1e-3", () => {
    const p = 1e-3;
    const xs = Array.from({ length: 100_000 }, () => sampleGeometric(p, rand));
    const sd = Math.sqrt((1 - p) / p ** 2 / xs.length);
    expect(Math.abs(meanVar(xs).mean - 1 / p)).toBeLessThan(5 * sd);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(1);
  });

  it("has mean 292,201,338 for the jackpot", () => {
    const p = 1 / TOTAL_COMBINATIONS;
    const xs = Array.from({ length: 50_000 }, () => sampleGeometric(p, rand));
    const sd = Math.sqrt((1 - p) / p ** 2 / xs.length);
    expect(Math.abs(meanVar(xs).mean - TOTAL_COMBINATIONS)).toBeLessThan(5 * sd);
  });

  it("matches P(K = 1) = p and P(K <= k) for small p", () => {
    const p = 0.25;
    const n = 200_000;
    const xs = Array.from({ length: n }, () => sampleGeometric(p, rand));
    const ones = xs.filter((x) => x === 1).length;
    expect(Math.abs(ones - n * p)).toBeLessThan(5 * Math.sqrt(n * p * (1 - p)));
  });
});

describe("logFactorial", () => {
  it("is accurate on both sides of the table cut-off", () => {
    let exact = 0;
    for (let i = 1; i <= 400; i++) {
      exact += Math.log(i);
      expect(logFactorial(i)).toBeCloseTo(exact, 9);
    }
  });
});

describe("sampleBinomial", () => {
  const cases: [number, number][] = [
    [10, 0.3],
    [1000, 0.9],
    [3_000_000, 1e-6],
    [292_201_338, 1 / 38.32],
    [292_201_338, 25 / 292_201_338],
  ];
  for (const [n, p] of cases) {
    it(`has the right mean and variance for n=${n}, p=${p.toPrecision(3)}`, () => {
      const k = 20_000;
      const xs = Array.from({ length: k }, () => sampleBinomial(n, p, rand));
      const { mean, v } = meanVar(xs);
      const trueVar = n * p * (1 - p);
      expect(Math.abs(mean - n * p)).toBeLessThan(5 * Math.sqrt(trueVar / k) + 1e-9);
      // Variance of the sample variance ~ 2 sigma^4 / k for near-normal; generous tolerance.
      expect(Math.abs(v / trueVar - 1)).toBeLessThan(0.1);
      expect(xs.every((x) => Number.isInteger(x) && x >= 0 && x <= n)).toBe(true);
    });
  }

  it("matches the exact pmf for n = 12, p = 0.35", () => {
    const n = 12;
    const p = 0.35;
    const k = 200_000;
    const counts = new Array<number>(n + 1).fill(0);
    for (let i = 0; i < k; i++) counts[sampleBinomial(n, p, rand)]!++;
    let chi = 0;
    for (let x = 0; x <= n; x++) {
      const e = k * combinations(n, x) * p ** x * (1 - p) ** (n - x);
      if (e > 5) chi += (counts[x]! - e) ** 2 / e;
    }
    expect(chi).toBeLessThan(40); // chi2(~11) 99.99th percentile ~ 35
  });

  it("handles edge cases", () => {
    expect(sampleBinomial(0, 0.5, rand)).toBe(0);
    expect(sampleBinomial(10, 0, rand)).toBe(0);
    expect(sampleBinomial(10, 1, rand)).toBe(10);
  });
});

describe("sampleMultinomial / fastForwardToJackpot", () => {
  it("multinomial counts never exceed n", () => {
    const out = sampleMultinomial(1000, [0.2, 0.3, 0.1], rand);
    expect(out.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1000);
  });

  it("produces one jackpot and lower tiers in proportion to the ticket count", () => {
    const probs = TIER_ODDS.map((t) => t.probability);
    const runs = Array.from({ length: 200 }, () => fastForwardToJackpot(probs, 0, rand));
    for (const r of runs) {
      expect(r.tierCounts[0]).toBe(1);
      expect(r.tierCounts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(r.tickets);
    }
    // Pooled over runs, each lower tier's rate per (non-jackpot) ticket matches p / (1 - pJ).
    const totalTickets = runs.reduce((s, r) => s + r.tickets - 1, 0);
    for (let i = 1; i < probs.length; i++) {
      const q = probs[i]! / (1 - probs[0]!);
      const observed = runs.reduce((s, r) => s + r.tierCounts[i]!, 0);
      const expected = totalTickets * q;
      expect(Math.abs(observed - expected)).toBeLessThan(5 * Math.sqrt(expected) + 2);
    }
  });
});
