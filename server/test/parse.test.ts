import { describe, expect, it } from "vitest";
import { isValidDate, parseDrawRow, parseDraws } from "../src/parse";
import { BAD_ROWS, PARSED, RAW_ROWS } from "./fixtures";

describe("isValidDate", () => {
  it("accepts real dates", () => {
    expect(isValidDate("2015-10-07")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
  });
  it("rejects malformed or impossible dates", () => {
    for (const s of ["2015-10-7", "20151007", "2015-13-01", "2023-02-29", "2015-10-07T00:00", "", "abcd-ef-gh"]) {
      expect(isValidDate(s)).toBe(false);
    }
  });
});

describe("parseDrawRow", () => {
  it("parses a row, sorting whites and trimming the date", () => {
    expect(parseDrawRow({ draw_date: "2015-10-21T00:00:00.000", winning_numbers: "69 01 02 03 04 26" })).toEqual({
      date: "2015-10-21",
      whites: [1, 2, 3, 4, 69],
      powerball: 26,
    });
  });
  it("tolerates extra whitespace", () => {
    expect(parseDrawRow({ draw_date: "2016-01-01T00:00:00.000", winning_numbers: " 1  2 3 4 5   6 " })).toEqual({
      date: "2016-01-01",
      whites: [1, 2, 3, 4, 5],
      powerball: 6,
    });
  });
  it("returns a reason string for every bad row", () => {
    for (const row of BAD_ROWS.slice(0, -1)) {
      expect(typeof parseDrawRow(row), JSON.stringify(row)).toBe("string");
    }
  });
});

describe("parseDraws", () => {
  it("parses good rows and filters draws before the rule change", () => {
    const result = parseDraws(RAW_ROWS);
    expect(result.draws).toEqual(PARSED);
    expect(result.beforeStart).toBe(1);
    expect(result.skipped).toEqual([]);
  });

  it("skips bad rows and duplicates without throwing", () => {
    const result = parseDraws([...RAW_ROWS, ...BAD_ROWS]);
    expect(result.draws).toEqual(PARSED);
    expect(result.skipped).toHaveLength(BAD_ROWS.length);
    expect(result.skipped.at(-1)!.reason).toMatch(/duplicate date 2015-10-07/);
  });

  it("sorts draws by date regardless of input order", () => {
    const result = parseDraws([...RAW_ROWS].reverse());
    expect(result.draws.map((d) => d.date)).toEqual(PARSED.map((d) => d.date));
  });

  it("throws only if the payload is not an array", () => {
    expect(() => parseDraws({ error: "oops" })).toThrow(TypeError);
  });
});
