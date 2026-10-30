# Powerball Odds & Education Tool — Plan

## Status (2026-10-30)
M1–M5 are complete and the site runs locally (`npm run build && npm start`, see README.md). Deployment to Render is deferred by decision: `render.yaml` is ready, but there is no GitHub remote yet.

Possible follow-ups:
- Number-grid buttons are 32px on phones. That passes WCAG 2.2 AA (24px) but is below the 44px platform guideline.
- Not yet tested with a screen reader.
- Deploy: push to GitHub, connect Render, and check Render's current free-tier limits first.
- The ML "can't beat chance" demo (see Later ideas).

## Goal
An educational website that answers three questions:
1. **What are the odds, really?** The math behind them, made intuitive.
2. **What happens if I play?** Simulations of money spent vs. won over time.
3. **Do real draws show patterns?** Analysis of historical results showing they match pure randomness.

## Decisions
| Topic | Decision |
|---|---|
| Backend | Real Node API server: Node + Fastify + TypeScript |
| Frontend | React + Vite + TypeScript, Chart.js, plain CSS |
| Analysis depth | Simple stats only (frequency + chi-square, sums, gaps). ML "can't beat chance" demo is a possible later extra. |
| Hosting | One Node server serving both API and built frontend, on Render free tier |

## Architecture

```
NY Open Data API ──(refresh on startup + every few hours)──► Node server (Fastify)
                                                               ├── /api/*  JSON stats & draws
                                                               ├── SQLite (rebuilt at startup)
                                                               └── serves built React app
                                                                        │
                                                         Browser: React SPA + Web Worker (simulations)
```

**Split of work:** the backend owns the **real data** and its statistics. The frontend owns the **simulations**, running them in the browser so they respond instantly and cost no server time.

## Frontend

**Principle:** make people *feel* the odds, not just read them.

### Structure: one guided story
A single guided scroll instead of separate tabs. The user's numbers carry through every step, so the whole story is about *their* ticket.

| Step | What it does | What it teaches |
|---|---|---|
| 1. Pick your numbers | Pick 5 white + 1 Powerball, or quick pick. Saved for the rest of the story | How the game works |
| 2. Watch the draw | Animated draw against your ticket, shows which prize tier you hit | What a "match" means |
| 3. See the odds | Table of all 9 prize tiers with the combinatorics shown step by step, plus comparisons ("1 in 292M is like picking one second out of 9.3 years") | Why the odds are so long |
| 4. Play until you win | One button: the browser buys tickets as fast as it can (millions per second in a Web Worker) until it hits the jackpot. Live counters: tickets bought, money spent, years of real-life play. At one ticket per draw, three draws a week, the average win takes about **1.9 million years** | The odds, felt rather than read |
| 5. Your numbers vs. history | Your ticket checked against every real draw since 2015, e.g. *"If you'd played these every draw, you'd have spent $2,852 and won $16"* | Real money, real results |
| 6. Is anything "hot"? | Real draw analysis: frequency charts with the expected-value line, hot/cold, sum distribution, gaps. Then the **hot number trap**: *"Want to bet on them?"* simulates the next 1,000 draws with the hot numbers vs. random ones, and both do the same | Patterns are noise; the gambler's fallacy, shown live |
| 7. Myths | Short cards: "due" numbers, birthdays, quick pick vs. own picks, "this number is hot" | Common misconceptions |

Every chart gets a plain-English "what this means" caption.

### Extras (M5, if time allows)
- **"Spot the real draw" game:** six sets of numbers, some real draws and some picked by people to "look random." Players guess which are real. Humans avoid consecutive numbers and repeated tens, so people usually guess wrong. Teaches what randomness really looks like.
- **Making 292 million visible:** a zoomable dot grid. Start at 100 dots and zoom out (10K, 1M, 292M) while the one winning dot disappears.
- **Shareable result card:** e.g. *"I'd need 1.9 million years to win."*

### Look and feel
- Lottery-ball visuals with a dark theme, like a TV draw studio. The red Powerball is the accent color.
- Animations respect the "reduced motion" accessibility setting.
- Mobile-first layout.

## Backend

**Endpoints**
- `GET /api/draws?from=&to=`: raw draws
- `GET /api/stats/frequency`: white ball and Powerball counts, expected counts, chi-square test with p-value
- `GET /api/stats/sums`: distribution of the five white balls' sum, real vs. theoretical
- `GET /api/stats/gaps`: draws since each number last appeared
- `GET /api/stats/summary`: total draw count, date range, last update time
- `GET /api/check?whites=1,2,3,4,5&pb=6`: checks a ticket against every real draw; returns total spent, total won, and wins by tier (for story step 5)

**Data refresh:** at startup, then every few hours while the server is running. New draws come out Mon/Wed/Sat. Stats are computed once per refresh and cached, not on every request.

## Data layer
- **Source:** NY Open Data, dataset `d6yy-54nr` (`https://data.ny.gov/resource/d6yy-54nr.json`). Tested and working.
- **Rule-change filter:** only draws from **2015-10-07 onward** (69 white / 26 red). Earlier draws used 59 / 35 and would skew frequencies.
- **Storage:** SQLite, `draws` table (date, w1–w5, pb). About 1,500 rows.
- **Seed file:** `data/draws.json` (1,426 draws already downloaded), used if the API is unavailable at startup.
- **Checks:** whites unique and in 1–69, Powerball in 1–26, no duplicate dates.

## Shared core (`/shared`)
One TypeScript module used by both frontend and backend:
- Odds math: combinations and the probability of each tier
- Prize table and the logic for checking a ticket against a draw
- Fair RNG: `crypto.getRandomValues` with a Fisher–Yates shuffle

## Testing
- **Unit tests (Vitest):** odds match the official published numbers (jackpot odds of exactly 1 in 292,201,338), tier matching, RNG range and uniqueness.
- **Statistical sanity check:** 1M simulated draws produce uniform frequencies.
- **API tests:** endpoints tested against a fixed test dataset.

## Hosting (Render free tier)
- One web service, auto-deployed on every push to GitHub.
- **Sleeps after about 15 minutes idle,** so the first visit after that takes 30–60 seconds. Acceptable for now; the paid plan (about $7/month) removes it.
- **Disk is wiped on every restart or redeploy,** so SQLite is rebuilt from the API (or the seed file) at startup.
- No paid cron job; the server refreshes itself.
- Check Render's current pricing and free-tier limits before deploying.

## Milestones
1. **M1:** project setup, shared odds module, tests
2. **M2:** guided-story layout and steps 1–4 (pick, draw, odds, play until you win), which need no backend
3. **M3:** data loading, backend API, stats, ticket check endpoint
4. **M4:** steps 5–7 (your numbers vs. history, hot number trap and analysis, myths)
5. **M5:** polish (mobile, dark mode, accessibility), extras if time allows (spot the real draw, dot grid, share card), deploy to Render

## Later ideas
- ML demo: train a model on past draws and show it does no better than chance.
