// JSON contract between the server (/api/*) and the web app.
// Errors from any endpoint use HTTP 4xx/5xx with an ApiError body.

export interface ApiError {
  error: string;
}

/** One real draw. `date` is YYYY-MM-DD; `whites` are sorted ascending. */
export interface DrawRecord {
  date: string;
  whites: number[];
  powerball: number;
}

/** GET /api/draws?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional, inclusive), oldest first. */
export interface DrawsResponse {
  draws: DrawRecord[];
}

/** GET /api/stats/summary */
export interface SummaryResponse {
  drawCount: number;
  firstDate: string;
  lastDate: string;
  /** ISO timestamp of the last successful data load. */
  lastUpdated: string;
  /** "live" if loaded from NY Open Data, "seed" if from the bundled data/draws.json fallback. */
  source: "live" | "seed";
}

export interface NumberFrequency {
  number: number;
  count: number;
  /** Count expected under perfect randomness for this many draws. */
  expected: number;
}

export interface ChiSquareResult {
  statistic: number;
  degreesOfFreedom: number;
  pValue: number;
}

/** GET /api/stats/frequency */
export interface FrequencyResponse {
  drawCount: number;
  whites: NumberFrequency[]; // numbers 1..69 in order
  powerballs: NumberFrequency[]; // numbers 1..26 in order
  whiteTest: ChiSquareResult;
  powerballTest: ChiSquareResult;
}

/** GET /api/stats/sums — sum of the five white balls per draw. */
export interface SumsResponse {
  drawCount: number;
  /** Observed draws per sum, only sums that occurred, ascending. */
  observed: { sum: number; count: number }[];
  /** Exact probability of each possible sum (15..335) for 5 distinct balls from 1..69. */
  theoretical: { sum: number; probability: number }[];
  observedMean: number;
  theoreticalMean: number; // 175
}

export interface GapInfo {
  number: number;
  /** Draws since this number last appeared (0 = appeared in the latest draw), null if never. */
  drawsSinceLast: number | null;
  lastSeen: string | null;
  /** Longest run of consecutive draws without this number. */
  longestGap: number;
}

/** GET /api/stats/gaps */
export interface GapsResponse {
  drawCount: number;
  whites: GapInfo[]; // 1..69
  powerballs: GapInfo[]; // 1..26
}

/**
 * GET /api/check?whites=1,2,3,4,5&pb=6
 * The ticket checked against every real draw. Jackpot amounts are not in the dataset,
 * so jackpot wins are listed by date and excluded from totalWon.
 */
export interface CheckResponse {
  drawCount: number;
  totalSpent: number;
  /** Fixed prizes only (no jackpot, no Power Play). */
  totalWon: number;
  /** One entry per prize tier (PRIZE_TIERS order), including tiers with count 0. */
  wins: { tierId: string; count: number; prize: number | "jackpot" }[];
  jackpotDates: string[];
  /** The single best result, or null if the ticket never won anything. */
  bestWin: { tierId: string; date: string } | null;
}
