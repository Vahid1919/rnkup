/**
 * Small numeric helpers shared by the dashboard modules.
 */

import type { CompetitiveMatchInput } from './types';

export function round(value: number, decimals = 0): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function percentage(part: number, whole: number, decimals = 1): number {
  return whole === 0 ? 0 : round((part / whole) * 100, decimals);
}

export function mostFrequent<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let result: T | null = null;
  let highestCount = 0;
  for (const [value, count] of counts) {
    if (count > highestCount) {
      result = value;
      highestCount = count;
    }
  }

  return result;
}

export function calculateKillAssistDeathRatio(
  kills: number,
  deaths: number,
  assists: number,
): number {
  return round((kills + assists) / Math.max(deaths, 1), 2);
}

export function roundsInMatch(
  match: Pick<CompetitiveMatchInput, 'score'>,
): number {
  return match.score.won + match.score.lost;
}
