import { POWERBALL_MAX, PRIZE_TIERS, WHITE_COUNT, WHITE_MAX, type PrizeTier } from "./game";

/** n choose k, exact for the small values used here. */
export function combinations(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return Math.round(result);
}

/** Number of distinct tickets: C(69,5) * 26 = 292,201,338. */
export const TOTAL_COMBINATIONS = combinations(WHITE_MAX, WHITE_COUNT) * POWERBALL_MAX;

/** Number of tickets that match exactly `whites` white balls and the Powerball (or not) against a given draw. */
export function waysToMatch(whites: number, powerball: boolean): number {
  const whiteWays =
    combinations(WHITE_COUNT, whites) * combinations(WHITE_MAX - WHITE_COUNT, WHITE_COUNT - whites);
  return whiteWays * (powerball ? 1 : POWERBALL_MAX - 1);
}

export interface TierOdds extends PrizeTier {
  ways: number;
  probability: number;
  /** Odds expressed as "1 in N". */
  oneIn: number;
}

export const TIER_ODDS: readonly TierOdds[] = PRIZE_TIERS.map((tier) => {
  const ways = waysToMatch(tier.whites, tier.powerball);
  return { ...tier, ways, probability: ways / TOTAL_COMBINATIONS, oneIn: TOTAL_COMBINATIONS / ways };
});

const winningWays = TIER_ODDS.reduce((sum, t) => sum + t.ways, 0);

/** Odds of winning any prize: about 1 in 24.87. */
export const ANY_PRIZE_ONE_IN = TOTAL_COMBINATIONS / winningWays;

/**
 * Expected winnings per ticket for a given jackpot amount.
 * Simplified: ignores taxes, shared jackpots, lump-sum discounting and Power Play.
 */
export function expectedValue(jackpot: number): number {
  return TIER_ODDS.reduce(
    (sum, t) => sum + t.probability * (t.prize === "jackpot" ? jackpot : t.prize),
    0,
  );
}
