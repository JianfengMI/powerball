import { readFile } from "node:fs/promises";
import { RULES_START_DATE } from "@powerball/shared";
import { SEED_PATH } from "./paths";

export type SourceName = "live" | "seed";

/** Something that yields raw NY Open Data rows ([{ draw_date, winning_numbers }]). */
export interface DrawSource {
  name: SourceName;
  load(): Promise<unknown>;
}

export const LIVE_URL =
  "https://data.ny.gov/resource/d6yy-54nr.json?$select=draw_date,winning_numbers" +
  `&$where=draw_date>='${RULES_START_DATE}'&$order=draw_date&$limit=10000`;

export function liveSource(url = LIVE_URL, timeoutMs = 15_000): DrawSource {
  return {
    name: "live",
    async load() {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`NY Open Data responded ${res.status} ${res.statusText}`);
      return res.json();
    },
  };
}

export function seedSource(path = SEED_PATH): DrawSource {
  return {
    name: "seed",
    async load() {
      return JSON.parse(await readFile(path, "utf8"));
    },
  };
}

/** A fixed in-memory dataset, for tests. */
export function staticSource(rows: unknown, name: SourceName = "seed"): DrawSource {
  return { name, load: async () => rows };
}
