// Powerball rules in effect since 2015-10-07: 5 white balls from 1-69, 1 red Powerball from 1-26.
export const WHITE_MAX = 69;
export const WHITE_COUNT = 5;
export const POWERBALL_MAX = 26;
export const TICKET_PRICE = 2;

/** First draw under the current 69/26 rules. Earlier draws used 59/35 and must be excluded from analysis. */
export const RULES_START_DATE = "2015-10-07";

export type Prize = number | "jackpot";

export interface PrizeTier {
  id: string;
  whites: number;
  powerball: boolean;
  prize: Prize;
  label: string;
}

/** Official prize tiers, best first. Fixed prizes exclude Power Play multipliers. */
export const PRIZE_TIERS: readonly PrizeTier[] = [
  { id: "5+PB", whites: 5, powerball: true, prize: "jackpot", label: "5 + Powerball" },
  { id: "5", whites: 5, powerball: false, prize: 1_000_000, label: "5 white balls" },
  { id: "4+PB", whites: 4, powerball: true, prize: 50_000, label: "4 + Powerball" },
  { id: "4", whites: 4, powerball: false, prize: 100, label: "4 white balls" },
  { id: "3+PB", whites: 3, powerball: true, prize: 100, label: "3 + Powerball" },
  { id: "3", whites: 3, powerball: false, prize: 7, label: "3 white balls" },
  { id: "2+PB", whites: 2, powerball: true, prize: 7, label: "2 + Powerball" },
  { id: "1+PB", whites: 1, powerball: true, prize: 4, label: "1 + Powerball" },
  { id: "0+PB", whites: 0, powerball: true, prize: 4, label: "Powerball only" },
];

export function findTier(whites: number, powerball: boolean): PrizeTier | null {
  return PRIZE_TIERS.find((t) => t.whites === whites && t.powerball === powerball) ?? null;
}
