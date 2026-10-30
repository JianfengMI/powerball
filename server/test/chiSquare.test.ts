import { describe, expect, it } from "vitest";
import { sampleDistinct, type RandomSource } from "@powerball/shared";
import { chiSquareSurvival, chiSquareUniformTest, logGamma, regularizedGammaQ } from "../src/stats/chiSquare";

/** Deterministic 32-bit PRNG (mulberry32) so the simulation test is reproducible. */
function seeded(seed: number): RandomSource {
  let a = seed >>> 0;
  return {
    nextUint32() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    },
  };
}

describe("logGamma", () => {
  it("matches known values", () => {
    expect(logGamma(1)).toBeCloseTo(0, 12);
    expect(logGamma(2)).toBeCloseTo(0, 12);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
    expect(logGamma(34)).toBeCloseTo(Math.log(8.68331761881189e36), 9);
  });
});

describe("regularizedGammaQ", () => {
  it("equals exp(-x) for a = 1", () => {
    for (const x of [0.1, 1, 2.5, 10, 40]) expect(regularizedGammaQ(1, x)).toBeCloseTo(Math.exp(-x), 12);
  });
  it("handles edge cases", () => {
    expect(regularizedGammaQ(3, 0)).toBe(1);
    expect(regularizedGammaQ(3, Infinity)).toBe(0);
    expect(() => regularizedGammaQ(0, 1)).toThrow(RangeError);
  });
});

describe("chiSquareSurvival", () => {
  it("matches closed forms for df = 2 and df = 1", () => {
    // df=2: Q = exp(-x/2). df=1 at x=3.841459: p = 0.05.
    expect(chiSquareSurvival(5, 2)).toBeCloseTo(Math.exp(-2.5), 12);
    expect(chiSquareSurvival(3.841458820694124, 1)).toBeCloseTo(0.05, 9);
  });

  it("matches published critical values", () => {
    // Critical values from standard chi-square tables.
    // df=68: 111.3 is roughly the 0.001 point (p = 0.000725; Wilson-Hilferty approximation agrees to 3 s.f.).
    expect(chiSquareSurvival(111.3, 68)).toBeCloseTo(0.001, 3);
    expect(chiSquareSurvival(111.3, 68)).toBeCloseTo(0.000725, 5);
    expect(chiSquareSurvival(52.62, 25)).toBeCloseTo(0.001, 4);
    expect(chiSquareSurvival(88.25, 68)).toBeCloseTo(0.05, 5);
    expect(chiSquareSurvival(37.652, 25)).toBeCloseTo(0.05, 4);
    expect(chiSquareSurvival(18.307, 10)).toBeCloseTo(0.05, 4);
  });

  it("is about 0.5 near the median and monotone decreasing", () => {
    expect(chiSquareSurvival(67.33, 68)).toBeCloseTo(0.5, 2);
    let prev = 1;
    for (let x = 0; x <= 200; x += 5) {
      const p = chiSquareSurvival(x, 68);
      expect(p).toBeLessThanOrEqual(prev);
      prev = p;
    }
  });
});

describe("chiSquareUniformTest", () => {
  it("gives statistic 0 and p = 1 for perfectly even counts", () => {
    const r = chiSquareUniformTest(new Array(26).fill(10));
    expect(r).toEqual({ statistic: 0, degreesOfFreedom: 25, pValue: 1 });
  });

  it("computes the Pearson statistic", () => {
    // Expected 10 each; (5^2 + 5^2) / 10 = 5, df = 1.
    const r = chiSquareUniformTest([15, 5]);
    expect(r.statistic).toBeCloseTo(5, 12);
    expect(r.pValue).toBeCloseTo(0.025347, 5);
  });

  it("scales the statistic by (N-1)/(N-k) for k numbers per draw", () => {
    const counts = Array.from({ length: 69 }, (_, i) => 100 + (i % 3) - 1);
    const plain = chiSquareUniformTest(counts, 1).statistic;
    expect(chiSquareUniformTest(counts, 5).statistic).toBeCloseTo((plain * 68) / 64, 10);
  });

  it("handles no data", () => {
    expect(chiSquareUniformTest(new Array(69).fill(0), 5)).toEqual({ statistic: 0, degreesOfFreedom: 68, pValue: 1 });
  });

  it("corrected white-ball statistic averages about df = 68 under fair draws", () => {
    const rng = seeded(12345);
    const trials = 300;
    const draws = 1426;
    let sumCorrected = 0;
    let sumPlain = 0;
    for (let t = 0; t < trials; t++) {
      const counts = new Array<number>(69).fill(0);
      for (let d = 0; d < draws; d++) for (const n of sampleDistinct(5, 69, rng)) counts[n - 1]!++;
      sumCorrected += chiSquareUniformTest(counts, 5).statistic;
      sumPlain += chiSquareUniformTest(counts, 1).statistic;
    }
    const meanCorrected = sumCorrected / trials;
    expect(Math.abs(meanCorrected - 68) / 68).toBeLessThan(0.04);
    // Without the correction the mean is about 64, which would make p-values too large.
    expect(Math.abs(sumPlain / trials - 64) / 64).toBeLessThan(0.04);
  });
});
