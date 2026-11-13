/**
 * Time windows for the rank rating chart. A window counts back from the
 * player's latest rated game, not from today, so someone back from a break
 * still sees their last stretch of games instead of an empty chart.
 */

import type { RatingPoint } from './types';

export type RatingRange = '1w' | '2w' | '1m' | '3m' | '6m' | '1y' | 'all';

/** A window length in calendar days or calendar months. */
export type RatingWindow = { days: number } | { months: number };

export type RatingRangeOption = {
  id: RatingRange;
  /** Short label for the control, e.g. "3M". */
  label: string;
  /** Spoken and tooltip label, e.g. "3 months". */
  title: string;
  /** Length of the window, or null for the whole history. */
  window: RatingWindow | null;
};

export const RATING_RANGES: RatingRangeOption[] = [
  { id: '1w', label: '1W', title: '1 week', window: { days: 7 } },
  { id: '2w', label: '2W', title: '2 weeks', window: { days: 14 } },
  { id: '1m', label: '1M', title: '1 month', window: { months: 1 } },
  { id: '3m', label: '3M', title: '3 months', window: { months: 3 } },
  { id: '6m', label: '6M', title: '6 months', window: { months: 6 } },
  { id: '1y', label: '1Y', title: '1 year', window: { months: 12 } },
  { id: 'all', label: 'All', title: 'All time', window: null },
];

export const DEFAULT_RATING_RANGE: RatingRange = '3m';

/** The start of a window that ends at `end`. */
function windowStart(end: string, window: RatingWindow): number {
  const start = new Date(end);
  if ('days' in window) start.setUTCDate(start.getUTCDate() - window.days);
  else start.setUTCMonth(start.getUTCMonth() - window.months);
  return start.getTime();
}

/** Rating points inside the window before the latest point, oldest first. */
export function ratingPointsInRange(
  history: RatingPoint[],
  window: RatingWindow | null,
): RatingPoint[] {
  const latest = history.at(-1);
  if (window === null || !latest) return history;

  const start = windowStart(latest.date, window);
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
  if (!first || !latest) return RATING_RANGES.filter((range) => !range.window);

  const firstTime = new Date(first.date).getTime();
  return RATING_RANGES.filter(
    (range) =>
      range.window === null ||
      windowStart(latest.date, range.window) > firstTime,
  );
}

/** Net RR gained or lost across the given points. */
export function ratingChange(points: RatingPoint[]): number {
  return points.reduce((total, point) => total + point.change, 0);
}
