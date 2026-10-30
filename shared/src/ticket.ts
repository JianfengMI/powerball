import { findTier, POWERBALL_MAX, WHITE_COUNT, WHITE_MAX, type PrizeTier } from "./game";
import { defaultSource, randomInt, sampleDistinct, type RandomSource } from "./rng";

/** A ticket or a draw: 5 white balls and 1 Powerball. */
export interface Ticket {
  whites: number[];
  powerball: number;
}

export interface MatchResult {
  whiteMatches: number;
  powerballMatch: boolean;
  tier: PrizeTier | null;
}

/** Returns a description of what is wrong with the ticket, or null if it is valid. */
export function ticketError(ticket: Ticket): string | null {
  const { whites, powerball } = ticket;
  if (whites.length !== WHITE_COUNT) return `Pick exactly ${WHITE_COUNT} white balls`;
  if (whites.some((n) => !Number.isInteger(n) || n < 1 || n > WHITE_MAX)) {
    return `White balls must be whole numbers from 1 to ${WHITE_MAX}`;
  }
  if (new Set(whites).size !== WHITE_COUNT) return "White balls must all be different";
  if (!Number.isInteger(powerball) || powerball < 1 || powerball > POWERBALL_MAX) {
    return `Powerball must be a whole number from 1 to ${POWERBALL_MAX}`;
  }
  return null;
}

/** A random ticket. The same function produces simulated draws. */
export function quickPick(rng: RandomSource = defaultSource): Ticket {
  return {
    whites: sampleDistinct(WHITE_COUNT, WHITE_MAX, rng),
    powerball: randomInt(POWERBALL_MAX, rng) + 1,
  };
}

export function checkTicket(ticket: Ticket, draw: Ticket): MatchResult {
  const whiteMatches = ticket.whites.filter((n) => draw.whites.includes(n)).length;
  const powerballMatch = ticket.powerball === draw.powerball;
  return { whiteMatches, powerballMatch, tier: findTier(whiteMatches, powerballMatch) };
}
