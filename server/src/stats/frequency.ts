import {
  POWERBALL_MAX,
  WHITE_COUNT,
  WHITE_MAX,
  type DrawRecord,
  type FrequencyResponse,
  type NumberFrequency,
} from "@powerball/shared";
import { chiSquareUniformTest } from "./chiSquare";

export function countNumbers(draws: readonly DrawRecord[]): { whites: number[]; powerballs: number[] } {
  const whites = new Array<number>(WHITE_MAX).fill(0);
  const powerballs = new Array<number>(POWERBALL_MAX).fill(0);
  for (const d of draws) {
    for (const w of d.whites) whites[w - 1]!++;
    powerballs[d.powerball - 1]!++;
  }
  return { whites, powerballs };
}

export function computeFrequency(draws: readonly DrawRecord[]): FrequencyResponse {
  const n = draws.length;
  const counts = countNumbers(draws);
  const toFreq = (list: number[], expected: number): NumberFrequency[] =>
    list.map((count, i) => ({ number: i + 1, count, expected }));
  return {
    drawCount: n,
    whites: toFreq(counts.whites, (n * WHITE_COUNT) / WHITE_MAX),
    powerballs: toFreq(counts.powerballs, n / POWERBALL_MAX),
    whiteTest: chiSquareUniformTest(counts.whites, WHITE_COUNT),
    powerballTest: chiSquareUniformTest(counts.powerballs, 1),
  };
}
