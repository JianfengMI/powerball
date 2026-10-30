import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { PRIZE_TIERS, TICKET_PRICE, type CheckResponse, type DrawsResponse, type Ticket } from "@powerball/shared";
import { ApiErrorBox, ChartBox, Loading, Meaning, NeedTicket, Step, TicketBalls } from "../components/common";
import { api, useApi } from "../lib/api";
import { baseOptions } from "../lib/charts";
import { formatDate, formatInt, formatMoney, formatPrize } from "../lib/format";
import { useReducedMotion, useThemeColors } from "../lib/hooks";

const tierById = new Map(PRIZE_TIERS.map((t) => [t.id, t]));

export function historySummary(r: CheckResponse, firstDate?: string): string {
  const since = firstDate ? ` since ${formatDate(firstDate)}` : "";
  const loss = r.totalSpent - r.totalWon;
  const anyWins = r.wins.reduce((s, w) => s + w.count, 0);
  let s =
    `If you'd played these numbers in every one of the ${formatInt(r.drawCount)} draws${since}, ` +
    `you'd have spent ${formatMoney(r.totalSpent)} and won ${formatMoney(r.totalWon)}`;
  if (r.jackpotDates.length) {
    s += ` plus the jackpot on ${r.jackpotDates.map(formatDate).join(" and ")}. Congratulations, in theory.`;
    return s;
  }
  s += `: a loss of ${formatMoney(loss)}`;
  if (r.totalSpent > 0) s += ` (${Math.round((loss / r.totalSpent) * 100)}% of what you paid)`;
  s += ".";
  if (anyWins === 0) s += " Your ticket never won a single prize.";
  return s;
}

function SpentVsWonChart({ check, draws }: { check: CheckResponse; draws: DrawsResponse }) {
  const colors = useThemeColors();
  const reduced = useReducedMotion();
  const { labels, spent, won } = useMemo(() => {
    const winsByDate = new Map<string, number>();
    for (const w of check.winHistory ?? []) {
      const tier = tierById.get(w.tierId);
      const prize = tier && tier.prize !== "jackpot" ? tier.prize : 0;
      winsByDate.set(w.date, (winsByDate.get(w.date) ?? 0) + prize);
    }
    const labels: string[] = [];
    const spent: number[] = [];
    const won: number[] = [];
    let total = 0;
    draws.draws.forEach((d, i) => {
      total += winsByDate.get(d.date) ?? 0;
      labels.push(d.date.slice(0, 4));
      spent.push((i + 1) * TICKET_PRICE);
      won.push(total);
    });
    return { labels, spent, won };
  }, [check, draws]);

  const opts = baseOptions(colors, reduced);
  return (
    <ChartBox label={`Line chart: money spent climbs steadily to ${formatMoney(spent.at(-1) ?? 0)}; money won reaches ${formatMoney(won.at(-1) ?? 0)}.`}>
      <Line
        data={{
          labels,
          datasets: [
            { label: "Spent", data: spent, borderColor: colors.accent, backgroundColor: colors.accent, pointRadius: 0, borderWidth: 2 },
            { label: "Won", data: won, borderColor: colors.green, backgroundColor: colors.green, pointRadius: 0, borderWidth: 2, stepped: true },
          ],
        }}
        options={{
          ...(opts as object),
          scales: {
            ...opts.scales,
            x: { ...opts.scales?.x, ticks: { ...opts.scales?.x?.ticks, autoSkip: true, maxTicksLimit: 8 } },
            y: { ...opts.scales?.y, ticks: { ...opts.scales?.y?.ticks, callback: (v) => formatMoney(Number(v)) } },
          },
        }}
      />
    </ChartBox>
  );
}

export function History({
  ticket,
  onQuickPick,
  firstDate,
}: {
  ticket: Ticket | null;
  onQuickPick: () => void;
  firstDate?: string;
}) {
  const key = ticket ? `${ticket.whites.join(",")}|${ticket.powerball}` : null;
  const check = useApi(key, (s) => api.check(ticket!, s));
  const draws = useApi(key && check.data?.winHistory ? "draws" : null, (s) => api.draws(s));

  return (
    <Step
      n={5}
      title="Your numbers vs. history"
      lead="What if you had played your exact ticket in every real Powerball draw since the current rules began in October 2015?"
    >
      {!ticket ? (
        <NeedTicket onPick={onQuickPick} />
      ) : check.loading && !check.data ? (
        <Loading what="every real draw" />
      ) : check.error ? (
        <ApiErrorBox message={check.error} onRetry={check.retry} />
      ) : check.data ? (
        <HistoryResult r={check.data} ticket={ticket} firstDate={firstDate} draws={draws.data} />
      ) : null}
    </Step>
  );
}

function HistoryResult({
  r,
  ticket,
  firstDate,
  draws,
}: {
  r: CheckResponse;
  ticket: Ticket;
  firstDate?: string;
  draws: DrawsResponse | null;
}) {
  const firstWin = r.winHistory?.[0];
  const bestTier = r.bestWin ? tierById.get(r.bestWin.tierId) : null;
  return (
    <>
      <div className="history-head">
        <TicketBalls ticket={ticket} size="sm" />
      </div>
      <p className="big" aria-live="polite">
        {historySummary(r, firstDate)}
      </p>
      <dl className="stats-row">
        <div>
          <dt>Spent</dt>
          <dd>{formatMoney(r.totalSpent)}</dd>
        </div>
        <div>
          <dt>Won</dt>
          <dd>{formatMoney(r.totalWon)}</dd>
        </div>
        <div>
          <dt>Best win</dt>
          <dd>{bestTier ? `${bestTier.label} (${formatPrize(bestTier.prize)})` : "None"}</dd>
        </div>
        <div>
          <dt>First win</dt>
          <dd>{firstWin ? formatDate(firstWin.date) : r.bestWin ? "—" : "Never"}</dd>
        </div>
      </dl>
      {r.bestWin && bestTier && (
        <p>
          Your best result was <strong>{bestTier.label}</strong> on {formatDate(r.bestWin.date)}, worth {formatPrize(bestTier.prize)}.
          {firstWin && firstWin.date !== r.bestWin.date && (
            <>
              {" "}
              Your first win came on {formatDate(firstWin.date)} ({tierById.get(firstWin.tierId)?.label ?? firstWin.tierId}).
            </>
          )}
        </p>
      )}

      <div className="table-wrap">
        <table className="compact">
          <caption>Your wins in real draws, by prize tier</caption>
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Times</th>
              <th scope="col">Prize</th>
            </tr>
          </thead>
          <tbody>
            {r.wins.map((w) => (
              <tr key={w.tierId} className={w.count ? "" : "is-zero"}>
                <th scope="row">{tierById.get(w.tierId)?.label ?? w.tierId}</th>
                <td>{w.count}</td>
                <td>{formatPrize(w.prize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.winHistory && draws && draws.draws.length > 0 && (
        <>
          <h3>Spent vs. won, draw by draw</h3>
          <SpentVsWonChart check={r} draws={draws} />
          <Meaning>
            The red line is the $2 you'd pay every draw. It climbs forever. The green line is your prize money: flat most of
            the time, with small steps when you win. The gap between them is the real cost of playing.
          </Meaning>
        </>
      )}
      <p className="small muted">Jackpot amounts aren't in the public data, so jackpot wins are listed by date but not added to "won". Power Play is not included.</p>
    </>
  );
}
