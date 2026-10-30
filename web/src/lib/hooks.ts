import { useEffect, useState } from "react";

function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export interface ThemeColors {
  text: string;
  muted: string;
  grid: string;
  accent: string;
  white: string;
  whiteBorder: string;
  expected: string;
  gold: string;
  green: string;
}

function readColors(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    text: v("--text"),
    muted: v("--muted"),
    grid: v("--chart-grid"),
    accent: v("--accent"),
    white: v("--chart-white"),
    whiteBorder: v("--chart-white-border"),
    expected: v("--gold"),
    gold: v("--gold"),
    green: v("--match"),
  };
}

/** Theme colors from the CSS custom properties, updated when the color scheme changes. */
export function useThemeColors(): ThemeColors {
  const light = useMediaQuery("(prefers-color-scheme: light)");
  const [colors, setColors] = useState(readColors);
  useEffect(() => setColors(readColors()), [light]);
  return colors;
}
