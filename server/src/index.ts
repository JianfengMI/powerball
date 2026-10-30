import { buildApp } from "./app";
import { liveSource, seedSource } from "./sources";
import { DrawStore } from "./store";

const REFRESH_MS = 6 * 60 * 60 * 1000;
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST ?? "0.0.0.0";

const store = new DrawStore();
const app = await buildApp({ store, logger: { level: process.env.LOG_LEVEL ?? "info" } });
store.log = app.log;

// Initial load: live API first, bundled seed file if that fails.
await store.load([liveSource(), seedSource()]);
if (!store.snapshot) app.log.error("No draw data available; data endpoints will return 503 until a refresh succeeds");

// Periodic refresh from the live API only; a failure keeps the existing data.
const timer = setInterval(() => {
  void store.load([liveSource()]);
}, REFRESH_MS);
timer.unref();

await app.listen({ port, host });

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`${signal} received, shutting down`);
  clearInterval(timer);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  try {
    await app.close();
    store.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
