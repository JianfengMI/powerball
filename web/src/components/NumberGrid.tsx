import { useRef, useState, type KeyboardEvent } from "react";

const COLUMNS = 10;

/**
 * A grid of toggle buttons (aria-pressed). One Tab stop per grid; arrow keys move between
 * numbers (roving tabindex), Home/End jump to the ends, Space/Enter toggle.
 */
export function NumberGrid({
  max,
  selected,
  onToggle,
  red = false,
  label,
}: {
  max: number;
  selected: readonly number[];
  onToggle: (n: number) => void;
  red?: boolean;
  label: string;
}) {
  const [focusN, setFocusN] = useState(1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (n: number) => {
    const clamped = Math.min(max, Math.max(1, n));
    setFocusN(clamped);
    refs.current[clamped]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const map: Record<string, number> = {
      ArrowRight: n + 1,
      ArrowLeft: n - 1,
      ArrowDown: n + COLUMNS,
      ArrowUp: n - COLUMNS,
      Home: 1,
      End: max,
    };
    const target = map[e.key];
    if (target !== undefined) {
      e.preventDefault();
      move(target);
    }
  };

  return (
    <div className={`num-grid ${red ? "num-grid--red" : ""}`} role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const on = selected.includes(n);
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[n] = el;
            }}
            type="button"
            className="num-grid__btn"
            aria-pressed={on}
            aria-label={`${red ? "Powerball" : "White ball"} ${n}`}
            tabIndex={n === focusN ? 0 : -1}
            onFocus={() => setFocusN(n)}
            onKeyDown={(e) => onKeyDown(e, n)}
            onClick={() => onToggle(n)}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
