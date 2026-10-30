import { DatabaseSync } from "node:sqlite";
import type { DrawRecord } from "@powerball/shared";

interface DrawRow {
  date: string;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  w5: number;
  pb: number;
}

const toRecord = (r: DrawRow): DrawRecord => ({
  date: r.date,
  whites: [r.w1, r.w2, r.w3, r.w4, r.w5],
  powerball: r.pb,
});

/**
 * SQLite storage for draws, via Node's built-in node:sqlite (no native modules).
 * In-memory by default: the table is rebuilt on every data load, and Render's disk is ephemeral.
 */
export class DrawDatabase {
  private readonly db: DatabaseSync;

  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS draws (
      date TEXT PRIMARY KEY,
      w1 INTEGER NOT NULL, w2 INTEGER NOT NULL, w3 INTEGER NOT NULL,
      w4 INTEGER NOT NULL, w5 INTEGER NOT NULL,
      pb INTEGER NOT NULL
    ) STRICT`);
  }

  /** Atomically replaces every draw. */
  replaceAll(draws: readonly DrawRecord[]): void {
    const insert = this.db.prepare(
      "INSERT INTO draws (date, w1, w2, w3, w4, w5, pb) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    this.db.exec("BEGIN");
    try {
      this.db.exec("DELETE FROM draws");
      for (const d of draws) {
        const [w1, w2, w3, w4, w5] = d.whites as [number, number, number, number, number];
        insert.run(d.date, w1, w2, w3, w4, w5, d.powerball);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** Draws in [from, to] (inclusive, YYYY-MM-DD, either optional), oldest first. */
  range(from?: string, to?: string): DrawRecord[] {
    const rows = this.db
      .prepare("SELECT date, w1, w2, w3, w4, w5, pb FROM draws WHERE date >= ? AND date <= ? ORDER BY date")
      .all(from ?? "0000-00-00", to ?? "9999-99-99") as unknown as DrawRow[];
    return rows.map(toRecord);
  }

  close(): void {
    this.db.close();
  }
}
