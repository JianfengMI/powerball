import { describe, expect, it } from "vitest";
import {
  combinations,
  PRIZE_TIERS,
  ticketError,
  TOTAL_COMBINATIONS,
  type NumberFrequency,
  type RandomSource,
} from "@powerball/shared";
import { compareHotVsRandom, deriveHotTicket } from "../src/lib/hotTicket";
import {
  describePattern,
  humanLikePick,
  looksHumanRandom,
  patternSentence,
  probConsecutive,
  probSharedDecade,
} from "../src/lib/fakeDraws";
import {
  DRAWS_PER_YEAR,
  fixedWinnings,
  formatLarge,
  formatOneIn,
  formatYears,
  runStory,
  storySentence,
  yearsForTickets,
} from "../src/lib/format";
import { jackpotComparisons } from "../src/lib/comparisons";

function freqs(counts: number[]): NumberFrequency[] {
  return counts.map((count, i) => ({ number: i + 1, count, expected: 0 }));
}

describe("deriveHotTicket", () => {
  it("takes the 5 most frequent whites and the most frequent Powerball", () => {
    const whites = new Array<number>(69).fill(10);
    [7, 20, 33, 50, 69].forEach((n, i) => (whites[n - 1] = 30 + i));
    const pbs = new Array<number>(26).fill(5);
    pbs[17] = 9;
    expect(deriveHotTicket({ whites: freqs(whites), powerballs: freqs(pbs) })).toEqual({
      whites: [7, 20, 33, 50, 69],
      powerball: 18,
    });
  });

  it("breaks ties toward the lower number", () => {
    const t = deriveHotTicket({ whites: freqs(new Array(69).fill(1)), powerballs: freqs(new Array(26).fill(1)) });
    expect(t).toEqual({ whites: [1, 2, 3, 4, 5], powerball: 1 });
  });
});

describe("compareHotVsRandom", () => {
  it("plays both tickets against the same number of draws", () => {
    const r = compareHotVsRandom({ whites: [1, 2, 3, 4, 5], powerball: 6 }, 1000);
    expect(r.hot.spent).toBe(2000);
    expect(r.random.spent).toBe(2000);
    expect(ticketError(r.randomTicket)).toBeNull();
    expect(r.hot.wins.reduce((a, b) => a + b, 0)).toBe(r.hot.anyWins);
    expect(r.hot.won).toBe(fixedWinnings(r.hot.wins));
  });
});

describe("fake draws", () => {
  it("human-like picks are valid tickets with no clumps", () => {
    for (let i = 0; i < 500; i++) {
      const t = humanLikePick();
      expect(ticketError(t)).toBeNull();
      expect(looksHumanRandom(t.whites)).toBe(true);
    }
  });

  it("describes clumps in a real-looking draw", () => {
    const r = describePattern([12, 13, 44, 47, 62]);
    expect(r.consecutivePairs).toEqual([[12, 13]]);
    expect(r.sharedDecades).toEqual(["10s", "40s"]);
    expect(r.sharedLastDigits).toEqual([2]);
    expect(patternSentence([12, 13, 44, 47, 62])).toContain("12-13");
    expect(patternSentence([5, 18, 27, 39, 64])).toContain("no clumps");
  });

  it("computes exact clump probabilities", () => {
    expect(probConsecutive()).toBeCloseTo(1 - combinations(65, 5) / combinations(69, 5), 12);
    // Brute-force check of the decade calculation.
    let spread = 0;
    for (let a = 1; a <= 69; a++)
      for (let b = a + 1; b <= 69; b++)
        for (let c = b + 1; c <= 69; c++)
          for (let d = c + 1; d <= 69; d++)
            for (let e = d + 1; e <= 69; e++) {
              const s = new Set([a, b, c, d, e].map((n) => Math.floor(n / 10)));
              if (s.size === 5) spread++;
            }
    expect(probSharedDecade()).toBeCloseTo(1 - spread / combinations(69, 5), 12);
  });

  it("supports a deterministic random source", () => {
    let i = 0;
    const seq = [0, 15, 23, 37, 46, 60, 3];
    const rng: RandomSource = { nextUint32: () => seq[i++ % seq.length]! };
    expect(ticketError(humanLikePick(rng))).toBeNull();
  });
});

describe("format helpers", () => {
  it("formats odds and large numbers", () => {
    expect(formatOneIn(24.87)).toBe("1 in 24.87");
    expect(formatOneIn(TOTAL_COMBINATIONS)).toBe("1 in 292,201,338");
    expect(formatLarge(1_866_000)).toBe("1.9 million");
    expect(formatLarge(2_000_000)).toBe("2 million");
    expect(formatLarge(950)).toBe("950");
  });

  it("converts tickets to years at 3 draws a week", () => {
    expect(DRAWS_PER_YEAR).toBeCloseTo(156.54, 2);
    expect(formatYears(yearsForTickets(TOTAL_COMBINATIONS))).toBe("1.9 million years");
    expect(formatYears(yearsForTickets(157))).toBe("1 year");
    expect(formatYears(yearsForTickets(1))).toBe("less than a week");
  });

  it("tells the story of a run", () => {
    const counts = PRIZE_TIERS.map(() => 0);
    counts[0] = 1; // jackpot
    counts[8] = 10; // $4 each
    const s = runStory(1000, counts);
    expect(s).toMatchObject({ tickets: 1000, spent: 2000, won: 40 });
    expect(storySentence(s)).toContain("It took 1,000 tickets, $2,000 spent, $40 won");
  });
});

describe("jackpotComparisons", () => {
  it("are computed exactly", () => {
    const c = jackpotComparisons();
    expect(c[0]!.title).toBe("One specific second in 9.3 years");
    expect(c[2]!.title).toBe("Harder than 28 coin flips in a row");
    expect(c[3]!.title).toBe("Harder than rolling 10 sixes in a row");
    expect(2 ** 28).toBeLessThan(TOTAL_COMBINATIONS);
    expect(2 ** 29).toBeGreaterThan(TOTAL_COMBINATIONS);
  });
});

