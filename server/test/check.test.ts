import { describe, expect, it } from "vitest";
import { PRIZE_TIERS } from "@powerball/shared";
import { checkHistory, parseTicketQuery } from "../src/check";
import { PARSED } from "./fixtures";

describe("parseTicketQuery", () => {
  it("parses and sorts a valid ticket", () => {
    expect(parseTicketQuery({ whites: "45, 5,12,34,23", pb: "6" })).toEqual({
      ticket: { whites: [5, 12, 23, 34, 45], powerball: 6 },
    });
  });

  it.each([
    [{}, /whites/],
    [{ whites: "1,2,3,4,5" }, /pb/],
    [{ whites: "", pb: "1" }, /whites/],
    [{ whites: ["1,2,3,4,5", "6,7,8,9,10"], pb: "1" }, /whites/], // repeated key
    [{ whites: "1,2,3,4,x", pb: "1" }, /whole numbers/],
    [{ whites: "1,2,3,4,5.5", pb: "1" }, /whole numbers/],
    [{ whites: "1,2,3,4,-5", pb: "1" }, /whole numbers/],
    [{ whites: "1,2,3,4,,5", pb: "1" }, /whole numbers/],
    [{ whites: "1,2,3,4,5", pb: "abc" }, /whole numbers/],
    [{ whites: "1,2,3,4", pb: "1" }, /exactly 5/],
    [{ whites: "1,2,3,4,5,6", pb: "1" }, /exactly 5/],
    [{ whites: "11,11,11,11,11", pb: "1" }, /different/],
    [{ whites: "1,2,3,4,70", pb: "1" }, /1 to 69/],
    [{ whites: "0,2,3,4,5", pb: "1" }, /1 to 69/],
    [{ whites: "1,2,3,4,5", pb: "27" }, /1 to 26/],
    [{ whites: "1,2,3,4,5", pb: "0" }, /1 to 26/],
  ])("rejects %j", (query, message) => {
    const result = parseTicketQuery(query as Record<string, unknown>);
    expect("error" in result && result.error).toMatch(message);
  });
});

describe("checkHistory", () => {
  it("tallies wins by tier and totals", () => {
    // Matches 2015-10-17 exactly (jackpot), 2015-10-10 on 12 only (no prize).
    const r = checkHistory({ whites: [5, 12, 23, 34, 45], powerball: 6 }, PARSED);
    expect(r.ticket).toEqual({ whites: [5, 12, 23, 34, 45], powerball: 6 });
    expect(r.drawCount).toBe(5);
    expect(r.totalSpent).toBe(10);
    expect(r.totalWon).toBe(0);
    expect(r.jackpotDates).toEqual(["2015-10-17"]);
    expect(r.bestWin).toEqual({ tierId: "5+PB", date: "2015-10-17" });
    expect(r.wins.map((w) => w.tierId)).toEqual(PRIZE_TIERS.map((t) => t.id));
    expect(r.wins.find((w) => w.tierId === "5+PB")).toEqual({ tierId: "5+PB", count: 1, prize: "jackpot" });
    expect(r.winHistory).toEqual([{ date: "2015-10-17", tierId: "5+PB" }]);
  });

  it("sums fixed prizes and picks the best tier at its earliest date", () => {
    // PB 1 hits 2015-10-10 and 2015-10-14; 29 and 40 also match 2015-10-14; 29 matches 2015-10-10.
    const r = checkHistory({ whites: [29, 40, 60, 61, 62], powerball: 1 }, PARSED);
    // 2015-10-07: 40 -> 1 white, no PB -> nothing. 2015-10-10: 29 + PB -> 1+PB ($4).
    // 2015-10-14: 29, 40 + PB -> 2+PB ($7).
    expect(r.winHistory).toEqual([
      { date: "2015-10-10", tierId: "1+PB" },
      { date: "2015-10-14", tierId: "2+PB" },
    ]);
    expect(r.totalWon).toBe(11);
    expect(r.bestWin).toEqual({ tierId: "2+PB", date: "2015-10-14" });
    expect(r.jackpotDates).toEqual([]);
  });

  it("returns null bestWin when nothing was won", () => {
    const r = checkHistory({ whites: [60, 61, 62, 63, 64], powerball: 20 }, PARSED);
    expect(r.bestWin).toBeNull();
    expect(r.totalWon).toBe(0);
    expect(r.winHistory).toEqual([]);
    expect(r.wins.every((w) => w.count === 0)).toBe(true);
  });
});
