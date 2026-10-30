import {
  checkTicket,
  defaultSource,
  PRIZE_TIERS,
  quickPick,
  TICKET_PRICE,
  type NumberFrequency,
  type RandomSource,
  type Ticket,
} from "@powerball/shared";

/** Most frequent first; ties go to the lower number so the result is deterministic. */
function topNumbers(freqs: readonly NumberFrequency[], count: number): number[] {
  return [...freqs]
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, count)
    .map((f) => f.number);
}

/** "Hot" = the 5 most frequent white balls + the most frequent Powerball, all-time. */
export function deriveHotTicket(freq: {
  whites: readonly NumberFrequency[];
  powerballs: readonly NumberFrequency[];
}): Ticket {
  return {
    whites: topNumbers(freq.whites, 5).sort((a, b) => a - b),
    powerball: topNumbers(freq.powerballs, 1)[0]!,
  };
}

export interface TicketRun {
  spent: number;
  won: number;
  /** Wins per tier (PRIZE_TIERS order). */
  wins: number[];
  /** Number of draws that won any prize. */
  anyWins: number;
  jackpots: number;
}

export interface HotVsRandom {
  draws: number;
  hot: TicketRun;
  random: TicketRun;
  randomTicket: Ticket;
}

function emptyRun(): TicketRun {
  return { spent: 0, won: 0, wins: PRIZE_TIERS.map(() => 0), anyWins: 0, jackpots: 0 };
}

function record(run: TicketRun, ticket: Ticket, draw: Ticket) {
  run.spent += TICKET_PRICE;
  const { tier } = checkTicket(ticket, draw);
  if (!tier) return;
  run.anyWins++;
  run.wins[PRIZE_TIERS.indexOf(tier)]!++;
  if (tier.prize === "jackpot") run.jackpots++;
  else run.won += tier.prize;
}

/** Plays the hot ticket and a random ticket against the same `draws` fair future draws. */
export function compareHotVsRandom(
  hot: Ticket,
  draws = 1000,
  rng: RandomSource = defaultSource,
  randomTicket: Ticket = quickPick(rng),
): HotVsRandom {
  const hotRun = emptyRun();
  const randomRun = emptyRun();
  for (let i = 0; i < draws; i++) {
    const draw = quickPick(rng);
    record(hotRun, hot, draw);
    record(randomRun, randomTicket, draw);
  }
  return { draws, hot: hotRun, random: randomRun, randomTicket };
}
