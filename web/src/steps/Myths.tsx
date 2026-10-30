import { combinations, TOTAL_COMBINATIONS } from "@powerball/shared";
import { Step } from "../components/common";
import { formatInt } from "../lib/format";

// Share of all white-ball sets made only of "birthday" numbers 1-31.
const BIRTHDAY_SHARE = combinations(31, 5) / combinations(69, 5);

const MYTHS = [
  {
    myth: 'Some numbers are "due".',
    truth: `The machine has no memory. A number that hasn't come up in 50 draws has the same 5-in-69 chance tonight as one that came up yesterday. Believing otherwise is called the gambler's fallacy.`,
  },
  {
    myth: "Birthdays are lucky numbers.",
    truth: `Birthday numbers (1–31) win exactly as often as any others. But so many people play them that if a birthday-only ticket hits, you're more likely to split the jackpot. Only ${(BIRTHDAY_SHARE * 100).toFixed(1)}% of possible white-ball sets use just 1–31, yet many players pick only from that range (birthdays and anniversaries).`,
  },
  {
    myth: "Quick picks win less (or more) than your own numbers.",
    truth: `Every ticket, chosen by you or by the terminal, is one of ${formatInt(TOTAL_COMBINATIONS)} equally likely combinations. Most jackpot winners are quick picks simply because most tickets sold are quick picks.`,
  },
  {
    myth: 'This number is "hot", so play it.',
    truth: "Past frequency doesn't predict future draws. Step 6 shows the hot ticket and a random ticket doing the same over 1,000 simulated draws, and tests whether the real frequencies are any more uneven than chance alone would produce.",
  },
  {
    myth: "Buying more tickets makes winning likely.",
    truth: `Ten tickets turn 1 in ${formatInt(TOTAL_COMBINATIONS)} into 10 in ${formatInt(TOTAL_COMBINATIONS)}, which is still about 1 in ${formatInt(TOTAL_COMBINATIONS / 10)}. You'd also spend 10 times as much.`,
  },
  {
    myth: '1, 2, 3, 4, 5 + 6 can never win.',
    truth: "It's exactly as likely as any other ticket. It just looks less random. But because quite a few people play it, a win would likely be shared.",
  },
];

export function Myths() {
  return (
    <Step n={7} title="Myths" lead="Common beliefs about lottery numbers, and what the math says.">
      <ul className="cards cards--myths">
        {MYTHS.map((m) => (
          <li key={m.myth} className="card myth">
            <h3 className="myth__q">
              <span className="myth__tag">Myth</span> {m.myth}
            </h3>
            <p>
              <span className="myth__tag myth__tag--truth">Reality</span> {m.truth}
            </p>
          </li>
        ))}
      </ul>
    </Step>
  );
}
