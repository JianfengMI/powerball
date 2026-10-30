// DEV ONLY: a stand-in for the real backend so the frontend can be developed without it.
// Enabled by `npm run dev:mock` (vite --mode mock). Never part of the production build.
// Answers the /api/* endpoints from data/draws.json, following shared/src/api.ts.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
// Relative import (not "@powerball/shared") so Vite bundles it into the config.
import {
  checkTicket,
  chiSquareUniformTest,
  sumDistribution,
  PRIZE_TIERS,
  RULES_START_DATE,
  TICKET_PRICE,
  ticketError,
  type DrawRecord,
  type GapInfo,
  type NumberFrequency,
} from "../../shared/src/index";

interface RawDraw {
  draw_date: string;
  winning_numbers: string;
}

export function parseRawDraws(raw: RawDraw[]): DrawRecord[] {
  return raw
    .map((r) => {
      const nums = r.winning_numbers.trim().split(/\s+/).map(Number);
      return {
        date: r.draw_date.slice(0, 10),
        whites: nums.slice(0, 5).sort((a, b) => a - b),
        powerball: nums[5]!,
      };
    })
    .filter((d) => d.date >= RULES_START_DATE)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function frequency(draws: DrawRecord[]) {
  const w = new Array<number>(70).fill(0);
  const p = new Array<number>(27).fill(0);
  for (const d of draws) {
    d.whites.forEach((n) => w[n]!++);
    p[d.powerball]!++;
  }
  const make = (counts: number[], max: number, expected: number): NumberFrequency[] =>
    Array.from({ length: max }, (_, i) => ({ number: i + 1, count: counts[i + 1]!, expected }));
  const whites = make(w, 69, (draws.length * 5) / 69);
  const powerballs = make(p, 26, draws.length / 26);
  return { drawCount: draws.length, whites, powerballs, whiteTest: chiSquareUniformTest(w.slice(1), 5), powerballTest: chiSquareUniformTest(p.slice(1)) };
}

function sums(draws: DrawRecord[]) {
  const counts = new Map<number, number>();
  let total = 0;
  for (const d of draws) {
    const s = d.whites.reduce((a, b) => a + b, 0);
    total += s;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return {
    drawCount: draws.length,
    observed: [...counts].sort((a, b) => a[0] - b[0]).map(([sum, count]) => ({ sum, count })),
    theoretical: sumDistribution(),
    observedMean: total / draws.length,
    theoreticalMean: 175,
  };
}

function gaps(draws: DrawRecord[]) {
  const info = (max: number, has: (d: DrawRecord, n: number) => boolean): GapInfo[] =>
    Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      let last = -1;
      let longest = 0;
      let run = 0;
      draws.forEach((d, idx) => {
        if (has(d, n)) {
          last = idx;
          run = 0;
        } else {
          run++;
          longest = Math.max(longest, run);
        }
      });
      return {
        number: n,
        drawsSinceLast: last < 0 ? null : draws.length - 1 - last,
        lastSeen: last < 0 ? null : draws[last]!.date,
        longestGap: longest,
      };
    });
  return {
    drawCount: draws.length,
    whites: info(69, (d, n) => d.whites.includes(n)),
    powerballs: info(26, (d, n) => d.powerball === n),
  };
}

function check(draws: DrawRecord[], whitesParam: string | null, pbParam: string | null) {
  const ticket = {
    whites: (whitesParam ?? "").split(",").map(Number).sort((a, b) => a - b),
    powerball: Number(pbParam),
  };
  const err = ticketError(ticket);
  if (err) return { status: 400, body: { error: err } };
  const counts = PRIZE_TIERS.map(() => 0);
  let totalWon = 0;
  const jackpotDates: string[] = [];
  const winHistory: { date: string; tierId: string }[] = [];
  let best: { tierId: string; date: string; rank: number } | null = null;
  for (const d of draws) {
    const { tier } = checkTicket(ticket, d);
    if (!tier) continue;
    const rank = PRIZE_TIERS.indexOf(tier);
    counts[rank]!++;
    winHistory.push({ date: d.date, tierId: tier.id });
    if (tier.prize === "jackpot") jackpotDates.push(d.date);
    else totalWon += tier.prize;
    if (!best || rank < best.rank) best = { tierId: tier.id, date: d.date, rank };
  }
  return {
    status: 200,
    body: {
      drawCount: draws.length,
      totalSpent: draws.length * TICKET_PRICE,
      totalWon,
      wins: PRIZE_TIERS.map((t, i) => ({ tierId: t.id, count: counts[i]!, prize: t.prize })),
      jackpotDates,
      bestWin: best ? { tierId: best.tierId, date: best.date } : null,
      ticket,
      winHistory,
    },
  };
}

export function mockApiPlugin(): Plugin {
  const file = fileURLToPath(new URL("../../data/draws.json", import.meta.url));
  const loadedAt = new Date().toISOString();
  let draws: DrawRecord[] | null = null;
  const getDraws = () => (draws ??= parseRawDraws(JSON.parse(readFileSync(file, "utf8")) as RawDraw[]));

  return {
    name: "powerball-mock-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const url = new URL(req.url, "http://localhost");
        const all = getDraws();
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          // Simulate a little network latency so loading states are visible.
          setTimeout(() => res.end(JSON.stringify(body)), 250);
        };
        switch (url.pathname) {
          case "/api/stats/summary":
            return send(200, {
              drawCount: all.length,
              firstDate: all[0]?.date,
              lastDate: all.at(-1)?.date,
              lastUpdated: loadedAt,
              source: "seed",
            });
          case "/api/stats/frequency":
            return send(200, frequency(all));
          case "/api/stats/sums":
            return send(200, sums(all));
          case "/api/stats/gaps":
            return send(200, gaps(all));
          case "/api/draws": {
            const from = url.searchParams.get("from") ?? "0000";
            const to = url.searchParams.get("to") ?? "9999";
            return send(200, { draws: all.filter((d) => d.date >= from && d.date <= to) });
          }
          case "/api/check": {
            const r = check(all, url.searchParams.get("whites"), url.searchParams.get("pb"));
            return send(r.status, r.body);
          }
          default:
            return send(404, { error: "Not found" });
        }
      });
    },
  };
}
