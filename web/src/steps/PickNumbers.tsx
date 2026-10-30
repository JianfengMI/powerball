import { useState } from "react";
import { POWERBALL_MAX, ticketError, WHITE_COUNT, WHITE_MAX } from "@powerball/shared";
import { Ball, Step } from "../components/common";
import { NumberGrid } from "../components/NumberGrid";
import type { DraftTicket } from "../lib/storage";

export function PickNumbers({
  draft,
  setDraft,
  onQuickPick,
}: {
  draft: DraftTicket;
  setDraft: (d: DraftTicket) => void;
  onQuickPick: () => void;
}) {
  const [hint, setHint] = useState<string | null>(null);

  const toggleWhite = (n: number) => {
    if (draft.whites.includes(n)) {
      setHint(null);
      setDraft({ ...draft, whites: draft.whites.filter((x) => x !== n) });
    } else if (draft.whites.length >= WHITE_COUNT) {
      setHint(`You already have ${WHITE_COUNT} white balls. Tap one of them to remove it first.`);
    } else {
      setHint(null);
      setDraft({ ...draft, whites: [...draft.whites, n] });
    }
  };
  const togglePb = (n: number) => {
    setHint(null);
    setDraft({ ...draft, powerball: draft.powerball === n ? null : n });
  };

  const sortedWhites = [...draft.whites].sort((a, b) => a - b);
  const error =
    draft.powerball === null
      ? draft.whites.length === WHITE_COUNT
        ? "Now pick 1 red Powerball"
        : `Pick ${WHITE_COUNT - draft.whites.length} more white ball${WHITE_COUNT - draft.whites.length === 1 ? "" : "s"} and 1 red Powerball`
      : ticketError({ whites: sortedWhites, powerball: draft.powerball });
  const complete = error === null;

  return (
    <Step
      n={1}
      title="Pick your numbers"
      lead={
        <>
          A Powerball ticket is {WHITE_COUNT} white balls from 1–{WHITE_MAX} plus 1 red Powerball from 1–{POWERBALL_MAX}. It costs $2.
          Your ticket follows you through every step of this story.
        </>
      }
    >
      <div className="ticket-preview" aria-live="polite">
        <span className="ticket-preview__label">Your ticket</span>
        <span className="ball-row">
          {Array.from({ length: WHITE_COUNT }, (_, i) => (
            <Ball key={i} n={sortedWhites[i] ?? null} size="lg" />
          ))}
          <Ball n={draft.powerball} red size="lg" />
        </span>
        <p className={`ticket-preview__status ${complete ? "is-ok" : ""}`}>
          {complete ? "Ticket ready. Scroll on to watch it play." : error}
        </p>
        {hint && (
          <p className="hint" role="alert">
            {hint}
          </p>
        )}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--accent" onClick={() => { setHint(null); onQuickPick(); }}>
          Quick pick
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setHint(null);
            setDraft({ whites: [], powerball: null });
          }}
          disabled={draft.whites.length === 0 && draft.powerball === null}
        >
          Clear
        </button>
      </div>

      <div className="pick-grids">
        <div>
          <h3 className="grid-title">
            White balls <span className="muted">({draft.whites.length}/{WHITE_COUNT})</span>
          </h3>
          <NumberGrid max={WHITE_MAX} selected={draft.whites} onToggle={toggleWhite} label="White balls, pick 5" />
        </div>
        <div>
          <h3 className="grid-title">
            Powerball <span className="muted">({draft.powerball === null ? 0 : 1}/1)</span>
          </h3>
          <NumberGrid
            max={POWERBALL_MAX}
            selected={draft.powerball === null ? [] : [draft.powerball]}
            onToggle={togglePb}
            red
            label="Powerball, pick 1"
          />
          <p className="muted small">Tip: use the arrow keys to move around a grid and Space to pick.</p>
        </div>
      </div>
    </Step>
  );
}
