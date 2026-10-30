import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import type { ThemeColors } from "./hooks";

ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

export function baseOptions(c: ThemeColors, reducedMotion: boolean): ChartOptions<"bar" | "line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 600 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: c.text, boxWidth: 14 } },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: c.muted, maxRotation: 0, autoSkipPadding: 6 }, grid: { color: c.grid } },
      y: { ticks: { color: c.muted }, grid: { color: c.grid }, beginAtZero: true },
    },
  };
}
