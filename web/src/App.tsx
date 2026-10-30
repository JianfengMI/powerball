import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { quickPick } from "@powerball/shared";
import { Loading, Step } from "./components/common";
import { StepNav } from "./components/StepNav";
import { DotGrid } from "./extras/DotGrid";
import { ShareCard } from "./extras/ShareCard";
import { SpotTheReal } from "./extras/SpotTheReal";
import type { SummaryResponse } from "@powerball/shared";
import { api, useApi, type ApiState } from "./lib/api";
import { formatDate, formatInt, type RunStory } from "./lib/format";
import { asTicket, loadDraft, saveDraft, type DraftTicket } from "./lib/storage";
import { Myths } from "./steps/Myths";
import { Odds } from "./steps/Odds";
import { PickNumbers } from "./steps/PickNumbers";
import { PlayUntilWin } from "./steps/PlayUntilWin";
import { WatchDraw } from "./steps/WatchDraw";

// Steps 5 and 6 are the only users of Chart.js, so they load in a separate chunk.
const History = lazy(() => import("./steps/History").then((m) => ({ default: m.History })));
const HotNumbers = lazy(() => import("./steps/HotNumbers").then((m) => ({ default: m.HotNumbers })));

/** Stands in for a lazy step while it loads, keeping its #step-N anchor in place for the nav. */
function StepPlaceholder({ n, title }: { n: number; title: string }) {
  return (
    <Step n={n} title={title}>
      <Loading what="this step" />
    </Step>
  );
}

function DataSource({ summary }: { summary: ApiState<SummaryResponse> }) {
  if (summary.error) {
    return (
      <p className="data-source">
        Real draw data is unavailable right now.{" "}
        <button type="button" className="link-btn" onClick={summary.retry}>
          Retry
        </button>
      </p>
    );
  }
  if (!summary.data) return <p className="data-source">Loading data source…</p>;
  const d = summary.data;
  return (
    <p className="data-source">
      Draw data: {formatInt(d.drawCount)} draws from {formatDate(d.firstDate)} to {formatDate(d.lastDate)}, from{" "}
      {d.source === "live" ? "NY Open Data (data.ny.gov)" : "a bundled copy of NY Open Data (the live feed was unavailable)"}.
      Last updated {formatDate(d.lastUpdated)}.
    </p>
  );
}

export function App() {
  const [draft, setDraftState] = useState<DraftTicket>(loadDraft);
  const [story, setStory] = useState<RunStory | null>(null);
  const ticket = useMemo(() => asTicket(draft), [draft]);
  const summary = useApi("summary", (s) => api.summary(s));

  const setDraft = useCallback((d: DraftTicket) => setDraftState(d), []);
  const doQuickPick = useCallback(() => {
    const t = quickPick();
    setDraftState({ whites: t.whites, powerball: t.powerball });
  }, []);

  useEffect(() => saveDraft(draft), [draft]);

  return (
    <>
      <a className="skip-link" href="#step-1">
        Skip to the story
      </a>
      <header className="hero">
        <div className="hero__balls" aria-hidden="true">
          {[7, 19, 33, 48, 62].map((n) => (
            <span key={n} className="ball ball--white ball--lg">
              {n}
            </span>
          ))}
          <span className="ball ball--red ball--lg">11</span>
        </div>
        <h1>Powerball odds, explained</h1>
        <p className="hero__lead">
          Pick a ticket and follow it through seven steps: the draw, the math, a lifetime of play, and every real draw since
          2015. This is an education tool, not a tip sheet. No strategy can change the odds.
        </p>
      </header>

      <StepNav />

      <main>
        <PickNumbers draft={draft} setDraft={setDraft} onQuickPick={doQuickPick} />
        <WatchDraw ticket={ticket} onQuickPick={doQuickPick} />
        <Odds />
        <PlayUntilWin ticket={ticket} onQuickPick={doQuickPick} onResult={setStory} />
        <Suspense fallback={<StepPlaceholder n={5} title="Your numbers vs. history" />}>
          <History ticket={ticket} onQuickPick={doQuickPick} firstDate={summary.data?.firstDate} />
        </Suspense>
        <Suspense fallback={<StepPlaceholder n={6} title='Is anything "hot"?' />}>
          <HotNumbers />
        </Suspense>
        <Myths />
        <Step n="extras" title="Extras" lead="A few more ways to feel the odds.">
          <SpotTheReal />
          <DotGrid />
          <ShareCard ticket={ticket} story={story} />
        </Step>
      </main>

      <footer className="footer">
        <DataSource summary={summary} />
        <p>
          This site is for education. The lottery is entertainment with a negative expected return; please never play
          money you can't afford to lose. If gambling is causing problems for you or someone you know, call or text{" "}
          <a href="tel:18004262537">1-800-GAMBLER</a> (US, free and confidential, 24/7).
        </p>
        <p className="muted small">Not affiliated with Powerball or any lottery. Prize amounts exclude Power Play and taxes.</p>
      </footer>
    </>
  );
}
