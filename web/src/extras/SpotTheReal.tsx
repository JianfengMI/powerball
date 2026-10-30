import { useCallback, useEffect, useState } from "react";
import { quickPick, randomInt, type DrawRecord, type Ticket } from "@powerball/shared";
import { TicketBalls } from "../components/common";
import { api } from "../lib/api";
import { humanLikePick, patternSentence, probConsecutive, probSharedDecade } from "../lib/fakeDraws";
import { formatDate } from "../lib/format";

interface Card {
  ticket: Ticket;
  real: boolean;
  date?: string;
}

const CARDS = 6;

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function makeRound(realDraws: DrawRecord[] | null): Card[] {
  const realCount = 2 + randomInt(3); // 2-4 real, the rest human-made
  const real: Card[] = [];
  const used = new Set<number>();
  for (let i = 0; i < realCount; i++) {
    if (realDraws && realDraws.length >= CARDS) {
      let k: number;
      do k = randomInt(realDraws.length);
      while (used.has(k));
      used.add(k);
      const d = realDraws[k]!;
      real.push({ ticket: { whites: d.whites, powerball: d.powerball }, real: true, date: d.date });
    } else {
      real.push({ ticket: quickPick(), real: true }); // fair random draw if real data is unavailable
    }
  }
  const fake: Card[] = Array.from({ length: CARDS - realCount }, () => ({ ticket: humanLikePick(), real: false }));
  return shuffle([...real, ...fake]);
}

export function SpotTheReal() {
  const [draws, setDraws] = useState<DrawRecord[] | null>(null);
  const [fallback, setFallback] = useState(false);
  const [cards, setCards] = useState<Card[]>(() => makeRound(null));
  const [guesses, setGuesses] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .draws(ctrl.signal)
      .then((r) => {
        setDraws(r.draws);
        setCards(makeRound(r.draws));
        setGuesses([]);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setFallback(true);
      });
    return () => ctrl.abort();
  }, []);

  const newRound = useCallback(() => {
    setCards(makeRound(draws));
    setGuesses([]);
    setRevealed(false);
  }, [draws]);

  const toggle = (i: number) => {
    if (revealed) return;
    const g = [...guesses];
    g[i] = !g[i];
    setGuesses(g);
  };

  const correct = cards.filter((c, i) => !!guesses[i] === c.real).length;

  return (
    <div className="extra">
      <h3>Spot the real draw</h3>
      <p>
        Some of these are real Powerball draws{fallback ? " (here: fair random draws, since the draw history couldn't load)" : ""}.
        The others were picked to "look random", the way people usually do. Mark the ones you think are <strong>real</strong>,
        then reveal.
      </p>
      <ul className="spot-grid">
        {cards.map((c, i) => (
          <li key={`${c.ticket.whites.join("-")}-${i}`}>
            <button
              type="button"
              className={`spot-card ${revealed ? (c.real ? "is-real" : "is-fake") : ""}`}
              aria-pressed={!!guesses[i]}
              onClick={() => toggle(i)}
              disabled={revealed}
            >
              <TicketBalls ticket={c.ticket} size="sm" label={`Set ${i + 1}`} />
              <span className="spot-card__guess">{guesses[i] ? "My guess: real" : "Tap if real"}</span>
              {revealed && (
                <span className="spot-card__truth">
                  <strong>{c.real ? (c.date ? `Real draw, ${formatDate(c.date)}` : "Real (random) draw") : "Made up by a 'human'"}</strong>
                  <span>{patternSentence(c.ticket.whites)}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="btn-row">
        {!revealed ? (
          <button type="button" className="btn btn--accent" onClick={() => setRevealed(true)}>
            Reveal
          </button>
        ) : (
          <button type="button" className="btn btn--accent" onClick={newRound}>
            New round
          </button>
        )}
      </div>
      {revealed && (
        <div aria-live="polite">
          <p className="big">
            You got {correct} of {CARDS} right.
          </p>
          <p>
            Real randomness is clumpy. In a fair draw, the chance of at least two consecutive numbers is{" "}
            {Math.round(probConsecutive() * 100)}%, and the chance of two or more numbers in the same decade (like 41 and 47)
            is {Math.round(probSharedDecade() * 100)}%. When people try to look random, they spread numbers out evenly and avoid
            neighbors, which is exactly what gives them away.
          </p>
        </div>
      )}
    </div>
  );
}
