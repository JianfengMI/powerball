import { useEffect, useRef, useState } from "react";
import { TOTAL_COMBINATIONS, type Ticket } from "@powerball/shared";
import { formatLarge, formatMoney, formatYears, yearsForTickets, type RunStory } from "../lib/format";

export function shareText(ticket: Ticket | null, story: RunStory | null): string {
  const nums = ticket ? `${ticket.whites.join(" ")} + ${ticket.powerball}` : null;
  if (story) {
    return (
      `My Powerball ticket${nums ? ` (${nums})` : ""} needed ${formatLarge(story.tickets)} tickets to hit the jackpot: ` +
      `${formatMoney(story.spent)} spent and about ${formatYears(story.years)} of playing every draw. ` +
      `The odds are 1 in ${TOTAL_COMBINATIONS.toLocaleString("en-US")}.`
    );
  }
  return (
    `At one ticket per draw, the average Powerball player would need ${formatYears(yearsForTickets(TOTAL_COMBINATIONS))} ` +
    `to win the jackpot. The odds are 1 in ${TOTAL_COMBINATIONS.toLocaleString("en-US")}.`
  );
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, red: boolean) {
  const g = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 6, x, y, r);
  g.addColorStop(0, red ? "#ff6a78" : "#ffffff");
  g.addColorStop(1, red ? "#b3001b" : "#c9ccd6");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = red ? "#fff" : "#111";
  ctx.font = `700 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), x, y + 2);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function render(canvas: HTMLCanvasElement, ticket: Ticket | null, story: RunStory | null) {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0e1a");
  bg.addColorStop(1, "#1d2650");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f5c542";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("POWERBALL ODDS, EXPLAINED", 70, 90);
  if (ticket) {
    ticket.whites.forEach((n, i) => drawBall(ctx, 120 + i * 110, 190, 46, n, false));
    drawBall(ctx, 120 + 5 * 110 + 20, 190, 46, ticket.powerball, true);
  }
  const years = story ? story.years : yearsForTickets(TOTAL_COMBINATIONS);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  wrap(ctx, story ? `I'd need ${formatYears(years)} to win.` : `The average win takes ${formatYears(years)}.`, 70, 340, W - 140, 74);
  ctx.fillStyle = "#c7cbe0";
  ctx.font = "400 32px system-ui, sans-serif";
  const detail = story
    ? `${formatLarge(story.tickets)} tickets · ${formatMoney(story.spent)} spent · ${formatMoney(story.won)} won back`
    : "Playing one ticket, three draws a week";
  wrap(ctx, detail, 70, 470, W - 140, 42);
  ctx.fillStyle = "#ff6a78";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText(`Odds of the jackpot: 1 in ${TOTAL_COMBINATIONS.toLocaleString("en-US")}`, 70, 570);
}

export function ShareCard({ ticket, story }: { ticket: Ticket | null; story: RunStory | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("");
  const text = shareText(ticket, story);

  useEffect(() => {
    if (ref.current) render(ref.current, ticket, story);
  }, [ticket, story]);

  const download = () => {
    const c = ref.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return setStatus("Sorry, your browser couldn't create the image.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "powerball-odds.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Image downloaded.");
    }, "image/png");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Text copied to your clipboard.");
    } catch {
      setStatus("Couldn't copy automatically. Select the text above and copy it.");
    }
  };

  return (
    <div className="extra">
      <h3>Share your result</h3>
      <p className="muted small">
        {story ? "Made from your step 4 run." : "Run step 4 to put your own result on the card."}
      </p>
      <canvas ref={ref} className="share-canvas" role="img" aria-label={text} />
      <p className="share-text">{text}</p>
      <div className="btn-row">
        <button type="button" className="btn btn--accent" onClick={download}>
          Download image
        </button>
        <button type="button" className="btn" onClick={copy}>
          Copy text
        </button>
      </div>
      <p className="small" role="status">
        {status}
      </p>
    </div>
  );
}
