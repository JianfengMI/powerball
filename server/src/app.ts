import { existsSync } from "node:fs";
import { join } from "node:path";
import compress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyServerOptions } from "fastify";
import type { ApiError, DrawsResponse } from "@powerball/shared";
import { checkHistory, parseTicketQuery } from "./check";
import { isValidDate } from "./parse";
import { WEB_DIST } from "./paths";
import type { DrawStore, Snapshot } from "./store";

export interface AppOptions {
  store: DrawStore;
  /** Built frontend to serve at /. Skipped if it has no index.html. Pass null to disable. */
  webDist?: string | null;
  logger?: FastifyServerOptions["logger"];
}

const STATS_CACHE = "public, max-age=300";

function sendError(reply: FastifyReply, status: number, error: string) {
  const body: ApiError = { error };
  return reply.code(status).header("cache-control", "no-store").send(body);
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const { store } = opts;
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(compress, { global: true });

  app.setErrorHandler((err: { statusCode?: number; message: string }, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    return sendError(reply, status, status >= 500 ? "Internal server error" : err.message);
  });

  /** Returns the current snapshot, or sends 503 if no data has been loaded yet. */
  const requireData = (reply: FastifyReply): Snapshot | null => {
    const snap = store.snapshot;
    if (!snap) sendError(reply, 503, "Draw data is not available yet; try again shortly");
    return snap;
  };

  app.get("/api/draws", async (req, reply) => {
    const query = req.query as Record<string, unknown>;
    const range: { from?: string; to?: string } = {};
    for (const key of ["from", "to"] as const) {
      const value = query[key];
      if (value === undefined || value === "") continue;
      if (typeof value !== "string" || !isValidDate(value)) {
        return sendError(reply, 400, `Query parameter '${key}' must be a date in YYYY-MM-DD format`);
      }
      range[key] = value;
    }
    if (range.from && range.to && range.from > range.to) {
      return sendError(reply, 400, "'from' must not be after 'to'");
    }
    if (!requireData(reply)) return reply;
    const body: DrawsResponse = { draws: store.db.range(range.from, range.to) };
    return reply.header("cache-control", STATS_CACHE).send(body);
  });

  const cached = (path: string, pick: (s: Snapshot) => unknown) =>
    app.get(path, async (_req, reply) => {
      const snap = requireData(reply);
      if (!snap) return reply;
      return reply.header("cache-control", STATS_CACHE).send(pick(snap));
    });
  cached("/api/stats/summary", (s) => s.summary);
  cached("/api/stats/frequency", (s) => s.frequency);
  cached("/api/stats/sums", (s) => s.sums);
  cached("/api/stats/gaps", (s) => s.gaps);

  app.get("/api/check", async (req, reply) => {
    const parsed = parseTicketQuery(req.query as Record<string, unknown>);
    if ("error" in parsed) return sendError(reply, 400, parsed.error);
    const snap = requireData(reply);
    if (!snap) return reply;
    return reply.header("cache-control", STATS_CACHE).send(checkHistory(parsed.ticket, snap.draws));
  });

  const webDist = opts.webDist === undefined ? WEB_DIST : opts.webDist;
  const serveWeb = webDist !== null && existsSync(join(webDist, "index.html"));
  if (serveWeb) {
    await app.register(fastifyStatic, { root: webDist, wildcard: true });
  }

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split("?")[0]!;
    const isApi = path === "/api" || path.startsWith("/api/");
    if (serveWeb && !isApi && (req.method === "GET" || req.method === "HEAD")) {
      // SPA fallback: let the client-side router handle unknown paths.
      return reply.header("cache-control", "no-cache").sendFile("index.html");
    }
    return sendError(reply, 404, `Not found: ${req.method} ${path}`);
  });

  return app;
}
