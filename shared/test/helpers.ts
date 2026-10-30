import type { RandomSource } from "../src";

/** Deterministic splitmix32 source, so statistical tests give the same result on every run. */
export function seededSource(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextUint32() {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
      return (z ^ (z >>> 15)) >>> 0;
    },
  };
}

/** Returns the given values in order, repeating. */
export function sequenceSource(values: number[]): RandomSource {
  let i = 0;
  return { nextUint32: () => values[i++ % values.length]! };
}
