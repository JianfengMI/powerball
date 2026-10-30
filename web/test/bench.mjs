// Throughput benchmark for the fast simulator: `npm run bench -w web` (Node 22.18+/24, type stripping).
import { FastSimulator } from "../src/lib/fastSim.ts";

const tiers = [
  [5, true], [5, false], [4, true], [4, false], [3, true], [3, false], [2, true], [1, true], [0, true],
].map(([whites, powerball]) => ({ whites, powerball }));

const sim = new FastSimulator({ whites: [3, 14, 27, 41, 59], powerball: 7 }, tiers);
sim.run(2_000_000, false); // warm up
const draws = 50_000_000;
const t0 = performance.now();
sim.run(draws, false);
const secs = (performance.now() - t0) / 1000;
const rate = draws / secs;
console.log(`${(rate / 1e6).toFixed(1)}M draws/s (${draws.toLocaleString()} draws in ${secs.toFixed(2)}s)`);
console.log(`Average jackpot wait (292,201,338 draws) would take ~${(292_201_338 / rate).toFixed(1)}s`);
