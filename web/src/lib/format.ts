import { PRIZE_TIERS, TICKET_PRICE, type Prize } from "@powerball/shared";

/** Three draws a week (Mon/Wed/Sat), averaged over a year of 365.25 days. */
export const DRAWS_PER_YEAR = (3 * 365.25) / 7;

export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatMoney(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 1_900_000 -> "1.9 million"; 3_500 -> "3,500". */
export function formatLarge(n: number, digits = 1): string {
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
  ];
  for (const [size, word] of units) {
    if (abs >= size) return `${trim((n / size).toFixed(digits))} ${word}`;
  }
  return formatInt(n);
}

function trim(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Odds as "1 in N" with sensible rounding (24.87 stays decimal, 913,129 is an integer). */
export function formatOneIn(oneIn: number): string {
  if (oneIn < 100) return `1 in ${oneIn.toFixed(2)}`;
  return `1 in ${formatInt(oneIn)}`;
}

export function formatPrize(prize: Prize): string {
  return prize === "jackpot" ? "Jackpot" : formatMoney(prize);
}

export function yearsForTickets(tickets: number): number {
  return tickets / DRAWS_PER_YEAR;
}

export function formatYears(years: number): string {
  if (years < 1) {
    const weeks = years * 52.1775;
    if (weeks < 1) return "less than a week";
    return `${trim(weeks.toFixed(0))} week${Math.round(weeks) === 1 ? "" : "s"}`;
  }
  if (years < 1e6) return `${formatInt(years)} year${Math.round(years) === 1 ? "" : "s"}`;
  return `${formatLarge(years)} years`;
}

/** Total fixed-prize winnings for per-tier counts (jackpot excluded: its amount varies). */
export function fixedWinnings(tierCounts: ArrayLike<number>): number {
  let total = 0;
  PRIZE_TIERS.forEach((t, i) => {
    if (t.prize !== "jackpot") total += (tierCounts[i] ?? 0) * t.prize;
  });
  return total;
}

export interface RunStory {
  tickets: number;
  spent: number;
  won: number;
  years: number;
}

export function runStory(tickets: number, tierCounts: ArrayLike<number>): RunStory {
  return {
    tickets,
    spent: tickets * TICKET_PRICE,
    won: fixedWinnings(tierCounts),
    years: yearsForTickets(tickets),
  };
}

/** "It took 312,456,789 tickets, $624,913,578 spent, $98,765,432 won, ~2 million years." */
export function storySentence(s: RunStory): string {
  return (
    `It took ${formatInt(s.tickets)} tickets, ${formatMoney(s.spent)} spent, ` +
    `${formatMoney(s.won)} won back in smaller prizes (not counting the jackpot), ` +
    `about ${formatYears(s.years)} of playing one ticket every draw.`
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatPValue(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(p < 0.01 ? 3 : 2);
}
