import { describe, expect, it } from "vitest";
import {
  POWERBALL_MAX,
  quickPick,
  randomInt,
  sampleDistinct,
  ticketError,
  WHITE_COUNT,
  WHITE_MAX,
  type RandomSource,
} from "../src";

function sequenceSource(values: number[]): RandomSource {
  let i = 0;
  return { nextUint32: () => values[i++ % values.length]! };
}

/** Pearson chi-square statistic for observed counts against a uniform expectation. */
function chiSquare(counts: number[], expected: number): number {
  return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
}

describe("randomInt", () => {
  it("rejects values in the biased tail", () => {
    // For n = 3, 2^32 - 1 falls in the incomplete final block and must be redrawn.
    const rng = sequenceSource([2 ** 32 - 1, 7]);
    expect(randomInt(3, rng)).toBe(7 % 3);
  });

  it("rejects invalid ranges", () => {
    expect(() => randomInt(0)).toThrow(RangeError);
    expect(() => randomInt(1.5)).toThrow(RangeError);
  });
});

describe("sampleDistinct", () => {
  it("returns sorted, distinct numbers in range", () => {
    for (let i = 0; i < 1000; i++) {
      const picks = sampleDistinct(WHITE_COUNT, WHITE_MAX);
      expect(new Set(picks).size).toBe(WHITE_COUNT);
      expect(picks).toEqual([...picks].sort((a, b) => a - b));
      expect(Math.min(...picks)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...picks)).toBeLessThanOrEqual(WHITE_MAX);
    }
  });

  it("can pick every number", () => {
    expect(sampleDistinct(5, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(() => sampleDistinct(6, 5)).toThrow(RangeError);
  });
});

describe("quickPick", () => {
  it("always produces valid tickets", () => {
    for (let i = 0; i < 10_000; i++) {
      expect(ticketError(quickPick())).toBeNull();
    }
  });

  it("is uniform over 1,000,000 draws (chi-square)", () => {
    const draws = 1_000_000;
    const whiteCounts = new Array<number>(WHITE_MAX).fill(0);
    const powerballCounts = new Array<number>(POWERBALL_MAX).fill(0);
    for (let i = 0; i < draws; i++) {
      const { whites, powerball } = quickPick();
      for (const n of whites) whiteCounts[n - 1]!++;
      powerballCounts[powerball - 1]!++;
    }
    // Critical values at p = 0.001, so a fair RNG fails this test about 1 run in 1,000.
    expect(chiSquare(whiteCounts, (draws * WHITE_COUNT) / WHITE_MAX)).toBeLessThan(111.3); // df = 68
    expect(chiSquare(powerballCounts, draws / POWERBALL_MAX)).toBeLessThan(52.6); // df = 25
  });
});
