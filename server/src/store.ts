import type {
  DrawRecord,
  FrequencyResponse,
  GapsResponse,
  SumsResponse,
  SummaryResponse,
} from "@powerball/shared";
import { DrawDatabase } from "./db";
import { parseDraws } from "./parse";
import type { DrawSource } from "./sources";
import { computeFrequency } from "./stats/frequency";
import { computeGaps } from "./stats/gaps";
import { computeSums } from "./stats/sums";

/** Everything derived from one data load. Stats are computed once here, then served from cache. */
export interface Snapshot {
  draws: DrawRecord[];
  summary: SummaryResponse;
  frequency: FrequencyResponse;
  sums: SumsResponse;
  gaps: GapsResponse;
}

export interface StoreLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

const consoleLogger: StoreLogger = {
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

export function buildSnapshot(draws: DrawRecord[], source: "live" | "seed", loadedAt: Date): Snapshot {
  return {
    draws,
    summary: {
      drawCount: draws.length,
      firstDate: draws[0]!.date,
      lastDate: draws[draws.length - 1]!.date,
      lastUpdated: loadedAt.toISOString(),
      source,
    },
    frequency: computeFrequency(draws),
    sums: computeSums(draws),
    gaps: computeGaps(draws),
  };
}

export class DrawStore {
  private current: Snapshot | null = null;
  readonly db: DrawDatabase;
  /** Replaceable so the server can route store messages through its own logger. */
  log: StoreLogger;

  constructor(opts: { db?: DrawDatabase; logger?: StoreLogger } = {}) {
    this.db = opts.db ?? new DrawDatabase();
    this.log = opts.logger ?? consoleLogger;
  }

  get snapshot(): Snapshot | null {
    return this.current;
  }

  /**
   * Tries each source in order and keeps the first that yields at least one valid draw.
   * Returns false (and keeps the existing data) if every source fails.
   */
  async load(sources: readonly DrawSource[]): Promise<boolean> {
    for (const source of sources) {
      try {
        const raw = await source.load();
        const { draws, skipped, beforeStart } = parseDraws(raw);
        for (const s of skipped.slice(0, 20)) this.log.warn(`[${source.name}] skipped row ${s.index}: ${s.reason}`);
        if (skipped.length > 20) this.log.warn(`[${source.name}] ...and ${skipped.length - 20} more skipped rows`);
        if (draws.length === 0) throw new Error("no valid draws");

        this.db.replaceAll(draws);
        this.current = buildSnapshot(this.db.range(), source.name, new Date());
        this.log.info(
          `Loaded ${draws.length} draws from ${source.name} (${draws[0]!.date} to ${draws[draws.length - 1]!.date}; ` +
            `${skipped.length} skipped, ${beforeStart} before rule change)`,
        );
        return true;
      } catch (err) {
        this.log.error(`Failed to load draws from ${source.name}: ${(err as Error).message}`);
      }
    }
    return false;
  }

  close(): void {
    this.db.close();
  }
}
