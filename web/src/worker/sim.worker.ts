// Web Worker: plays the user's ticket against simulated draws until the jackpot.
import { PRIZE_TIERS, TIER_ODDS } from "@powerball/shared";
import { FastSimulator } from "../lib/fastSim";
import { cryptoUniform, fastForwardToJackpot } from "../lib/fastForward";
import type { SimProgress, ToWorker } from "./protocol";

// The project's TS program uses the DOM lib, so describe the worker scope we need locally
// instead of pulling in the conflicting "WebWorker" lib.
interface WorkerScope {
  postMessage(message: SimProgress): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
}
const scope = globalThis as unknown as WorkerScope;

const REPORT_MS = 100;
const BATCH = 250_000;
const JACKPOT_INDEX = PRIZE_TIERS.findIndex((t) => t.prize === "jackpot");
const TIER_PROBS = TIER_ODDS.map((t) => t.probability);

let sim: FastSimulator | null = null;
let running = false;
let done = false;
let extraTickets = 0; // fast-forwarded
let extraCounts = PRIZE_TIERS.map(() => 0);
let elapsedMs = 0;
let lastRate = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const uniform = cryptoUniform();

function report() {
  const live = sim?.tickets ?? 0;
  const counts = PRIZE_TIERS.map((_, i) => (sim?.tierCounts[i] ?? 0) + extraCounts[i]!);
  scope.postMessage({
    type: "progress",
    tickets: live + extraTickets,
    liveTickets: live,
    fastForwardTickets: extraTickets,
    tierCounts: counts,
    running,
    done,
    rate: lastRate,
    elapsedMs,
  });
}

function tick() {
  timer = null;
  if (!sim || !running || done) return;
  const start = performance.now();
  let n = 0;
  while (performance.now() - start < REPORT_MS) {
    n += sim.run(BATCH, true);
    if (sim.jackpotHit) {
      done = true;
      running = false;
      break;
    }
  }
  const dt = performance.now() - start;
  elapsedMs += dt;
  lastRate = dt > 0 ? (n / dt) * 1000 : 0;
  report();
  if (running) timer = setTimeout(tick, 0); // yield so pause/reset messages get through
}

function stopTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

scope.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "start":
      stopTimer();
      sim = new FastSimulator(msg.ticket, PRIZE_TIERS);
      extraTickets = 0;
      extraCounts = PRIZE_TIERS.map(() => 0);
      elapsedMs = 0;
      lastRate = 0;
      done = false;
      running = true;
      report();
      tick();
      break;
    case "pause":
      running = false;
      stopTimer();
      report();
      break;
    case "resume":
      if (sim && !done && !running) {
        running = true;
        tick();
      }
      break;
    case "reset":
      stopTimer();
      sim = null;
      running = false;
      done = false;
      extraTickets = 0;
      extraCounts = PRIZE_TIERS.map(() => 0);
      elapsedMs = 0;
      lastRate = 0;
      report();
      break;
    case "fastForward": {
      if (!sim || done) break;
      stopTimer();
      // Memoryless: the remaining wait is Geometric regardless of how long we've played.
      const ff = fastForwardToJackpot(TIER_PROBS, JACKPOT_INDEX, uniform);
      extraTickets += ff.tickets;
      ff.tierCounts.forEach((c, i) => (extraCounts[i]! += c));
      running = false;
      done = true;
      report();
      break;
    }
  }
};
