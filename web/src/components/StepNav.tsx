import { useEffect, useState } from "react";

export const STEPS = [
  { id: "step-1", short: "Pick", title: "Pick your numbers" },
  { id: "step-2", short: "Draw", title: "Watch the draw" },
  { id: "step-3", short: "Odds", title: "See the odds" },
  { id: "step-4", short: "Play", title: "Play until you win" },
  { id: "step-5", short: "History", title: "Your numbers vs. history" },
  { id: "step-6", short: "Hot?", title: 'Is anything "hot"?' },
  { id: "step-7", short: "Myths", title: "Myths" },
  { id: "extras", short: "Extras", title: "Extras" },
] as const;

/** Sticky progress nav; highlights the step currently on screen. */
export function StepNav() {
  const [current, setCurrent] = useState<string>(STEPS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        // The topmost step that is meaningfully on screen.
        const first = STEPS.find((s) => (visible.get(s.id) ?? 0) > 0);
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.01] },
    );
    for (const s of STEPS) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav className="step-nav" aria-label="Story steps">
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={s.id === current ? "step" : undefined}
              className={i < currentIndex ? "is-done" : undefined}
              title={s.title}
            >
              <span className="step-nav__num" aria-hidden="true">
                {i < 7 ? i + 1 : "+"}
              </span>
              <span className="step-nav__label" aria-hidden="true">
                {s.short}
              </span>
              <span className="visually-hidden">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
