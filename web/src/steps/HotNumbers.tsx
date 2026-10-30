import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import type { ChartData } from "chart.js";
import {
  ANY_PRIZE_ONE_IN,
  POWERBALL_MAX,
  PRIZE_TIERS,
  WHITE_COUNT,
  WHITE_MAX,
  type ChiSquareResult,
  type FrequencyResponse,
  type GapsResponse,
  type SumsResponse,
} from "@powerball/shared";
import { ApiErrorBox, ChartBox, Loading, Meaning, Step, TicketBalls } from "../components/common";
import { api, useApi } from "../lib/api";
import { baseOptions } from "../lib/charts";
import { formatDate, formatMoney, formatPValue } from "../lib/format";
import { compareHotVsRandom, deriveHotTicket, type HotVsRandom } from "../lib/hotTicket";
import { useReducedMotion, useThemeColors } from "../lib/hooks";

export function pValueSentence(test: ChiSquareResult, what: string): string {
  const p = test.pValue;
  const pct = p >= 0.01 ? `${Math.round(p * 100)}%` : "under 1%";
  if (p >= 0.05) {
    return (
      `Chi-square test p-value: ${formatPValue(p)}. If the ${what} were perfectly fair, you'd see unevenness at least this big ` +
      `${pct} of the time. In other words, the bumps in this chart are exactly what fair randomness looks like.`
    );
  }
  return (
    `Chi-square test p-value: ${formatPValue(p)}. Fair ${what} would look this uneven only ${pct} of the time. That's unusual, ` +
    `but with many numbers and many tests, some "unusual" results are expected by chance alone (1 test in 20 lands below 0.05). ` +
    `It does not make any number more likely in the next draw.`
  );
}

function FrequencyChart({
  freq,
  which,
  highlight,
}: {
  freq: FrequencyResponse;
  which: "whites" | "powerballs";
  highlight: readonly number[];
}) {
  const colors = useThemeColors();
  const reduced = useReducedMotion();
  const rows = freq[which];
  const isRed = which === "powerballs";
  const data: ChartData<"bar" | "line", number[], string> = {
    labels: rows.map((r) => String(r.number)),
    datasets: [
      {
        type: "line" as const,
        label: "Expected if perfectly even",
        data: rows.map((r) => r.expected),
        borderColor: colors.expected,
        backgroundColor: colors.expected,
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 2,
        pointStyle: "line",
        order: 0,
      },
      {
        type: "bar" as const,
        label: "Times drawn",
        data: rows.map((r) => r.count),
        backgroundColor: rows.map((r) =>
          highlight.includes(r.number) ? colors.gold : isRed ? colors.accent : colors.white,
        ),
        borderColor: isRed ? colors.accent : colors.whiteBorder,
        borderWidth: 1,
        pointStyle: "rect",
        order: 1,
      },
      {
        // Legend entry only: explains the gold bars.
        type: "bar" as const,
        label: highlight.length === 1 ? "Hottest" : `${highlight.length} hottest`,
        data: [],
        backgroundColor: colors.gold,
        pointStyle: "rect",
      },
    ],
  };
  const max = rows.reduce((a, b) => (b.count > a.count ? b : a));
  const min = rows.reduce((a, b) => (b.count < a.count ? b : a));
  return (
    <ChartBox
      tall={!isRed}
      label={`Bar chart of how often each ${isRed ? "Powerball" : "white ball"} was drawn. Most: ${max.number} (${max.count} times). Least: ${min.number} (${min.count} times). Expected about ${Math.round(rows[0]!.expected)} each.`}
    >
      <Bar data={data as ChartData<"bar">} options={baseOptions(colors, reduced) as object} />
    </ChartBox>
  );
}

function SumsChart({ sums }: { sums: SumsResponse }) {
  const colors = useThemeColors();
  const reduced = useReducedMotion();
  const BIN = 10;
  const { labels, observed, expected } = useMemo(() => {
    const start = 15;
    const bins = Math.ceil((335 - start + 1) / BIN);
    const observed = new Array<number>(bins).fill(0);
    const expected = new Array<number>(bins).fill(0);
    for (const o of sums.observed) observed[Math.floor((o.sum - start) / BIN)]! += o.count;
    for (const t of sums.theoretical) expected[Math.floor((t.sum - start) / BIN)]! += t.probability * sums.drawCount;
    const labels = Array.from({ length: bins }, (_, i) => `${start + i * BIN}–${Math.min(335, start + i * BIN + BIN - 1)}`);
    return { labels, observed, expected };
  }, [sums]);
  const data: ChartData<"bar" | "line", number[], string> = {
    labels,
    datasets: [
      {
        type: "line" as const,
        label: "Expected from pure chance",
        data: expected,
        borderColor: colors.expected,
        backgroundColor: colors.expected,
        pointRadius: 0,
        borderWidth: 2,
        pointStyle: "line",
        tension: 0.35,
        order: 0,
      },
      {
        type: "bar" as const,
        label: "Real draws",
        data: observed,
        backgroundColor: colors.white,
        borderColor: colors.whiteBorder,
        borderWidth: 1,
        pointStyle: "rect",
        order: 1,
      },
    ],
  };
  return (
    <ChartBox label={`Histogram of the sum of the five white balls in each draw. Real average ${sums.observedMean.toFixed(1)}; theory says ${sums.theoreticalMean}. The shape follows the expected bell curve.`}>
      <Bar data={data as ChartData<"bar">} options={baseOptions(colors, reduced) as object} />
    </ChartBox>
  );
}

function GapsTable({ gaps }: { gaps: GapsResponse }) {
  const overdue = [...gaps.whites]
    .filter((g) => g.drawsSinceLast !== null)
    .sort((a, b) => (b.drawsSinceLast ?? 0) - (a.drawsSinceLast ?? 0))
    .slice(0, 8);
  const longest = gaps.whites.reduce((a, b) => (b.longestGap > a.longestGap ? b : a));
  const avgGap = WHITE_MAX / WHITE_COUNT;
  return (
    <>
      <div className="table-wrap">
        <table className="compact">
          <caption>The 8 white balls that have gone longest without being drawn</caption>
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Draws since last seen</th>
              <th scope="col">Last seen</th>
              <th scope="col" className="hide-sm">
                Longest gap ever
              </th>
            </tr>
          </thead>
          <tbody>
            {overdue.map((g) => (
              <tr key={g.number}>
                <th scope="row">{g.number}</th>
                <td>{g.drawsSinceLast}</td>
                <td>{g.lastSeen ? formatDate(g.lastSeen) : "—"}</td>
                <td className="hide-sm">{g.longestGap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Meaning>
        Each white ball has a {((WHITE_COUNT / WHITE_MAX) * 100).toFixed(1)}% chance in every draw, so on average it shows up
        every {avgGap.toFixed(1)} draws. But averages hide long streaks: across {WHITE_MAX} numbers, some will always be on a
        long dry spell (the record here is {longest.longestGap} draws, for number {longest.number}). A number that hasn't
        appeared in a while is <em>not</em> "due". Its chance next draw is still exactly {WHITE_COUNT} in {WHITE_MAX}.
      </Meaning>
    </>
  );
}

function TicketRunCard({ title, run, ticket }: { title: string; run: HotVsRandom["hot"]; ticket: HotVsRandom["randomTicket"] }) {
  return (
    <div className="card">
      <h4>{title}</h4>
      <TicketBalls ticket={ticket} size="sm" label={title} />
      <dl className="mini-stats">
        <div>
          <dt>Spent</dt>
          <dd>{formatMoney(run.spent)}</dd>
        </div>
        <div>
          <dt>Won</dt>
          <dd>{formatMoney(run.won)}</dd>
        </div>
        <div>
          <dt>Winning draws</dt>
          <dd>{run.anyWins}</dd>
        </div>
      </dl>
      <p className="small muted">
        {PRIZE_TIERS.map((t, i) => (run.wins[i] ? `${t.label} ×${run.wins[i]}` : null))
          .filter(Boolean)
          .join(", ") || "No wins"}
      </p>
    </div>
  );
}

function HotTrap({ freq }: { freq: FrequencyResponse }) {
  const hot = useMemo(() => deriveHotTicket(freq), [freq]);
  const [result, setResult] = useState<HotVsRandom | null>(null);
  const [tally, setTally] = useState({ runs: 0, hotWins: 0, randomWins: 0, hotMoney: 0, randomMoney: 0 });
  const run = () => {
    const r = compareHotVsRandom(hot, 1000);
    setResult(r);
    setTally((t) => ({
      runs: t.runs + 1,
      hotWins: t.hotWins + r.hot.anyWins,
      randomWins: t.randomWins + r.random.anyWins,
      hotMoney: t.hotMoney + r.hot.won,
      randomMoney: t.randomMoney + r.random.won,
    }));
  };
  const expectedWins = 1000 / ANY_PRIZE_ONE_IN;
  return (
    <div className="hot-trap">
      <h3>The hot number trap</h3>
      <p>
        Here, <strong>"hot"</strong> means the 5 white balls and the 1 Powerball drawn most often across all{" "}
        {freq.drawCount.toLocaleString("en-US")} draws since October 2015. Want to bet on them? Let's play the hot ticket and a
        random ticket against the next 1,000 draws, simulated with a fair random number generator.
      </p>
      <TicketBalls ticket={hot} label="Hot ticket" />
      <div className="btn-row">
        <button type="button" className="btn btn--accent" onClick={run}>
          {result ? "Run another 1,000 draws" : "Simulate 1,000 draws"}
        </button>
      </div>
      {result && (
        <div aria-live="polite">
          <div className="cards cards--two">
            <TicketRunCard title="Hot ticket" run={result.hot} ticket={hot} />
            <TicketRunCard title="Random ticket" run={result.random} ticket={result.randomTicket} />
          </div>
          <p>
            Either ticket should win something about {Math.round(expectedWins)} times in 1,000 draws, and 95% of the time
            within ±{Math.round(2 * Math.sqrt(expectedWins * (1 - 1 / ANY_PRIZE_ONE_IN)))} of that.
            This time: hot {result.hot.anyWins}, random {result.random.anyWins}.{" "}
            {tally.runs > 1 &&
              `After ${tally.runs} runs: hot ${tally.hotWins} wins (${formatMoney(tally.hotMoney)}), random ${tally.randomWins} wins (${formatMoney(tally.randomMoney)}). `}
            Whichever one "wins" changes from run to run: that's noise. The balls don't know which numbers were popular last
            year.
          </p>
        </div>
      )}
    </div>
  );
}

export function HotNumbers() {
  const freq = useApi("freq", (s) => api.frequency(s));
  const sums = useApi("sums", (s) => api.sums(s));
  const gaps = useApi("gaps", (s) => api.gaps(s));
  const hot = freq.data ? deriveHotTicket(freq.data) : null;
  // All three come from the same backend, so one failure usually means all fail: show a single notice.
  const failed = [freq, sums, gaps].filter((r) => r.error);
  const retryFailed = () => failed.forEach((r) => r.retry());

  return (
    <Step
      n={6}
      title='Is anything "hot"?'
      lead="Some numbers have come up more than others. Does that mean anything? Here is every real draw, analyzed."
    >
      {failed.length > 0 && <ApiErrorBox message={failed[0]!.error!} onRetry={retryFailed} />}

      {freq.loading && !freq.data ? (
        <Loading what="number frequencies" />
      ) : freq.data && hot ? (
        <>
          <h3>How often each white ball was drawn</h3>
          <FrequencyChart freq={freq.data} which="whites" highlight={hot.whites} />
          <Meaning>
            Each bar is one number from 1 to {WHITE_MAX}; the dashed line is what perfect evenness would give (
            {Math.round(freq.data.whites[0]!.expected)} each). The gold bars are the 5 "hottest". Real randomness is lumpy, so
            some bars stick up and some dip. {pValueSentence(freq.data.whiteTest, "white balls")}
          </Meaning>

          <h3>How often each Powerball was drawn</h3>
          <FrequencyChart freq={freq.data} which="powerballs" highlight={[hot.powerball]} />
          <Meaning>
            Same idea for the {POWERBALL_MAX} red balls, about {Math.round(freq.data.powerballs[0]!.expected)} each expected.{" "}
            {pValueSentence(freq.data.powerballTest, "Powerballs")}
          </Meaning>
        </>
      ) : null}

      {sums.loading && !sums.data ? (
        <Loading what="sums" />
      ) : sums.data ? (
        <>
          <h3>The sum of the five white balls</h3>
          <SumsChart sums={sums.data} />
          <Meaning>
            Add up the five white balls in a draw and you get a number from 15 to 335. Middle sums are far more common because
            there are many more ways to make them (just like rolling 7 with two dice). The real draws (bars) follow the curve
            predicted by pure chance: average {sums.data.observedMean.toFixed(1)} vs. {sums.data.theoreticalMean} in theory.
            Nothing is steering the balls.
          </Meaning>
        </>
      ) : null}

      {gaps.loading && !gaps.data ? (
        <Loading what="gaps" />
      ) : gaps.data ? (
        <>
          <h3>Gaps: numbers that are "overdue"</h3>
          <GapsTable gaps={gaps.data} />
        </>
      ) : null}

      {freq.data && <HotTrap freq={freq.data} />}
    </Step>
  );
}
