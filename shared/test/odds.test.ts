import { describe, expect, it } from "vitest";
import {
  ANY_PRIZE_ONE_IN,
  combinations,
  expectedValue,
  POWERBALL_MAX,
  TIER_ODDS,
  TOTAL_COMBINATIONS,
  WHITE_COUNT,
  waysToMatch,
} from "../src";

// Published odds from powerball.com, rounded to 2 decimals.
const OFFICIAL_ONE_IN: Record<string, number> = {
  "5+PB": 292_201_338,
  "5": 11_688_053.52,
  "4+PB": 913_129.18,
  "4": 36_525.17,
  "3+PB": 14_494.11,
  "3": 579.76,
  "2+PB": 701.33,
  "1+PB": 91.98,
  "0+PB": 38.32,
};

describe("combinations", () => {
  it("computes known values", () => {
    expect(combinations(69, 5)).toBe(11_238_513);
    expect(combinations(64, 5)).toBe(7_624_512);
    expect(combinations(5, 0)).toBe(1);
    expect(combinations(5, 5)).toBe(1);
    expect(combinations(10, 3)).toBe(120);
  });

  it("returns 0 for impossible choices", () => {
    expect(combinations(5, 6)).toBe(0);
    expect(combinations(5, -1)).toBe(0);
  });
});

describe("odds", () => {
  it("has 292,201,338 possible tickets", () => {
    expect(TOTAL_COMBINATIONS).toBe(292_201_338);
  });

  it("matches the official odds for every prize tier", () => {
    expect(TIER_ODDS).toHaveLength(9);
    for (const tier of TIER_ODDS) {
      expect(tier.oneIn, tier.id).toBeCloseTo(OFFICIAL_ONE_IN[tier.id]!, 2);
    }
  });

  it("gives exactly 1 in 292,201,338 for the jackpot", () => {
    expect(TIER_ODDS[0]!.oneIn).toBe(292_201_338);
  });

  it("matches the official overall odds of 1 in 24.87", () => {
    expect(ANY_PRIZE_ONE_IN).toBeCloseTo(24.87, 2);
  });

  it("accounts for every possible ticket across all outcomes", () => {
    let total = 0;
    for (let whites = 0; whites <= WHITE_COUNT; whites++) {
      total += waysToMatch(whites, true) + waysToMatch(whites, false);
    }
    expect(total).toBe(TOTAL_COMBINATIONS);
    expect(waysToMatch(0, true) * (POWERBALL_MAX - 1)).toBe(waysToMatch(0, false));
  });
});

describe("expectedValue", () => {
  it("is about 32 cents per ticket from fixed prizes alone", () => {
    const fromOfficialOdds = TIER_ODDS.reduce(
      (sum, t) => sum + (t.prize === "jackpot" ? 0 : t.prize / OFFICIAL_ONE_IN[t.id]!),
      0,
    );
    // Official odds are rounded to 2 decimals, so agreement is only to about 1e-5.
    expect(expectedValue(0)).toBeCloseTo(fromOfficialOdds, 4);
    expect(expectedValue(0)).toBeCloseTo(0.32, 2);
  });

  it("adds jackpot / 292,201,338 for the jackpot", () => {
    expect(expectedValue(292_201_338) - expectedValue(0)).toBeCloseTo(1, 10);
  });
});
