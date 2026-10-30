import {
  checkTicket,
  PRIZE_TIERS,
  TICKET_PRICE,
  ticketError,
  type CheckResponse,
  type DrawRecord,
  type Ticket,
} from "@powerball/shared";

const INT_RE = /^\d{1,3}$/;

/** Parses ?whites=1,2,3,4,5&pb=6 into a valid ticket, or returns an error message. */
export function parseTicketQuery(query: Record<string, unknown>): { ticket: Ticket } | { error: string } {
  const { whites, pb } = query;
  if (typeof whites !== "string" || whites.trim() === "") {
    return { error: "Query parameter 'whites' is required, e.g. whites=1,2,3,4,5" };
  }
  if (typeof pb !== "string" || pb.trim() === "") {
    return { error: "Query parameter 'pb' is required, e.g. pb=6" };
  }
  const parts = whites.split(",").map((s) => s.trim());
  if (parts.some((p) => !INT_RE.test(p)) || !INT_RE.test(pb.trim())) {
    return { error: "Numbers must be whole numbers, with white balls separated by commas" };
  }
  const ticket: Ticket = { whites: parts.map(Number).sort((a, b) => a - b), powerball: Number(pb.trim()) };
  const error = ticketError(ticket);
  return error ? { error } : { ticket };
}

/**
 * CheckResponse plus fields the lead is adding to shared/src/api.ts on main
 * (ticket echo and per-draw win history). Drop this once shared has them.
 */
export type CheckResult = CheckResponse & {
  ticket: { whites: number[]; powerball: number };
  winHistory: { date: string; tierId: string }[];
};

/** Checks a ticket against every draw. bestWin is the best tier hit, at its earliest date. */
export function checkHistory(ticket: Ticket, draws: readonly DrawRecord[]): CheckResult {
  const counts = new Map<string, number>(PRIZE_TIERS.map((t) => [t.id, 0]));
  const tierRank = new Map<string, number>(PRIZE_TIERS.map((t, i) => [t.id, i]));
  const jackpotDates: string[] = [];
  const winHistory: CheckResult["winHistory"] = [];
  let totalWon = 0;
  let bestWin: CheckResponse["bestWin"] = null;

  for (const draw of draws) {
    const { tier } = checkTicket(ticket, draw);
    if (!tier) continue;
    winHistory.push({ date: draw.date, tierId: tier.id });
    counts.set(tier.id, counts.get(tier.id)! + 1);
    if (tier.prize === "jackpot") jackpotDates.push(draw.date);
    else totalWon += tier.prize;
    if (!bestWin || tierRank.get(tier.id)! < tierRank.get(bestWin.tierId)!) {
      bestWin = { tierId: tier.id, date: draw.date };
    }
  }

  return {
    ticket: { whites: [...ticket.whites].sort((a, b) => a - b), powerball: ticket.powerball },
    drawCount: draws.length,
    totalSpent: draws.length * TICKET_PRICE,
    totalWon,
    wins: PRIZE_TIERS.map((t) => ({ tierId: t.id, count: counts.get(t.id)!, prize: t.prize })),
    jackpotDates,
    bestWin,
    winHistory,
  };
}
