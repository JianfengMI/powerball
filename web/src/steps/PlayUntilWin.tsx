import { useEffect, useRef, useState } from "react";
import { PRIZE_TIERS, TICKET_PRICE, TOTAL_COMBINATIONS, type Ticket } from "@powerball/shared";
import { NeedTicket, Step, TicketBalls } from "../components/common";
import { formatInt, formatLarge, formatMoney, formatYears, runStory, storySentence, yearsForTickets, type RunStory } from "../lib/format";
import type { SimProgress, ToWorker } from "../worker/protocol";

const AVERAGE_YEARS = yearsForTickets(TOTAL_COMBINATIONS);

export function PlayUntilWin({
  ticket,
  onQuickPick,
  onResult,
}: {
  ticket: Ticket | null;
  onQuickPick: () => void;
  onResult: (story: RunStory | null) => void;
}) {
  const worker = useRef<Worker | null>(null);
  const [progress, setProgress] = useState<SimProgress | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const lastAnnounce = useRef(0);
  const ticketKey = ticket ? `${ticket.whites.join(",")}|${ticket.powerball}` : "";
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let w: Worker;
    try {
      w = new Worker(new URL("../worker/sim.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setWorkerError("Your browser couldn't start the background simulator (Web Workers are unavailable).");
      return;
    }
    worker.current = w;
    w.onmessage = (e: MessageEvent<SimProgress>) => {
      const p = e.data;
      setProgress(p);
      const now = Date.now();
      if (p.done) {
        const story = runStory(p.tickets, p.tierCounts);
        setAnnouncement(`Jackpot! ${storySentence(story)}`);
        onResultRef.current(story);
      } else if (p.running && now - lastAnnounce.current > 8000) {
        lastAnnounce.current = now;
        setAnnouncement(`${formatLarge(p.tickets)} tickets bought so far, about ${formatYears(yearsForTickets(p.tickets))} of play.`);
      } else if (!p.running && p.tickets > 0) {
        setAnnouncement(`Paused at ${formatInt(p.tickets)} tickets.`);
      }
    };
    w.onerror = () => setWorkerError("The background simulator stopped unexpectedly. Try reloading the page.");
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, []);

  // A new ticket resets the run.
  useEffect(() => {
    worker.current?.postMessage({ type: "reset" } satisfies ToWorker);
    setProgress(null);
    onResultRef.current(null);
  }, [ticketKey]);

  const send = (m: ToWorker) => worker.current?.postMessage(m);

  if (!ticket) {
    return (
      <Step n={4} title="Play until you win" lead="Your computer buys tickets as fast as it can until it hits the jackpot.">
        <NeedTicket onPick={onQuickPick} />
      </Step>
    );
  }

  const p = progress;
  const started = !!p && p.tickets > 0;
  const story = p ? runStory(p.tickets, p.tierCounts) : null;
  const pctOfAverage = p ? (p.tickets / TOTAL_COMBINATIONS) * 100 : 0;
  const mode = !p || !started ? null : p.fastForwardTickets > 0 ? "ff" : "live";

  return (
    <Step
      n={4}
      title="Play until you win"
      lead={
        <>
          Same ticket, every draw, until it hits the jackpot. Your browser buys tickets millions of times a second, each one a
          real random draw checked against your numbers. At one ticket per draw and three draws a week, the average wait is{" "}
          <strong>{formatYears(AVERAGE_YEARS)}</strong>.
        </>
      }
    >
      <div className="sim">
        <div className="sim__ticket">
          <TicketBalls ticket={ticket} size="sm" />
        </div>
        {workerError && (
          <p className="notice notice--error" role="alert">
            {workerError}
          </p>
        )}

        <div className="btn-row">
          {!started || p?.done ? (
            <button type="button" className="btn btn--accent" onClick={() => send({ type: "start", ticket })} disabled={!!workerError}>
              {p?.done ? "Play again" : "Start buying tickets"}
            </button>
          ) : p?.running ? (
            <button type="button" className="btn btn--accent" onClick={() => send({ type: "pause" })}>
              Pause
            </button>
          ) : (
            <button type="button" className="btn btn--accent" onClick={() => send({ type: "resume" })}>
              Resume
            </button>
          )}
          {started && !p?.done && (
            <button type="button" className="btn" onClick={() => send({ type: "fastForward" })}>
              Fast-forward to the jackpot
            </button>
          )}
          {started && (
            <button type="button" className="btn btn--ghost" onClick={() => send({ type: "reset" })}>
              Reset
            </button>
          )}
        </div>

        {mode && (
          <p className={`mode-badge mode-badge--${mode}`}>
            {mode === "live" ? (
              <>
                <strong>Live simulation:</strong> every ticket is an actual random draw.
                {p && p.rate > 0 && p.running ? ` ${formatLarge(p.rate)} tickets per second.` : ""}
              </>
            ) : (
              <>
                <strong>Fast-forwarded:</strong> the first {formatInt(p!.liveTickets)} tickets were simulated draw by draw; the
                last {formatInt(p!.fastForwardTickets)} were computed statistically (exact probabilities, sampled in one step).
              </>
            )}
          </p>
        )}

        <dl className="stats-grid" aria-live="off">
          <div>
            <dt>Tickets bought</dt>
            <dd>{formatInt(p?.tickets ?? 0)}</dd>
          </div>
          <div>
            <dt>Money spent</dt>
            <dd>{formatMoney((p?.tickets ?? 0) * TICKET_PRICE)}</dd>
          </div>
          <div>
            <dt>Won back (smaller prizes)</dt>
            <dd>{formatMoney(story?.won ?? 0)}</dd>
          </div>
          <div>
            <dt>Years of real-life play</dt>
            <dd>{formatYears(story?.years ?? 0)}</dd>
          </div>
        </dl>

        <div className="meter" aria-hidden="true">
          <div className="meter__fill" style={{ width: `${Math.min(100, pctOfAverage)}%` }} />
        </div>
        <p className="small muted">
          {pctOfAverage.toFixed(1)}% of the average wait ({formatLarge(TOTAL_COMBINATIONS)} tickets). Unlucky runs can take
          two or three times as long; the machine has no memory, so the remaining wait never shrinks.
        </p>

        {p && started && (
          <details className="tier-details">
            <summary>Wins by prize tier</summary>
            <div className="table-wrap">
              <table className="compact">
                <thead>
                  <tr>
                    <th scope="col">Tier</th>
                    <th scope="col">Times won</th>
                    <th scope="col">Prize money</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIZE_TIERS.map((t, i) => (
                    <tr key={t.id}>
                      <th scope="row">{t.label}</th>
                      <td>{formatInt(p.tierCounts[i] ?? 0)}</td>
                      <td>{t.prize === "jackpot" ? (p.tierCounts[i] ? "Jackpot!" : "—") : formatMoney((p.tierCounts[i] ?? 0) * t.prize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {p?.done && story && (
          <div className="story-result">
            <h3>Jackpot!</h3>
            <p className="big">{storySentence(story)}</p>
            <p>
              You lost <strong>{formatMoney(story.spent - story.won)}</strong> before the jackpot paid out. For the jackpot to
              have made this worth it, it would need to be bigger than that, after taxes, and unshared.
            </p>
          </div>
        )}

        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>
      </div>
    </Step>
  );
}
