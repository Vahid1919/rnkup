/**
 * Which stats most separate a player's wins from their losses.
 */

import { percentage, round } from './math';
import { matchStatValue, STAT_DEFINITIONS } from './stats';
import type { CompetitiveMatch, StatKey, WinDriver } from './types';

const MINIMUM_DRIVER_MATCHES = 12;
const MINIMUM_DRIVER_GROUP = 4;

const DRIVER_STATS: StatKey[] = [
  'kast',
  'killDeathRatio',
  'averageDamagePerRound',
  'averageCombatScore',
  'damageDeltaPerRound',
  'headshotPercentage',
  'deathsPerRound',
  'firstDuelBalance',
  'tradedDeathRate',
];

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * For each stat, compares the win rate of matches on the better side of the
 * player's own median with the rest. Draws are left out.
 */
export function buildWinDrivers(matches: CompetitiveMatch[]): WinDriver[] {
  const decided = matches.filter((match) => match.outcome !== 'draw');

  return DRIVER_STATS.flatMap((stat): WinDriver[] => {
    const samples = decided.flatMap((match) => {
      const value = matchStatValue(match, stat);
      return value === null ? [] : [{ value, won: match.outcome === 'win' }];
    });
    if (samples.length < MINIMUM_DRIVER_MATCHES) return [];

    const definition = STAT_DEFINITIONS[stat];
    const threshold = median(samples.map((sample) => sample.value));
    const good = samples.filter((sample) =>
      definition.lowerIsBetter
        ? sample.value < threshold
        : sample.value > threshold,
    );
    const bad = samples.filter((sample) => !good.includes(sample));
    if (
      good.length < MINIMUM_DRIVER_GROUP ||
      bad.length < MINIMUM_DRIVER_GROUP
    ) {
      return [];
    }

    const winRateOf = (group: typeof samples): number =>
      percentage(group.filter((sample) => sample.won).length, group.length, 0);
    const goodWinRate = winRateOf(good);
    const badWinRate = winRateOf(bad);

    return [
      {
        stat,
        threshold: round(threshold, definition.decimals),
        goodWinRate,
        badWinRate,
        goodCount: good.length,
        badCount: bad.length,
        gap: goodWinRate - badWinRate,
      },
    ];
  }).sort((first, second) => second.gap - first.gap);
}
