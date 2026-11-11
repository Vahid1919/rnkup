/**
 * Time windows for the rank rating chart. A window counts back from the
 * player's latest rated game, not from today, so someone back from a break
 * still sees their last stretch of games instead of an empty chart.
 */

import type { RatingPoint } from './types';

export type RatingRange = '1m' | '3m' | '6m' | '1y' | 'all';

export type RatingRangeOption = {
  id: RatingRange;
  /** Short label for the control, e.g. "3M". */
  label: string;
  /** Spoken and tooltip label, e.g. "3 months". */
  title: string;
  /** Length of the window, or null for the whole history. */
  months: number | null;
};

export const RATING_RANGES: RatingRangeOption[] = [
  { id: '1m', label: '1M', title: '1 month', months: 1 },
  { id: '3m', label: '3M', title: '3 months', months: 3 },
  { id: '6m', label: '6M', title: '6 months', months: 6 },
  { id: '1y', label: '1Y', title: '1 year', months: 12 },
  { id: 'all', label: 'All', title: 'All time', months: null },
];

export const DEFAULT_RATING_RANGE: RatingRange = '3m';

/** The start of a window that ends at `end` and lasts `months`. */
function windowStart(end: string, months: number): number {
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - months);
  return start.getTime();
}

/** Rating points from the last `months` before the latest point, oldest first. */
export function ratingPointsInRange(
  history: RatingPoint[],
  months: number | null,
): RatingPoint[] {
  const latest = history.at(-1);
  if (months === null || !latest) return history;

  const start = windowStart(latest.date, months);
  return history.filter((point) => new Date(point.date).getTime() >= start);
}

/**
 * The ranges worth offering: each one that shows less than the whole
 * history, plus "All". A 6-month button on 2 months of games would only
 * repeat "All".
 */
export function availableRatingRanges(
  history: RatingPoint[],
): RatingRangeOption[] {
  const first = history.at(0);
  const latest = history.at(-1);
  if (!first || !latest) return RATING_RANGES.filter((range) => !range.months);

  const firstTime = new Date(first.date).getTime();
  return RATING_RANGES.filter(
    (range) =>
      range.months === null ||
      windowStart(latest.date, range.months) > firstTime,
  );
}

/** Net RR gained or lost across the given points. */
export function ratingChange(points: RatingPoint[]): number {
  return points.reduce((total, point) => total + point.change, 0);
}
