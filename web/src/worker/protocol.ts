import type { Ticket } from "@powerball/shared";

export type ToWorker =
  | { type: "start"; ticket: Ticket }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "fastForward" };

export interface SimProgress {
  type: "progress";
  /** Total tickets (live + fast-forwarded). */
  tickets: number;
  /** Tickets that were individually simulated, draw by draw. */
  liveTickets: number;
  /** Tickets whose results were sampled statistically by fast-forward (0 if not used). */
  fastForwardTickets: number;
  /** Wins per tier, PRIZE_TIERS order. */
  tierCounts: number[];
  running: boolean;
  /** True once the jackpot has been hit. */
  done: boolean;
  /** Live simulation speed over the last interval, tickets per second. */
  rate: number;
  /** Wall-clock time spent simulating, ms. */
  elapsedMs: number;
}
