import { useEffect, useRef, useState } from "react";
import { randomInt, TOTAL_COMBINATIONS } from "@powerball/shared";
import { formatInt } from "../lib/format";
import { useThemeColors } from "../lib/hooks";

const LEVELS = [
  { dots: 100, label: "100" },
  { dots: 10_000, label: "10 thousand" },
  { dots: 1_000_000, label: "1 million" },
  { dots: TOTAL_COMBINATIONS, label: "292 million" },
] as const;

function draw(canvas: HTMLCanvasElement, level: number, colors: ReturnType<typeof useThemeColors>, seed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const bg = getComputedStyle(canvas).getPropertyValue("--surface").trim() || "#111";
  const dot = colors.white || "#eee";
  const win = colors.accent || "#e5243b";

  if (level <= 1) {
    const side = level === 0 ? 10 : 100;
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    const cell = size / side;
    const winner = seed % (side * side);
    for (let i = 0; i < side * side; i++) {
      const x = (i % side) * cell + cell / 2;
      const y = Math.floor(i / side) * cell + cell / 2;
      ctx.beginPath();
      ctx.fillStyle = i === winner ? win : dot;
      ctx.arc(x, y, cell * (i === winner && level === 0 ? 0.42 : 0.36), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (level === 2) {
    // 1000 x 1000 pixels: one pixel per dot. Displayed smaller than that, so dots blur into a field.
    const side = 1000;
    canvas.width = side;
    canvas.height = side;
    const img = ctx.createImageData(side, side);
    const parse = (c: string) => {
      ctx.fillStyle = c;
      const hex = ctx.fillStyle; // normalized #rrggbb
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    };
    const [r, g, b] = parse(dot);
    const [wr, wg, wb] = parse(win);
    const winner = seed % (side * side);
    for (let i = 0; i < side * side; i++) {
      const o = i * 4;
      const isWin = i === winner;
      img.data[o] = isWin ? wr! : r!;
      img.data[o + 1] = isWin ? wg! : g!;
      img.data[o + 2] = isWin ? wb! : b!;
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return;
  }

  // 292 million: tiles of 1 million dots each.
  const size = 600;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const tiles = TOTAL_COMBINATIONS / 1e6; // 292.2
  const cols = 17;
  const cell = size / cols;
  ctx.fillStyle = dot;
  const full = Math.floor(tiles);
  for (let i = 0; i < full; i++) {
    ctx.fillRect((i % cols) * cell + 1, Math.floor(i / cols) * cell + 1, cell - 2, cell - 2);
  }
  // The remaining 0.2 million as a partial tile.
  const frac = tiles - full;
  ctx.fillRect((full % cols) * cell + 1, Math.floor(full / cols) * cell + 1, (cell - 2) * frac, cell - 2);
}

export function DotGrid() {
  const [level, setLevel] = useState(0);
  const [seed] = useState(() => randomInt(1_000_000));
  const ref = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors();

  useEffect(() => {
    if (ref.current) draw(ref.current, level, colors, seed);
  }, [level, colors, seed]);

  const captions = [
    "100 dots. One of them, in red, is the winning ticket. Easy to spot.",
    "10,000 dots. The red winner is still in there, a single speck. Can you find it?",
    "1,000,000 dots, one pixel each. The red dot is there, but your screen can't even show it anymore: it's averaged away.",
    `${formatInt(TOTAL_COMBINATIONS)} dots. Each square here is the whole million-dot picture from the last step, and there are 292 of them. One dot, in one square, is the jackpot. That's your ticket's chance.`,
  ];

  return (
    <div className="extra">
      <h3>Making 292 million visible</h3>
      <div className="btn-row" role="group" aria-label="Zoom level">
        {LEVELS.map((l, i) => (
          <button key={l.dots} type="button" className="btn btn--small" aria-pressed={level === i} onClick={() => setLevel(i)}>
            {l.label}
          </button>
        ))}
      </div>
      <figure className="dot-grid">
        <canvas ref={ref} className="dot-grid__canvas" role="img" aria-label={captions[level]} />
        <figcaption aria-live="polite">{captions[level]}</figcaption>
      </figure>
      {level < LEVELS.length - 1 && (
        <button type="button" className="btn" onClick={() => setLevel(level + 1)}>
          Zoom out
        </button>
      )}
    </div>
  );
}
