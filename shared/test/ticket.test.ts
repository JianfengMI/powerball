import { describe, expect, it } from "vitest";
import { checkTicket, ticketError, type Ticket } from "../src";

const draw: Ticket = { whites: [11, 13, 16, 47, 60], powerball: 13 };

describe("checkTicket", () => {
  it("finds the jackpot", () => {
    const result = checkTicket({ whites: [60, 47, 16, 13, 11], powerball: 13 }, draw);
    expect(result).toMatchObject({ whiteMatches: 5, powerballMatch: true });
    expect(result.tier?.id).toBe("5+PB");
  });

  it("finds partial matches", () => {
    expect(checkTicket({ whites: [11, 13, 16, 1, 2], powerball: 13 }, draw).tier?.id).toBe("3+PB");
    expect(checkTicket({ whites: [11, 13, 16, 47, 2], powerball: 1 }, draw).tier?.id).toBe("4");
    expect(checkTicket({ whites: [1, 2, 3, 4, 5], powerball: 13 }, draw).tier?.id).toBe("0+PB");
  });

  it("returns no tier for losing tickets", () => {
    expect(checkTicket({ whites: [11, 13, 1, 2, 3], powerball: 1 }, draw)).toEqual({
      whiteMatches: 2,
      powerballMatch: false,
      tier: null,
    });
  });

  it("does not count the Powerball number as a white match", () => {
    expect(checkTicket({ whites: [1, 2, 3, 4, 5], powerball: 11 }, draw).whiteMatches).toBe(0);
  });
});

describe("ticketError", () => {
  it("accepts a valid ticket", () => {
    expect(ticketError({ whites: [1, 2, 3, 4, 69], powerball: 26 })).toBeNull();
  });

  it("rejects invalid tickets", () => {
    expect(ticketError({ whites: [1, 2, 3, 4], powerball: 1 })).toMatch(/exactly 5/);
    expect(ticketError({ whites: [1, 2, 3, 4, 70], powerball: 1 })).toMatch(/1 to 69/);
    expect(ticketError({ whites: [0, 2, 3, 4, 5], powerball: 1 })).toMatch(/1 to 69/);
    expect(ticketError({ whites: [1.5, 2, 3, 4, 5], powerball: 1 })).toMatch(/whole numbers/);
    expect(ticketError({ whites: [1, 1, 3, 4, 5], powerball: 1 })).toMatch(/different/);
    expect(ticketError({ whites: [1, 2, 3, 4, 5], powerball: 27 })).toMatch(/1 to 26/);
  });
});
