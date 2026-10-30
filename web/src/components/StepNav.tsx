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
    // Looks the sections up on every check rather than observing elements once: lazy-loaded
    // steps replace their placeholder sections after mount.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let active: string = STEPS[0].id;
      for (const s of STEPS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) active = s.id;
      }
      setCurrent(active);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
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
