// Allocation-free Powerball draw simulator for "play until you win".
//
// Every simulated draw is a genuine random draw of 5 distinct white balls (1-69) and one
// Powerball (1-26), compared against the user's fixed ticket. It is fast because:
//  - the ticket is a 70-entry membership table, so counting matches is 5 array reads;
//  - white balls come from a partial Fisher-Yates shuffle of a persistent Int32Array pool
//    (any arrangement of the pool is a valid starting point, so it never needs resetting);
//  - random values are 31-bit integers (V8 "small integers", so all arithmetic stays in
//    int registers) split into several uniform digits by mixed-radix decomposition:
//      word A -> shuffle positions for balls 1-4 (radix 69*68*67*66 = 20,709,120)
//      word B -> two (ball-5 position, Powerball) pairs (radix (65*26)^2 = 2,856,100)
//    Rejection sampling on each word makes every digit exactly uniform and independent;
//  - random words come from crypto.getRandomValues in 64 KiB buffers.
//
// This file deliberately has no runtime imports so it can be benchmarked directly in Node.
import type { Ticket } from "@powerball/shared";

/** Fills a buffer with uniform random 32-bit values. Defaults to crypto.getRandomValues. */
export type FillRandom = (buffer: Int32Array) => void;

export const cryptoFill: FillRandom = (buffer) => {
  globalThis.crypto.getRandomValues(buffer);
};

/** Minimal tier description (PRIZE_TIERS from @powerball/shared satisfies this). */
export interface TierShape {
  whites: number;
  powerball: boolean;
}

const WHITE_MAX = 69;
const PB_MAX = 26;
const RADIX_A = 69 * 68 * 67 * 66; // 20,709,120
const LIMIT_A = RADIX_A * Math.floor(2 ** 31 / RADIX_A); // reject words >= this (0.7%)
const PAIR = 65 * PB_MAX; // 1,690
const RADIX_B = PAIR * PAIR; // 2,856,100
const LIMIT_B = RADIX_B * Math.floor(2 ** 31 / RADIX_B); // (0.1% rejected)
const BUFFER_SIZE = 16384; // 64 KiB, the getRandomValues maximum

export class FastSimulator {
  /** Tickets checked (= draws simulated) so far. */
  tickets = 0;
  /** Wins per tier, indexed like the `tiers` array passed to the constructor. */
  readonly tierCounts: Float64Array;
  /** Whether the last run() stopped because the jackpot was hit. */
  jackpotHit = false;
  /** Powerball of the most recent draw. */
  lastPowerball = 0;

  private readonly inTicket = new Uint8Array(WHITE_MAX + 1);
  private readonly ticketPb: number;
  private readonly pool = new Int32Array(WHITE_MAX);
  /** outcome code (whiteMatches * 2 + pbMatch) -> tier index, or -1 for no prize. */
  private readonly tierOf = new Int8Array(12).fill(-1);
  private readonly jackpotTier: number;
  private readonly buffer = new Int32Array(BUFFER_SIZE);
  private index = BUFFER_SIZE;
  private pairWord = 0;
  private pairsLeft = 0;
  private readonly fill: FillRandom;

  constructor(ticket: Ticket, tiers: readonly TierShape[], fill: FillRandom = cryptoFill) {
    this.fill = fill;
    for (const n of ticket.whites) this.inTicket[n] = 1;
    this.ticketPb = ticket.powerball;
    for (let i = 0; i < WHITE_MAX; i++) this.pool[i] = i + 1;
    tiers.forEach((t, i) => {
      this.tierOf[t.whites * 2 + (t.powerball ? 1 : 0)] = i;
    });
    this.jackpotTier = this.tierOf[5 * 2 + 1]!;
    this.tierCounts = new Float64Array(tiers.length);
  }

  /** Next uniform 31-bit integer. */
  private next(): number {
    if (this.index === BUFFER_SIZE) {
      this.fill(this.buffer);
      this.index = 0;
    }
    return this.buffer[this.index++]! & 0x7fffffff;
  }

  /**
   * Simulates up to `maxDraws` draws. If `stopOnJackpot`, stops right after the draw that hits
   * the jackpot (that draw is counted). Returns the number of draws performed.
   */
  run(maxDraws: number, stopOnJackpot = true): number {
    const pool = this.pool;
    const inTicket = this.inTicket;
    const tierOf = this.tierOf;
    const counts = this.tierCounts;
    const ticketPb = this.ticketPb;
    const jackpotTier = this.jackpotTier;
    let pairWord = this.pairWord;
    let pairsLeft = this.pairsLeft;
    let pb = 0;
    this.jackpotHit = false;
    let done = 0;
    while (done < maxDraws) {
      let u = this.next();
      while (u >= LIMIT_A) u = this.next();
      let m = 0;
      let j: number;
      let p: number;
      // Partial Fisher-Yates: swap position i with i + digit, digit uniform in [0, 69 - i).
      j = u % 69; u = (u / 69) | 0;
      p = pool[j]!; pool[j] = pool[0]!; pool[0] = p; m += inTicket[p]!;
      j = 1 + (u % 68); u = (u / 68) | 0;
      p = pool[j]!; pool[j] = pool[1]!; pool[1] = p; m += inTicket[p]!;
      j = 2 + (u % 67); u = (u / 67) | 0;
      p = pool[j]!; pool[j] = pool[2]!; pool[2] = p; m += inTicket[p]!;
      j = 3 + (u % 66);
      p = pool[j]!; pool[j] = pool[3]!; pool[3] = p; m += inTicket[p]!;

      if (pairsLeft === 0) {
        let w = this.next();
        while (w >= LIMIT_B) w = this.next();
        pairWord = w;
        pairsLeft = 2;
      }
      const q = pairWord % PAIR;
      pairWord = (pairWord / PAIR) | 0;
      pairsLeft--;
      j = 4 + (q % 65);
      pb = ((q / 65) | 0) + 1;
      p = pool[j]!; pool[j] = pool[4]!; pool[4] = p; m += inTicket[p]!;

      done++;
      const tier = tierOf[m * 2 + (pb === ticketPb ? 1 : 0)]!;
      if (tier >= 0) {
        counts[tier]!++;
        if (tier === jackpotTier && stopOnJackpot) {
          this.jackpotHit = true;
          break;
        }
      }
    }
    this.pairWord = pairWord;
    this.pairsLeft = pairsLeft;
    this.lastPowerball = pb;
    this.tickets += done;
    return done;
  }

  /** The five white balls of the most recent draw (unsorted). */
  lastWhites(): number[] {
    return Array.from(this.pool.subarray(0, 5));
  }
}
