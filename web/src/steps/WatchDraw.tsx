import { useEffect, useRef, useState } from "react";
import { checkTicket, PRIZE_TIERS, quickPick, TICKET_PRICE, type Ticket } from "@powerball/shared";
import { Ball, NeedTicket, Step, TicketBalls } from "../components/common";
import { formatMoney, formatPrize } from "../lib/format";
import { useReducedMotion } from "../lib/hooks";

const REVEAL_MS = 650;

interface Tally {
  draws: number;
  won: number;
  wins: number[];
  jackpots: number;
}
const emptyTally = (): Tally => ({ draws: 0, won: 0, wins: PRIZE_TIERS.map(() => 0), jackpots: 0 });

export function WatchDraw({ ticket, onQuickPick }: { ticket: Ticket | null; onQuickPick: () => void }) {
  const reduced = useReducedMotion();
  const [draw, setDraw] = useState<Ticket | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [tally, setTally] = useState<Tally>(emptyTally);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticketKey = ticket ? `${ticket.whites.join(",")}|${ticket.powerball}` : "";

  // A new ticket starts a fresh tally.
  useEffect(() => {
    setDraw(null);
    setRevealed(0);
    setTally(emptyTally());
  }, [ticketKey]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  if (!ticket) {
    return (
      <Step n={2} title="Watch the draw" lead="Six balls come out of the machine: five white, then the red Powerball.">
        <NeedTicket onPick={onQuickPick} />
      </Step>
    );
  }

  const finished = draw !== null && revealed >= 6;
  const result = draw ? checkTicket(ticket, draw) : null;

  const doDraw = () => {
    if (timer.current) clearInterval(timer.current);
    const d = quickPick();
    const r = checkTicket(ticket, d);
    setDraw(d);
    const record = () =>
      setTally((t) => {
        const wins = [...t.wins];
        if (r.tier) wins[PRIZE_TIERS.indexOf(r.tier)]!++;
        return {
          draws: t.draws + 1,
          won: t.won + (r.tier && r.tier.prize !== "jackpot" ? r.tier.prize : 0),
          wins,
          jackpots: t.jackpots + (r.tier?.prize === "jackpot" ? 1 : 0),
        };
      });
    if (reduced) {
      setRevealed(6);
      record();
      return;
    }
    setRevealed(0);
    let shown = 0;
    timer.current = setInterval(() => {
      shown++;
      setRevealed(shown);
      if (shown >= 6) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        record();
      }
    }, REVEAL_MS);
  };

  const anyWins = tally.wins.reduce((a, b) => a + b, 0);

  return (
    <Step
      n={2}
      title="Watch the draw"
      lead="Six balls come out of the machine: five white, then the red Powerball. Matching numbers light up."
    >
      <div className="studio">
        <div className="studio__row">
          <span className="studio__label">Your ticket</span>
          <TicketBalls
            ticket={ticket}
            matchWhites={finished && draw ? draw.whites : []}
            matchPb={finished && result?.powerballMatch}
          />
        </div>
        <div className="studio__row">
          <span className="studio__label">Tonight's draw</span>
          <span className="ball-row" aria-hidden={!finished}>
            {Array.from({ length: 5 }, (_, i) => {
              const n = draw?.whites[i] ?? null;
              return (
                <span key={`${draw ? draw.whites.join() : "x"}-${i}`} className={i < revealed ? "drop-in" : ""}>
                  <Ball n={n} hidden={i >= revealed} size="lg" match={i < revealed && n !== null && ticket.whites.includes(n)} />
                </span>
              );
            })}
            <span key={`${draw ? draw.whites.join() : "x"}-pb`} className={revealed >= 6 ? "drop-in" : ""}>
              <Ball n={draw?.powerball ?? null} red hidden={revealed < 6} size="lg" match={revealed >= 6 && !!result?.powerballMatch} />
            </span>
          </span>
        </div>
        <div className="studio__result" aria-live="polite" aria-atomic="true">
          {finished && draw && result ? (
            <p>
              The draw was {draw.whites.join(", ")} and Powerball {draw.powerball}. You matched {result.whiteMatches} white
              ball{result.whiteMatches === 1 ? "" : "s"}
              {result.powerballMatch ? " and the Powerball" : ""}.{" "}
              {result.tier ? (
                <strong className="win">
                  You win: {result.tier.label}, {formatPrize(result.tier.prize)}
                  {result.tier.prize === "jackpot" ? "! (Seriously, this is a 1 in 292 million event.)" : "."}
                </strong>
              ) : (
                <strong>No prize this time.</strong>
              )}
            </p>
          ) : draw ? (
            <p className="muted">Drawing…</p>
          ) : (
            <p className="muted">Press the button to run a fair random draw.</p>
          )}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--accent" onClick={doDraw}>
            {tally.draws === 0 && !draw ? "Start the draw" : "Draw again"}
          </button>
        </div>
      </div>

      {tally.draws > 0 && (
        <div className="tally" aria-live="polite">
          <h3>Your running tally</h3>
          <dl className="stats-row">
            <div>
              <dt>Draws</dt>
              <dd>{tally.draws}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd>{formatMoney(tally.draws * TICKET_PRICE)}</dd>
            </div>
            <div>
              <dt>Won</dt>
              <dd>{formatMoney(tally.won)}</dd>
            </div>
            <div>
              <dt>Winning draws</dt>
              <dd>{anyWins}</dd>
            </div>
          </dl>
          {anyWins > 0 && (
            <p className="small muted">
              Wins:{" "}
              {PRIZE_TIERS.map((t, i) => (tally.wins[i] ? `${t.label} ×${tally.wins[i]}` : null))
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <p className="small muted">
            A prize of any size comes about once every 25 draws, and it's usually $4. Keep clicking and watch the "won"
            number fall behind "spent".
          </p>
        </div>
      )}
    </Step>
  );
}
