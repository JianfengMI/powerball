import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, resolved from this file's location so it does not depend on the cwd. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SEED_PATH = resolve(REPO_ROOT, "data", "draws.json");
export const WEB_DIST = resolve(REPO_ROOT, "web", "dist");
