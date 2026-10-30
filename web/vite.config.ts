import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApiPlugin } from "./dev/mockApi";

// `npm run dev`      -> proxies /api to the real backend on http://localhost:3000.
// `npm run dev:mock` -> answers /api/* from data/draws.json inside the dev server instead.
// The mock is a dev-server-only plugin; the production build always calls the real /api.
export default defineConfig(({ mode }) => {
  const useMock = mode === "mock";
  return {
    plugins: [react(), ...(useMock ? [mockApiPlugin()] : [])],
    server: {
      proxy: useMock ? undefined : { "/api": "http://localhost:3000" },
    },
    preview: {
      proxy: { "/api": "http://localhost:3000" },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    worker: {
      format: "es" as const,
    },
  };
});
