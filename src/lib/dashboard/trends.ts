/**
 * Recent form compared with earlier form, and all-time chart series.
 */

import { round } from './math';
import { matchStatValue, STAT_DEFINITIONS, summaryStatValue } from './stats';
import { summarizeCompetitiveMatches } from './summary';
import type {
  CompetitiveMatch,
  FormTrend,
  SeriesKey,
  SeriesPoint,
  StatKey,
} from './types';

const MINIMUM_TREND_WINDOW = 5;

const TREND_STATS: StatKey[] = [
  'winRate',
  'kast',
  'killDeathRatio',
  'averageDamagePerRound',
  'averageCombatScore',
  'damageDeltaPerRound',
  'headshotPercentage',
  'firstDuelBalance',
  'tradedDeathRate',
];

/** Compares the newer half of the loaded matches with the older half. */
export function buildFormTrends(matches: CompetitiveMatch[]): FormTrend[] {
  const windowSize = Math.floor(matches.length / 2);
  if (windowSize < MINIMUM_TREND_WINDOW) return [];

  const recent = summarizeCompetitiveMatches(matches.slice(0, windowSize));
  const previous = summarizeCompetitiveMatches(
    matches.slice(windowSize, windowSize * 2),
  );

  return TREND_STATS.flatMap((stat): FormTrend[] => {
    const recentValue = summaryStatValue(recent, stat);
    const previousValue = summaryStatValue(previous, stat);
    if (recentValue === null || previousValue === null) return [];

    const definition = STAT_DEFINITIONS[stat];
    const delta = round(recentValue - previousValue, definition.decimals);
    const improved = definition.lowerIsBetter ? delta < 0 : delta > 0;
    return [
      {
        stat,
        recent: recentValue,
        previous: previousValue,
        delta,
        direction:
          Math.abs(delta) < definition.steadyBand
            ? 'steady'
            : improved
              ? 'improving'
              : 'declining',
        windowSize,
      },
    ];
  });
}

/** Each point averages every match up to and including that one. */
export function buildCumulativeSeries(
  chronological: CompetitiveMatch[],
  stat: SeriesKey,
): SeriesPoint[] {
  return chronological.flatMap((match, index): SeriesPoint[] => {
    const window = chronological.slice(0, index + 1);
    const value = summaryStatValue(summarizeCompetitiveMatches(window), stat);
    if (value === null) return [];

    return [
      {
        matchId: match.id,
        startedAt: match.startedAt,
        outcome: match.outcome,
        value,
        matchValue: matchStatValue(match, stat),
        windowMatchCount: window.length,
      },
    ];
  });
}
