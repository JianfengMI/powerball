// "Fast-forward" for play-until-you-win: jumps straight to the jackpot with sampling that is
// exact in distribution, instead of simulating every ticket.
//
// Why it is exact:
//  - Draws are independent, so the number of tickets until the first jackpot is
//    Geometric(p = 1/292,201,338). The wait is memoryless: after any number of losing tickets,
//    the *remaining* wait has the same Geometric distribution, so we can switch from live
//    simulation to fast-forward at any moment.
//  - Given K tickets with the jackpot on the last one, the other K-1 tickets are independent
//    draws conditioned on "not the jackpot", so their tier counts are Multinomial(K-1, q) with
//    q_tier = p_tier / (1 - p_jackpot). We sample that as a chain of conditional binomials.
//  - Each binomial is sampled by exact inversion of its probability table, searched outward
//    from the mode (O(standard deviation) steps; no normal approximation is used).
// Only floating-point rounding (~1e-6 relative in the largest probabilities) separates this
// from the true distribution, far below anything a person could detect.

/** Uniform double source in [0, 1). */
export type Uniform = () => number;

/** 53-bit uniform doubles from crypto.getRandomValues. */
export function cryptoUniform(): Uniform {
  const buf = new Uint32Array(2048);
  let i = buf.length;
  return () => {
    if (i >= buf.length) {
      globalThis.crypto.getRandomValues(buf);
      i = 0;
    }
    const hi = buf[i++]! >>> 5; // 27 bits
    const lo = buf[i++]! >>> 6; // 26 bits
    return (hi * 67108864 + lo) / 9007199254740992;
  };
}

/** Number of trials up to and including the first success, success probability p. Mean 1/p. */
export function sampleGeometric(p: number, rand: Uniform): number {
  if (!(p > 0 && p <= 1)) throw new RangeError(`sampleGeometric: bad p ${p}`);
  if (p === 1) return 1;
  const u = 1 - rand(); // (0, 1]
  return Math.max(1, Math.ceil(Math.log(u) / Math.log1p(-p)));
}

const LOG_FACT_TABLE: number[] = [0];
for (let i = 1; i <= 256; i++) LOG_FACT_TABLE[i] = LOG_FACT_TABLE[i - 1]! + Math.log(i);

/** ln(n!) — exact table for n <= 256, Stirling series beyond (error < 1e-15 relative). */
export function logFactorial(n: number): number {
  if (n <= 256) return LOG_FACT_TABLE[n]!;
  const x = n + 1;
  const inv = 1 / x;
  const inv2 = inv * inv;
  return (
    (x - 0.5) * Math.log(x) -
    x +
    0.5 * Math.log(2 * Math.PI) +
    inv * (1 / 12 - inv2 * (1 / 360 - inv2 * (1 / 1260 - inv2 / 1680)))
  );
}

/** Binomial(n, p) by exact inversion, searching outward from the mode. */
export function sampleBinomial(n: number, p: number, rand: Uniform): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (p > 0.5) return n - sampleBinomial(n, 1 - p, rand);
  const q = 1 - p;
  const mode = Math.min(n, Math.floor((n + 1) * p));
  const logPmf =
    logFactorial(n) - logFactorial(mode) - logFactorial(n - mode) +
    mode * Math.log(p) + (n - mode) * Math.log1p(-p);
  const fMode = Math.exp(logPmf);
  let u = rand() - fMode;
  if (u < 0) return mode;
  const ratio = p / q;
  let lo = mode;
  let hi = mode;
  let fLo = fMode;
  let fHi = fMode;
  for (;;) {
    let moved = false;
    if (hi < n && fHi > 0) {
      fHi *= ((n - hi) / (hi + 1)) * ratio;
      hi++;
      u -= fHi;
      if (u < 0) return hi;
      moved = true;
    }
    if (lo > 0 && fLo > 0) {
      fLo *= lo / ((n - lo + 1) * ratio);
      lo--;
      u -= fLo;
      if (u < 0) return lo;
      moved = true;
    }
    // Leftover u is floating-point rounding of a total that should be 1: return the mode.
    if (!moved || (fHi < 1e-300 && fLo < 1e-300)) return mode;
  }
}

/** Multinomial(n, probs) where probs sum to <= 1; the remainder is an implicit "other" category. */
export function sampleMultinomial(n: number, probs: readonly number[], rand: Uniform): number[] {
  const out: number[] = [];
  let remaining = n;
  let massLeft = 1;
  for (const pk of probs) {
    const cond = massLeft > 0 ? Math.min(1, pk / massLeft) : 0;
    const c = remaining > 0 ? sampleBinomial(remaining, cond, rand) : 0;
    out.push(c);
    remaining -= c;
    massLeft -= pk;
  }
  return out;
}

export interface FastForwardResult {
  /** Extra tickets bought, including the jackpot ticket. */
  tickets: number;
  /** Wins per tier for those tickets (jackpot tier = 1). */
  tierCounts: number[];
}

/**
 * Samples the rest of a play-until-jackpot run. `tierProbs[i]` is the per-ticket probability of
 * tier i, and `jackpotIndex` is which entry is the jackpot.
 */
export function fastForwardToJackpot(
  tierProbs: readonly number[],
  jackpotIndex: number,
  rand: Uniform,
): FastForwardResult {
  const pJ = tierProbs[jackpotIndex]!;
  const tickets = sampleGeometric(pJ, rand);
  const others = tierProbs.map((p, i) => (i === jackpotIndex ? 0 : p / (1 - pJ)));
  const tierCounts = sampleMultinomial(tickets - 1, others, rand);
  tierCounts[jackpotIndex] = 1;
  return { tickets, tierCounts };
}
