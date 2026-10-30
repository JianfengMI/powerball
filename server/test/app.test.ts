import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { FrequencyResponse, GapsResponse, SumsResponse, SummaryResponse } from "@powerball/shared";
import { buildApp } from "../src/app";
import { seedSource, staticSource, type DrawSource } from "../src/sources";
import { DrawStore, type StoreLogger } from "../src/store";
import { BAD_ROWS, PARSED, RAW_ROWS } from "./fixtures";

const silent: StoreLogger = { info() {}, warn() {}, error() {} };
const failing: DrawSource = {
  name: "live",
  load: () => Promise.reject(new Error("network down")),
};

async function makeApp(sources: DrawSource[] = [staticSource([...RAW_ROWS, ...BAD_ROWS], "live")], webDist: string | null = null) {
  const store = new DrawStore({ logger: silent });
  await store.load(sources);
  const app = await buildApp({ store, webDist });
  return { app, store };
}

describe("DrawStore", () => {
  it("falls back to the next source when one fails", async () => {
    const store = new DrawStore({ logger: silent });
    expect(await store.load([failing, staticSource(RAW_ROWS, "seed")])).toBe(true);
    expect(store.snapshot!.summary.source).toBe("seed");
    expect(store.snapshot!.draws).toEqual(PARSED);
  });

  it("keeps existing data when a refresh fails or yields no valid draws", async () => {
    const store = new DrawStore({ logger: silent });
    await store.load([staticSource(RAW_ROWS, "live")]);
    const before = store.snapshot;
    expect(await store.load([failing])).toBe(false);
    expect(await store.load([staticSource(BAD_ROWS.slice(0, -1), "live")])).toBe(false);
    expect(await store.load([staticSource({ not: "an array" }, "live")])).toBe(false);
    expect(store.snapshot).toBe(before);
  });

  it("replaces data on a successful refresh", async () => {
    const store = new DrawStore({ logger: silent });
    await store.load([staticSource(RAW_ROWS.slice(0, 3), "seed")]);
    expect(store.snapshot!.summary.drawCount).toBe(2);
    await store.load([staticSource(RAW_ROWS, "live")]);
    expect(store.snapshot!.summary).toMatchObject({ drawCount: 5, source: "live" });
    expect(store.db.range()).toHaveLength(5);
  });

  it("loads the bundled seed file", async () => {
    const store = new DrawStore({ logger: silent });
    expect(await store.load([seedSource()])).toBe(true);
    expect(store.snapshot!.summary.drawCount).toBeGreaterThanOrEqual(1426);
    expect(store.snapshot!.summary.firstDate).toBe("2015-10-07");
  });
});

describe("API routes", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    ({ app } = await makeApp());
  });
  afterAll(() => app.close());

  const get = (url: string) => app.inject({ method: "GET", url });

  it("GET /api/stats/summary", async () => {
    const res = await get("/api/stats/summary");
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    const body = res.json<SummaryResponse>();
    expect(body).toMatchObject({ drawCount: 5, firstDate: "2015-10-07", lastDate: "2015-10-21", source: "live" });
    expect(new Date(body.lastUpdated).toISOString()).toBe(body.lastUpdated);
  });

  it("GET /api/draws with and without filters", async () => {
    expect((await get("/api/draws")).json()).toEqual({ draws: PARSED });
    expect((await get("/api/draws?from=2015-10-10&to=2015-10-14")).json()).toEqual({ draws: PARSED.slice(1, 3) });
    expect((await get("/api/draws?from=2015-10-15")).json()).toEqual({ draws: PARSED.slice(3) });
    expect((await get("/api/draws?to=2015-10-07")).json()).toEqual({ draws: PARSED.slice(0, 1) });
    expect((await get("/api/draws?from=2030-01-01")).json()).toEqual({ draws: [] });
  });

  it.each([
    "/api/draws?from=2015-10-1",
    "/api/draws?to=yesterday",
    "/api/draws?from=2015-02-30",
    "/api/draws?from=2015-10-14&to=2015-10-10",
    "/api/draws?from=2015-10-10&from=2015-10-11",
  ])("GET %s -> 400", async (url) => {
    const res = await get(url);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty("error");
  });

  it("GET /api/stats/frequency", async () => {
    const body = (await get("/api/stats/frequency")).json<FrequencyResponse>();
    expect(body.drawCount).toBe(5);
    expect(body.whites).toHaveLength(69);
    expect(body.powerballs).toHaveLength(26);
    expect(body.whiteTest.degreesOfFreedom).toBe(68);
  });

  it("GET /api/stats/sums", async () => {
    const body = (await get("/api/stats/sums")).json<SumsResponse>();
    expect(body.theoretical).toHaveLength(321);
    expect(body.theoreticalMean).toBe(175);
    expect(body.observed).toHaveLength(5);
  });

  it("GET /api/stats/gaps", async () => {
    const body = (await get("/api/stats/gaps")).json<GapsResponse>();
    expect(body.whites).toHaveLength(69);
    expect(body.powerballs[25]).toEqual({ number: 26, drawsSinceLast: 0, lastSeen: "2015-10-21", longestGap: 4 });
  });

  it("GET /api/check", async () => {
    const res = await get("/api/check?whites=45,5,12,34,23&pb=6");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticket).toEqual({ whites: [5, 12, 23, 34, 45], powerball: 6 });
    expect(body.jackpotDates).toEqual(["2015-10-17"]);
    expect(body.totalSpent).toBe(10);
  });

  it.each([
    "/api/check",
    "/api/check?whites=1,2,3,4,5",
    "/api/check?whites=11,11,11,11,11&pb=6",
    "/api/check?whites=1,2,3,4,x&pb=6",
    "/api/check?whites=1,2,3,4,99&pb=6",
    "/api/check?whites=1,2,3,4,5&pb=30",
    "/api/check?whites=1,2,3,4,5&pb=1&pb=2",
  ])("GET %s -> 400 ApiError", async (url) => {
    const res = await get(url);
    expect(res.statusCode).toBe(400);
    expect(Object.keys(res.json())).toEqual(["error"]);
  });

  it("unknown /api routes return 404 JSON", async () => {
    for (const url of ["/api/nope", "/api", "/api/stats/unknown"]) {
      const res = await get(url);
      expect(res.statusCode).toBe(404);
      expect(res.json()).toHaveProperty("error");
    }
    expect((await app.inject({ method: "POST", url: "/api/draws" })).statusCode).toBe(404);
  });

  it("non-API routes 404 when there is no built frontend", async () => {
    expect((await get("/")).statusCode).toBe(404);
  });

  it("compresses large responses when asked", async () => {
    const res = await app.inject({ method: "GET", url: "/api/stats/sums", headers: { "accept-encoding": "gzip" } });
    expect(res.headers["content-encoding"]).toBe("gzip");
  });
});

describe("no data loaded", () => {
  it("returns 503 for data endpoints but still validates input", async () => {
    const { app } = await makeApp([failing]);
    expect((await app.inject("/api/stats/summary")).statusCode).toBe(503);
    expect((await app.inject("/api/draws")).statusCode).toBe(503);
    expect((await app.inject("/api/check?whites=1,2,3,4,5&pb=1")).statusCode).toBe(503);
    expect((await app.inject("/api/check?whites=1&pb=1")).statusCode).toBe(400);
    await app.close();
  });
});

describe("static frontend", () => {
  let dir: string;
  let app: FastifyInstance;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "pb-web-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>app</title>");
    writeFileSync(join(dir, "app.js"), "console.log(1)");
    ({ app } = await makeApp(undefined, dir));
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("serves index.html at / and files by path", async () => {
    const root = await app.inject("/");
    expect(root.statusCode).toBe(200);
    expect(root.body).toContain("<title>app</title>");
    expect((await app.inject("/app.js")).body).toBe("console.log(1)");
  });

  it("falls back to index.html for client-side routes but not for /api", async () => {
    const spa = await app.inject("/some/deep/route");
    expect(spa.statusCode).toBe(200);
    expect(spa.headers["content-type"]).toMatch(/text\/html/);
    const api = await app.inject("/api/missing");
    expect(api.statusCode).toBe(404);
    expect(api.json()).toHaveProperty("error");
    expect((await app.inject("/api/stats/summary")).statusCode).toBe(200);
  });
});
