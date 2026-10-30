import { describe, expect, it } from "vitest";
import {
  POWERBALL_MAX,
  quickPick,
  randomInt,
  sampleDistinct,
  ticketError,
  WHITE_COUNT,
  WHITE_MAX,
} from "../src";
import { seededSource, sequenceSource } from "./helpers";

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

  it("supports the full 2^32 range", () => {
    expect(randomInt(2 ** 32, sequenceSource([2 ** 32 - 1]))).toBe(2 ** 32 - 1);
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
    expect(sampleDistinct(0, 5)).toEqual([]);
  });

  it("rejects invalid counts", () => {
    expect(() => sampleDistinct(6, 5)).toThrow(RangeError);
    expect(() => sampleDistinct(-1, 5)).toThrow(RangeError);
    expect(() => sampleDistinct(1.5, 5)).toThrow(RangeError);
  });

  it("makes every subset exactly equally likely", () => {
    // Picking 2 of 4 consumes randomInt(4) then randomInt(3). Feeding every input pair
    // once must produce each of the 6 subsets exactly twice.
    const counts = new Map<string, number>();
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 3; b++) {
        const key = sampleDistinct(2, 4, sequenceSource([a, b])).join(",");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(6);
    expect([...counts.values()].every((c) => c === 2)).toBe(true);
  });
});

describe("quickPick", () => {
  it("always produces valid tickets from the crypto source", () => {
    for (let i = 0; i < 10_000; i++) {
      expect(ticketError(quickPick())).toBeNull();
    }
  });

  it("is uniform over 1,000,000 draws (chi-square, seeded)", () => {
    const rng = seededSource(20151007);
    const draws = 1_000_000;
    const whiteCounts = new Array<number>(WHITE_MAX).fill(0);
    const powerballCounts = new Array<number>(POWERBALL_MAX).fill(0);
    for (let i = 0; i < draws; i++) {
      const { whites, powerball } = quickPick(rng);
      for (const n of whites) whiteCounts[n - 1]!++;
      powerballCounts[powerball - 1]!++;
    }
    // Whites are drawn without replacement, so the raw statistic is scaled by (69-1)/(69-5).
    const whiteStat = (chiSquare(whiteCounts, (draws * WHITE_COUNT) / WHITE_MAX) * (WHITE_MAX - 1)) / (WHITE_MAX - WHITE_COUNT);
    // Critical values at p = 0.001. The seed makes this deterministic.
    expect(whiteStat).toBeLessThan(111.3); // df = 68
    expect(chiSquare(powerballCounts, draws / POWERBALL_MAX)).toBeLessThan(52.6); // df = 25
  }, 30_000); // ~4s normally; the default 5s timeout is too tight on a busy machine
});
