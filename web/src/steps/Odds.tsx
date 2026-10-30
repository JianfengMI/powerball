import { useId, useState } from "react";
import {
  ANY_PRIZE_ONE_IN,
  combinations,
  expectedValue,
  POWERBALL_MAX,
  TICKET_PRICE,
  TIER_ODDS,
  TOTAL_COMBINATIONS,
  WHITE_COUNT,
  WHITE_MAX,
} from "@powerball/shared";
import { Step } from "../components/common";
import { jackpotComparisons } from "../lib/comparisons";
import { formatInt, formatMoney, formatOneIn, formatPrize } from "../lib/format";

const WHITE_COMBOS = combinations(WHITE_MAX, WHITE_COUNT);
const FIXED_EV = expectedValue(0);
/** Jackpot at which the simplified EV equals the ticket price. */
const BREAK_EVEN = (TICKET_PRICE - FIXED_EV) * TOTAL_COMBINATIONS;

export function Odds() {
  const [jackpotM, setJackpotM] = useState("100");
  const inputId = useId();
  const jackpot = Math.max(0, Number(jackpotM.replace(/,/g, "")) || 0) * 1e6;
  const ev = expectedValue(jackpot);

  return (
    <Step n={3} title="See the odds" lead="Every ticket has exactly the same chances. Here's where the numbers come from.">
      <div className="table-wrap">
        <table className="odds-table">
          <caption>Prize tiers and the odds of each, for one $2 ticket</caption>
          <thead>
            <tr>
              <th scope="col">Match</th>
              <th scope="col">Prize</th>
              <th scope="col">Odds</th>
              <th scope="col" className="hide-sm">
                Winning tickets
              </th>
            </tr>
          </thead>
          <tbody>
            {TIER_ODDS.map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.label}</th>
                <td>{formatPrize(t.prize)}</td>
                <td>{formatOneIn(t.oneIn)}</td>
                <td className="hide-sm">{formatInt(t.ways)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Any prize</th>
              <td />
              <td>{formatOneIn(ANY_PRIZE_ONE_IN)}</td>
              <td className="hide-sm" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="small muted">
        "Winning tickets" is how many of the {formatInt(TOTAL_COMBINATIONS)} possible tickets land in that tier for any one
        draw. Odds = {formatInt(TOTAL_COMBINATIONS)} ÷ that number. Prizes exclude Power Play.
      </p>

      <h3>Why 1 in 292,201,338?</h3>
      <ol className="math-steps">
        <li>
          <strong>First white ball:</strong> 69 choices. Then 68, 67, 66, 65 for the next four:{" "}
          <span className="math">69 × 68 × 67 × 66 × 65 = {formatInt(69 * 68 * 67 * 66 * 65)}</span> ordered ways.
        </li>
        <li>
          <strong>Order doesn't matter.</strong> The same five balls can come out in{" "}
          <span className="math">5 × 4 × 3 × 2 × 1 = 120</span> orders, so divide:{" "}
          <span className="math">
            {formatInt(69 * 68 * 67 * 66 * 65)} ÷ 120 = {formatInt(WHITE_COMBOS)}
          </span>
          . That's "69 choose 5", written C(69, 5).
        </li>
        <li>
          <strong>Add the Powerball:</strong> each of those white-ball sets can go with any of {POWERBALL_MAX} red balls:{" "}
          <span className="math">
            {formatInt(WHITE_COMBOS)} × {POWERBALL_MAX} = {formatInt(TOTAL_COMBINATIONS)}
          </span>
          .
        </li>
        <li>
          Only one of those {formatInt(TOTAL_COMBINATIONS)} tickets matches everything. Smaller prizes work the same way. For
          example, "4 + Powerball" means choosing 4 of the 5 drawn whites (5 ways) and 1 of the 64 undrawn whites (64 ways):
          5 × 64 = 320 tickets, so 1 in {formatInt(TOTAL_COMBINATIONS / 320)}.
        </li>
      </ol>

      <h3>How big is 292 million?</h3>
      <ul className="cards">
        {jackpotComparisons().map((c) => (
          <li key={c.title} className="card">
            <h4>{c.title}</h4>
            <p>{c.detail}</p>
          </li>
        ))}
      </ul>

      <h3>What is a $2 ticket worth on average?</h3>
      <p>
        Multiply each prize by its chance and add them up. The fixed prizes alone are worth about{" "}
        <strong>{formatMoney(FIXED_EV, 2)}</strong> per ticket: you get back {Math.round(FIXED_EV * 100)} cents of every $2, on average, before the
        jackpot.
      </p>
      <div className="ev-box">
        <label htmlFor={inputId}>Try a jackpot (millions of dollars, advertised annuity):</label>
        <div className="ev-box__input">
          <span aria-hidden="true">$</span>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            step={10}
            value={jackpotM}
            onChange={(e) => setJackpotM(e.target.value)}
          />
          <span aria-hidden="true">million</span>
        </div>
        <p aria-live="polite">
          Expected value per ticket: <strong className="big">{formatMoney(ev, 2)}</strong> of the $2 you pay (
          {formatMoney(FIXED_EV, 2)} from fixed prizes + {formatMoney(ev - FIXED_EV, 2)} from the jackpot share).
        </p>
        <p className="small muted">
          On paper, the ticket "breaks even" at a jackpot of about {formatMoney(Math.round(BREAK_EVEN / 1e6) * 1e6)}. In
          reality it never does, because this simplified math ignores: income taxes (federal and often state), the lump sum
          being much smaller than the advertised annuity, and big jackpots selling so many tickets that winners often have to
          split it.
        </p>
      </div>
    </Step>
  );
}
