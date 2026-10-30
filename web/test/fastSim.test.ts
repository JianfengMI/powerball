import { describe, expect, it } from "vitest";
import { PRIZE_TIERS, TIER_ODDS } from "@powerball/shared";
import { FastSimulator } from "../src/lib/fastSim";

describe("FastSimulator", () => {
  it("matches every tier's probability over 5 million draws", () => {
    const sim = new FastSimulator({ whites: [3, 14, 27, 41, 59], powerball: 7 }, PRIZE_TIERS);
    const n = 5_000_000;
    sim.run(n, false);
    expect(sim.tickets).toBe(n);
    TIER_ODDS.forEach((t, i) => {
      const expected = n * t.probability;
      const sd = Math.sqrt(n * t.probability * (1 - t.probability));
      // 5 standard deviations (plus 1 count of slack for the very rare tiers).
      expect(Math.abs(sim.tierCounts[i]! - expected)).toBeLessThanOrEqual(5 * sd + 1);
    });
  });

  it("draws 5 distinct whites in 1..69 and a Powerball in 1..26, uniformly", () => {
    const sim = new FastSimulator({ whites: [1, 2, 3, 4, 5], powerball: 1 }, PRIZE_TIERS);
    const whiteCounts = new Array<number>(70).fill(0);
    const pbCounts = new Array<number>(27).fill(0);
    const draws = 200_000;
    let bad = 0;
    for (let i = 0; i < draws; i++) {
      sim.run(1, false);
      const w = sim.lastWhites();
      if (new Set(w).size !== 5) bad++;
      for (const n of w) {
        if (!(n >= 1 && n <= 69)) bad++;
        whiteCounts[n]!++;
      }
      pbCounts[sim.lastPowerball]!++;
    }
    expect(bad).toBe(0);
    expect(pbCounts[0]).toBe(0);
    const chi = (counts: number[], expected: number) =>
      counts.slice(1).reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    // 99.99th percentiles: chi2(68) ~ 120, chi2(25) ~ 62.
    expect(chi(whiteCounts, (draws * 5) / 69)).toBeLessThan(120);
    expect(chi(pbCounts, draws / 26)).toBeLessThan(62);
  });

  it("stops on the jackpot draw", () => {
    // An all-zero random stream makes every shuffle digit 0: the draw is 1,2,3,4,5 + PB 1.
    const sim = new FastSimulator({ whites: [5, 4, 3, 2, 1], powerball: 1 }, PRIZE_TIERS, (b) => b.fill(0));
    const done = sim.run(1000, true);
    expect(done).toBe(1);
    expect(sim.jackpotHit).toBe(true);
    expect(sim.tierCounts[0]).toBe(1);
  });

  it("keeps going past the jackpot when asked", () => {
    const sim = new FastSimulator({ whites: [1, 2, 3, 4, 5], powerball: 1 }, PRIZE_TIERS, (b) => b.fill(0));
    expect(sim.run(10, false)).toBe(10);
    expect(sim.tierCounts[0]).toBe(10);
  });
});
