import { RULES_START_DATE, ticketError, type DrawRecord } from "@powerball/shared";

export interface SkippedRow {
  index: number;
  reason: string;
}

export interface ParseResult {
  /** Valid draws on/after the start date, sorted oldest first, whites sorted ascending. */
  draws: DrawRecord[];
  /** Rows rejected as malformed or duplicate. */
  skipped: SkippedRow[];
  /** Valid rows dropped because they predate the start date (old 59/35 rules). */
  beforeStart: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True if `s` is a real calendar date in YYYY-MM-DD form. */
export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Parses one raw NY Open Data row. Returns the draw, or a string describing why it is invalid. */
export function parseDrawRow(row: unknown): DrawRecord | string {
  if (typeof row !== "object" || row === null) return "row is not an object";
  const { draw_date, winning_numbers } = row as Record<string, unknown>;
  if (typeof draw_date !== "string") return "missing draw_date";
  if (typeof winning_numbers !== "string") return "missing winning_numbers";

  const date = draw_date.slice(0, 10);
  if (!isValidDate(date)) return `invalid draw_date "${draw_date}"`;

  const tokens = winning_numbers.trim().split(/\s+/);
  if (tokens.length !== 6) return `expected 6 numbers, got ${tokens.length} in "${winning_numbers}"`;
  if (tokens.some((t) => !/^\d{1,2}$/.test(t))) return `non-numeric value in "${winning_numbers}"`;
  const nums = tokens.map(Number);
  const whites = nums.slice(0, 5).sort((a, b) => a - b);
  const powerball = nums[5]!;

  const error = ticketError({ whites, powerball });
  if (error) return `${error} ("${winning_numbers}")`;
  return { date, whites, powerball };
}

/** Parses and validates a list of raw rows. Never throws on bad rows; they are reported in `skipped`. */
export function parseDraws(rows: unknown, startDate: string = RULES_START_DATE): ParseResult {
  if (!Array.isArray(rows)) throw new TypeError("draw data is not an array");
  const byDate = new Map<string, DrawRecord>();
  const skipped: SkippedRow[] = [];
  let beforeStart = 0;

  rows.forEach((row, index) => {
    const result = parseDrawRow(row);
    if (typeof result === "string") {
      skipped.push({ index, reason: result });
    } else if (result.date < startDate) {
      beforeStart++;
    } else if (byDate.has(result.date)) {
      skipped.push({ index, reason: `duplicate date ${result.date}` });
    } else {
      byDate.set(result.date, result);
    }
  });

  const draws = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { draws, skipped, beforeStart };
}
