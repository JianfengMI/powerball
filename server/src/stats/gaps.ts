import { POWERBALL_MAX, WHITE_MAX, type DrawRecord, type GapInfo, type GapsResponse } from "@powerball/shared";

/**
 * Gap info for numbers 1..max. `appearances(draw)` returns the numbers present in a draw.
 * Draws must be oldest first. longestGap considers every run of absence, including the run before
 * a number's first appearance and the current run since its last one; a number that never
 * appeared has longestGap = drawCount.
 */
export function computeGapInfo(
  draws: readonly DrawRecord[],
  max: number,
  appearances: (d: DrawRecord) => readonly number[],
): GapInfo[] {
  const n = draws.length;
  const lastIndex = new Array<number>(max + 1).fill(-1);
  const longest = new Array<number>(max + 1).fill(0);
  draws.forEach((d, i) => {
    for (const num of appearances(d)) {
      const gap = i - lastIndex[num]! - 1; // draws strictly between appearances (or since the start)
      if (gap > longest[num]!) longest[num] = gap;
      lastIndex[num] = i;
    }
  });
  const result: GapInfo[] = [];
  for (let num = 1; num <= max; num++) {
    const last = lastIndex[num]!;
    const current = n - 1 - last; // equals n when never seen
    result.push({
      number: num,
      drawsSinceLast: last < 0 ? null : current,
      lastSeen: last < 0 ? null : draws[last]!.date,
      longestGap: Math.max(longest[num]!, current),
    });
  }
  return result;
}

export function computeGaps(draws: readonly DrawRecord[]): GapsResponse {
  return {
    drawCount: draws.length,
    whites: computeGapInfo(draws, WHITE_MAX, (d) => d.whites),
    powerballs: computeGapInfo(draws, POWERBALL_MAX, (d) => [d.powerball]),
  };
}
