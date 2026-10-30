# Powerball Odds, Explained

An education site about Powerball odds: a guided story that takes your ticket through a simulated draw, the real odds, a "play until you win" simulation, a check against every real draw since 2015, and an analysis of whether any numbers are "hot". See [PLAN.md](PLAN.md) for the design.

## Requirements
Node 22.13 or newer (developed on Node 24).

## Run it locally
```sh
npm install
npm run build   # builds the web app into web/dist
npm start       # serves the app and the API at http://localhost:3000
```

## Develop
Run the API and the web dev server in two terminals:
```sh
npm run dev -w server   # API on http://localhost:3000, restarts on change
npm run dev -w web      # app on http://localhost:5173, proxies /api to :3000
```
To work on the frontend without the backend, use `npm run dev:mock -w web`. It serves a mock API computed from `data/draws.json`.

## Check
```sh
npm test            # all tests (shared, server, web)
npm run typecheck   # all workspaces
```

## Layout
| Folder | Contents |
|---|---|
| `shared/` | Game rules, odds math, fair RNG, ticket checking, and the API contract (`src/api.ts`) |
| `server/` | Fastify API. Loads draws from NY Open Data at startup, falls back to `data/draws.json` |
| `web/` | React + Vite app. The "play until you win" simulator runs in a Web Worker |
| `data/` | Seed copy of all draws since the 2015-10-07 rule change |

Data source: [NY Open Data, Lottery Powerball Winning Numbers](https://data.ny.gov/d/d6yy-54nr). Only draws from 2015-10-07 onward are used, because earlier draws had a different number range.
