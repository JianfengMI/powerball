import { ticketError, type Ticket } from "@powerball/shared";

const KEY = "powerball-odds:ticket";

/** A ticket being edited: whites may have fewer than 5 numbers, Powerball may be unset. */
export interface DraftTicket {
  whites: number[];
  powerball: number | null;
}

export const EMPTY_DRAFT: DraftTicket = { whites: [], powerball: null };

export function asTicket(d: DraftTicket): Ticket | null {
  if (d.powerball === null) return null;
  const t = { whites: [...d.whites].sort((a, b) => a - b), powerball: d.powerball };
  return ticketError(t) ? null : t;
}

export function loadDraft(): DraftTicket {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<DraftTicket>;
    const whites = Array.isArray(parsed.whites)
      ? [...new Set(parsed.whites.filter((n) => Number.isInteger(n) && n >= 1 && n <= 69))].slice(0, 5)
      : [];
    const pb = typeof parsed.powerball === "number" && parsed.powerball >= 1 && parsed.powerball <= 26 ? parsed.powerball : null;
    return { whites, powerball: pb };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(d: DraftTicket): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(d));
  } catch {
    // Private mode / storage disabled: the ticket just won't persist.
  }
}
