import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CheckResponse,
  DrawsResponse,
  FrequencyResponse,
  GapsResponse,
  SummaryResponse,
  SumsResponse,
  Ticket,
} from "@powerball/shared";

/**
 * Fields the lead announced for /api/check beyond the current api.ts contract.
 * Treated as optional so the page works against either version of the backend.
 */
export interface CheckResponseExt extends CheckResponse {
  ticket?: { whites: number[]; powerball: number };
  /** Winning draws only, oldest first. */
  winHistory?: { date: string; tierId: string }[];
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiRequestError("Couldn't reach the data server. It may be starting up (this can take up to a minute).");
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiRequestError(
      res.ok
        ? "The data server sent an unexpected response."
        : "Couldn't reach the data server. It may be down or starting up (this can take up to a minute).",
      res.status,
    );
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error;
    throw new ApiRequestError(msg ? `The data server said: ${msg}` : `The data server returned an error (${res.status}).`, res.status);
  }
  return body as T;
}

export const api = {
  summary: (s?: AbortSignal) => fetchJson<SummaryResponse>("/api/stats/summary", s),
  frequency: (s?: AbortSignal) => fetchJson<FrequencyResponse>("/api/stats/frequency", s),
  sums: (s?: AbortSignal) => fetchJson<SumsResponse>("/api/stats/sums", s),
  gaps: (s?: AbortSignal) => fetchJson<GapsResponse>("/api/stats/gaps", s),
  draws: (s?: AbortSignal) => fetchJson<DrawsResponse>("/api/draws", s),
  check: (t: Ticket, s?: AbortSignal) =>
    fetchJson<CheckResponseExt>(
      `/api/check?whites=${[...t.whites].sort((a, b) => a - b).join(",")}&pb=${t.powerball}`,
      s,
    ),
};

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

/** Runs `load` when `key` changes (null key = don't load). Aborts stale requests. */
export function useApi<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    loadRef
      .current(ctrl.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError(e.message || "Something went wrong loading the data.");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, loading, retry };
}
