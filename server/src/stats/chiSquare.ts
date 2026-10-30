// Chi-square goodness-of-fit test, with the survival function implemented via the
// regularized upper incomplete gamma function Q(a, x) (Numerical Recipes style).

import type { ChiSquareResult } from "@powerball/shared";

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Natural log of the gamma function for x > 0 (Lanczos approximation, g = 7). */
export function logGamma(x: number): number {
  if (x < 0.5) {
    // Reflection formula.
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i]! / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const EPS = 1e-15;
const MAX_ITER = 1000;
const TINY = 1e-300;

/** Regularized lower incomplete gamma P(a, x) by series; converges well for x < a + 1. */
function gammaPSeries(a: number, x: number): number {
  let sum = 1 / a;
  let term = sum;
  for (let n = 1; n < MAX_ITER; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Regularized upper incomplete gamma Q(a, x) by continued fraction (modified Lentz); for x >= a + 1. */
function gammaQContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Regularized upper incomplete gamma function Q(a, x) = 1 - P(a, x). */
export function regularizedGammaQ(a: number, x: number): number {
  if (!(a > 0)) throw new RangeError(`regularizedGammaQ: a must be > 0, got ${a}`);
  if (Number.isNaN(x)) return NaN;
  if (x <= 0) return 1;
  if (x === Infinity) return 0;
  return x < a + 1 ? 1 - gammaPSeries(a, x) : gammaQContinuedFraction(a, x);
}

/** P(X >= statistic) for X ~ chi-square with `df` degrees of freedom. */
export function chiSquareSurvival(statistic: number, df: number): number {
  return Math.min(1, Math.max(0, regularizedGammaQ(df / 2, statistic / 2)));
}

/**
 * Chi-square goodness-of-fit test of observed counts against equal expected counts.
 *
 * `perDraw` is how many distinct numbers each draw picks from the pool (5 for white balls,
 * 1 for the Powerball). When several numbers are drawn without replacement, the counts are
 * negatively correlated and the plain statistic sum((O-E)^2/E) is asymptotically
 * ((N-k)/(N-1)) * chi2(N-1) rather than chi2(N-1). We rescale by (N-1)/(N-k) so the reported
 * statistic follows chi2(N-1) and the p-value is calibrated. For k = 1 the factor is 1.
 */
export function chiSquareUniformTest(counts: readonly number[], perDraw = 1): ChiSquareResult {
  const categories = counts.length;
  const degreesOfFreedom = categories - 1;
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0 || categories < 2) return { statistic: 0, degreesOfFreedom, pValue: 1 };

  const expected = total / categories;
  let raw = 0;
  for (const c of counts) raw += (c - expected) ** 2 / expected;
  const factor = perDraw > 1 ? (categories - 1) / (categories - perDraw) : 1;
  const statistic = raw * factor;
  return { statistic, degreesOfFreedom, pValue: chiSquareSurvival(statistic, degreesOfFreedom) };
}
