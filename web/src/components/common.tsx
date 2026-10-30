import type { ReactNode } from "react";
import type { Ticket } from "@powerball/shared";

export function Ball({
  n,
  red = false,
  match = false,
  size = "md",
  hidden = false,
  label,
}: {
  n: number | null;
  red?: boolean;
  match?: boolean;
  size?: "sm" | "md" | "lg";
  hidden?: boolean;
  label?: string;
}) {
  const cls = ["ball", red ? "ball--red" : "ball--white", `ball--${size}`, match ? "ball--match" : "", hidden || n === null ? "ball--empty" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} aria-label={label} role={label ? "img" : undefined}>
      {hidden || n === null ? "" : n}
    </span>
  );
}

/** The ticket as a row of balls. `matches` highlights matched numbers. */
export function TicketBalls({
  ticket,
  size = "md",
  matchWhites,
  matchPb = false,
  label = "Your ticket",
}: {
  ticket: Ticket;
  size?: "sm" | "md" | "lg";
  matchWhites?: readonly number[];
  matchPb?: boolean;
  label?: string;
}) {
  return (
    <span className="ball-row" role="img" aria-label={`${label}: ${ticket.whites.join(", ")}, Powerball ${ticket.powerball}`}>
      {ticket.whites.map((n) => (
        <Ball key={n} n={n} size={size} match={matchWhites?.includes(n)} />
      ))}
      <Ball n={ticket.powerball} red size={size} match={matchPb} />
    </span>
  );
}

export function Step({
  n,
  title,
  lead,
  children,
}: {
  n: number | string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  const id = typeof n === "number" ? `step-${n}` : n;
  return (
    <section className="step" id={id} aria-labelledby={`${id}-title`}>
      <header className="step__header">
        {typeof n === "number" && (
          <span className="step__num" aria-hidden="true">
            {n}
          </span>
        )}
        <div>
          <h2 id={`${id}-title`}>
            {typeof n === "number" && <span className="visually-hidden">Step {n}: </span>}
            {title}
          </h2>
          {lead && <p className="step__lead">{lead}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Plain-English "what this means" caption for every chart. */
export function Meaning({ children }: { children: ReactNode }) {
  return (
    <div className="meaning">
      <strong>What this means: </strong>
      {children}
    </div>
  );
}

export function NeedTicket({ onPick }: { onPick: () => void }) {
  return (
    <div className="notice">
      <p>This step uses your ticket. Pick your numbers in step 1 first.</p>
      <div className="btn-row">
        <a className="btn" href="#step-1">
          Go to step 1
        </a>
        <button type="button" className="btn btn--ghost" onClick={onPick}>
          Quick pick for me
        </button>
      </div>
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="notice" role="status">
      <span className="spinner" aria-hidden="true" /> Loading {what}…
    </div>
  );
}

export function ApiErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="notice notice--error" role="alert">
      <p>
        <strong>We couldn't load the real draw data.</strong> {message}
      </p>
      <p className="muted">The rest of the story still works: everything except steps 5–6 runs in your browser.</p>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function ChartBox({ children, tall = false, label }: { children: ReactNode; tall?: boolean; label: string }) {
  return (
    <figure className={`chart ${tall ? "chart--tall" : ""}`}>
      <div className="chart__canvas" role="img" aria-label={label}>
        {children}
      </div>
    </figure>
  );
}
