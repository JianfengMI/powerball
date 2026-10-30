/** A source of uniformly distributed unsigned 32-bit integers. */
export interface RandomSource {
  nextUint32(): number;
}

const BUFFER_SIZE = 16384; // getRandomValues accepts at most 65,536 bytes per call

/** Cryptographically secure source, buffered so simulations can draw millions of values quickly. */
export function cryptoSource(): RandomSource {
  const buffer = new Uint32Array(BUFFER_SIZE);
  let index = BUFFER_SIZE;
  return {
    nextUint32() {
      if (index === BUFFER_SIZE) {
        globalThis.crypto.getRandomValues(buffer);
        index = 0;
      }
      return buffer[index++]!;
    },
  };
}

export const defaultSource = cryptoSource();

const UINT32_RANGE = 2 ** 32;

/** Uniform integer in [0, n). Uses rejection sampling to avoid modulo bias. */
export function randomInt(n: number, rng: RandomSource = defaultSource): number {
  if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) {
    throw new RangeError(`randomInt: n must be an integer in [1, 2^32], got ${n}`);
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % n);
  let x: number;
  do {
    x = rng.nextUint32();
  } while (x >= limit);
  return x % n;
}

/** Picks `count` distinct numbers from 1..max, sorted ascending (partial Fisher-Yates shuffle). */
export function sampleDistinct(count: number, max: number, rng: RandomSource = defaultSource): number[] {
  if (!Number.isInteger(count) || !Number.isInteger(max) || count < 0 || count > max) {
    throw new RangeError(`sampleDistinct: cannot pick ${count} from ${max}`);
  }
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(max - i, rng);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
