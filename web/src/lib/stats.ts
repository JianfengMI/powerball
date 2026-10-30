// Small statistics helpers (used by the dev mock API and by chart captions).

function logGamma(x: number): number {
  // Lanczos approximation (g = 7, n = 9), ~15 significant digits.
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0]!;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized upper incomplete gamma Q(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const lnPre = -x + a * Math.log(x) - logGamma(a);
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return 1 - sum * Math.exp(lnPre);
  }
  // Continued fraction (modified Lentz).
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(lnPre) * h;
}

/** p-value of a chi-square statistic with `df` degrees of freedom. */
export function chiSquarePValue(statistic: number, df: number): number {
  return gammaQ(df / 2, statistic / 2);
}

/** Exact distribution of the sum of 5 distinct numbers from 1..69: probability per sum 15..335. */
export function whiteSumDistribution(max = 69, count = 5): { sum: number; probability: number }[] {
  const maxSum = (max * (max + 1)) / 2;
  // ways[k][s] = number of k-subsets with sum s, built number by number.
  const ways: Float64Array[] = Array.from({ length: count + 1 }, () => new Float64Array(maxSum + 1));
  ways[0]![0] = 1;
  for (let n = 1; n <= max; n++) {
    for (let k = Math.min(count, n); k >= 1; k--) {
      const row = ways[k]!;
      const prev = ways[k - 1]!;
      for (let s = maxSum; s >= n; s--) row[s]! += prev[s - n]!;
    }
  }
  const row = ways[count]!;
  let total = 0;
  for (const w of row) total += w;
  const out: { sum: number; probability: number }[] = [];
  for (let s = 0; s <= maxSum; s++) if (row[s]! > 0) out.push({ sum: s, probability: row[s]! / total });
  return out;
}
