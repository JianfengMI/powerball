import { describe, expect, it } from "vitest";
import { combinations, type DrawRecord } from "@powerball/shared";
import { computeFrequency } from "../src/stats/frequency";
import { computeGapInfo, computeGaps } from "../src/stats/gaps";
import { sumDistribution } from "@powerball/shared";
import { computeSums } from "../src/stats/sums";
import { PARSED } from "./fixtures";

const draw = (date: string, whites: number[], powerball: number): DrawRecord => ({ date, whites, powerball });

describe("computeFrequency", () => {
  it("counts every number and sets expected counts", () => {
    const f = computeFrequency(PARSED);
    expect(f.drawCount).toBe(5);
    expect(f.whites).toHaveLength(69);
    expect(f.powerballs).toHaveLength(26);
    expect(f.whites.map((w) => w.number)).toEqual(Array.from({ length: 69 }, (_, i) => i + 1));
    expect(f.whites.reduce((s, w) => s + w.count, 0)).toBe(25);
    expect(f.powerballs.reduce((s, p) => s + p.count, 0)).toBe(5);
    expect(f.whites[28]).toEqual({ number: 29, count: 2, expected: 25 / 69 });
    expect(f.whites[11]!.count).toBe(2); // 12
    expect(f.powerballs[0]).toEqual({ number: 1, count: 2, expected: 5 / 26 });
    expect(f.whiteTest.degreesOfFreedom).toBe(68);
    expect(f.powerballTest.degreesOfFreedom).toBe(25);
    expect(f.whiteTest.pValue).toBeGreaterThanOrEqual(0);
    expect(f.whiteTest.pValue).toBeLessThanOrEqual(1);
  });

  it("handles an empty dataset", () => {
    const f = computeFrequency([]);
    expect(f.whiteTest.pValue).toBe(1);
    expect(f.whites[0]!.expected).toBe(0);
  });
});

describe("sumDistribution", () => {
  const dist = sumDistribution();

  it("covers sums 15..335", () => {
    expect(dist[0]!.sum).toBe(15);
    expect(dist.at(-1)!.sum).toBe(335);
    expect(dist).toHaveLength(321);
  });

  it("probabilities sum to 1 and the mean is 175", () => {
    expect(dist.reduce((s, p) => s + p.probability, 0)).toBeCloseTo(1, 12);
    expect(dist.reduce((s, p) => s + p.sum * p.probability, 0)).toBeCloseTo(175, 9);
  });

  it("is symmetric about 175", () => {
    for (const p of dist) {
      const mirror = dist.find((q) => q.sum === 350 - p.sum)!;
      expect(p.probability).toBeCloseTo(mirror.probability, 15);
    }
  });

  it("has exact extreme probabilities", () => {
    const total = combinations(69, 5);
    expect(dist[0]!.probability).toBe(1 / total); // only {1,2,3,4,5}
    expect(dist[1]!.probability).toBe(1 / total); // only {1,2,3,4,6}
    expect(dist[2]!.probability).toBe(2 / total); // {1,2,3,4,7}, {1,2,3,5,6}
  });

  it("matches brute force on a small case", () => {
    // 3 distinct numbers from 1..6: sums 6..15.
    const counts = new Map<number, number>();
    for (let a = 1; a <= 6; a++)
      for (let b = a + 1; b <= 6; b++)
        for (let c = b + 1; c <= 6; c++) counts.set(a + b + c, (counts.get(a + b + c) ?? 0) + 1);
    for (const p of sumDistribution(3, 6)) expect(p.probability).toBeCloseTo((counts.get(p.sum) ?? 0) / 20, 15);
  });
});

describe("computeSums", () => {
  it("tallies observed sums", () => {
    const s = computeSums(PARSED);
    // Sums: 188, 179, 135, 119, 79.
    expect(s.observed).toEqual([
      { sum: 79, count: 1 },
      { sum: 119, count: 1 },
      { sum: 135, count: 1 },
      { sum: 179, count: 1 },
      { sum: 188, count: 1 },
    ]);
    expect(s.observedMean).toBeCloseTo((188 + 179 + 135 + 119 + 79) / 5, 12);
    expect(s.theoreticalMean).toBe(175);
    expect(s.drawCount).toBe(5);
  });

  it("groups repeated sums and handles no draws", () => {
    const s = computeSums([draw("2020-01-01", [1, 2, 3, 4, 5], 1), draw("2020-01-02", [1, 2, 3, 4, 5], 2)]);
    expect(s.observed).toEqual([{ sum: 15, count: 2 }]);
    expect(computeSums([]).observedMean).toBe(0);
  });
});

describe("gaps", () => {
  // Track Powerball only, max 3, for readable cases. Draw indices 0..5.
  const pbs = [1, 2, 1, 1, 2, 2];
  const draws = pbs.map((pb, i) => draw(`2020-01-0${i + 1}`, [1, 2, 3, 4, 5], pb));
  const info = computeGapInfo(draws, 3, (d) => [d.powerball]);

  it("reports draws since last appearance and last date", () => {
    expect(info[0]).toMatchObject({ number: 1, drawsSinceLast: 2, lastSeen: "2020-01-04" });
    expect(info[1]).toMatchObject({ number: 2, drawsSinceLast: 0, lastSeen: "2020-01-06" });
  });

  it("longest gap includes interior, leading, and trailing runs", () => {
    expect(info[0]!.longestGap).toBe(2); // trailing run after index 3
    expect(info[1]!.longestGap).toBe(2); // between index 1 and 4
    const lead = computeGapInfo([draw("a", [1, 2, 3, 4, 5], 3), draw("b", [1, 2, 3, 4, 5], 3), draw("c", [1, 2, 3, 4, 5], 1)], 3, (d) => [d.powerball]);
    expect(lead[0]).toMatchObject({ drawsSinceLast: 0, longestGap: 2 }); // leading run of 2
  });

  it("never-seen numbers are null with longestGap = drawCount", () => {
    expect(info[2]).toEqual({ number: 3, drawsSinceLast: null, lastSeen: null, longestGap: 6 });
  });

  it("handles an empty dataset", () => {
    const g = computeGaps([]);
    expect(g.whites).toHaveLength(69);
    expect(g.powerballs).toHaveLength(26);
    expect(g.whites[0]).toEqual({ number: 1, drawsSinceLast: null, lastSeen: null, longestGap: 0 });
  });

  it("computeGaps uses whites and powerballs separately", () => {
    const g = computeGaps(PARSED);
    expect(g.drawCount).toBe(5);
    expect(g.whites[0]).toMatchObject({ number: 1, drawsSinceLast: 0, lastSeen: "2015-10-21", longestGap: 4 });
    expect(g.whites[11]).toMatchObject({ number: 12, drawsSinceLast: 1, lastSeen: "2015-10-17", longestGap: 1 });
    expect(g.powerballs[0]).toMatchObject({ number: 1, drawsSinceLast: 2, lastSeen: "2015-10-14", longestGap: 2 });
  });
});
