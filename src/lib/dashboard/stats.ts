/**
 * Labels, units and accessors for each stat the dashboard can compare.
 */

import { percentage, round, roundsInMatch } from './math';
import type {
  CompetitiveMatch,
  CompetitiveSummary,
  StatDefinition,
  StatKey,
} from './types';

export const STAT_DEFINITIONS: Record<StatKey, StatDefinition> = {
  winRate: {
    label: 'Win rate',
    shortLabel: 'Win %',
    description: 'Share of matches won.',
    unit: '%',
    decimals: 0,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 5,
  },
  kast: {
    label: 'KAST',
    shortLabel: 'KAST',
    description:
      'Share of rounds with a kill, an assist, a survival, or a traded death.',
    unit: '%',
    decimals: 1,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 2,
  },
  killDeathRatio: {
    label: 'K/D',
    shortLabel: 'K/D',
    description: 'Kills divided by deaths.',
    unit: '',
    decimals: 2,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 0.05,
  },
  averageDamagePerRound: {
    label: 'ADR',
    shortLabel: 'ADR',
    description: 'Average damage per round.',
    unit: '',
    decimals: 0,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 5,
  },
  averageCombatScore: {
    label: 'ACS',
    shortLabel: 'ACS',
    description: 'Average combat score.',
    unit: '',
    decimals: 0,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 8,
  },
  damageDeltaPerRound: {
    label: 'Damage delta',
    shortLabel: 'Damage delta',
    description: 'Damage dealt minus damage received, per round.',
    unit: '',
    decimals: 0,
    signed: true,
    lowerIsBetter: false,
    steadyBand: 4,
  },
  headshotPercentage: {
    label: 'HS%',
    shortLabel: 'HS%',
    description: 'Share of recorded hits that are headshots.',
    unit: '%',
    decimals: 1,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 1.5,
  },
  deathsPerRound: {
    label: 'Deaths per round',
    shortLabel: 'Deaths/rd',
    description: 'Average deaths each round. Lower is better.',
    unit: '',
    decimals: 2,
    signed: false,
    lowerIsBetter: true,
    steadyBand: 0.02,
  },
  firstDuelBalance: {
    label: 'Opening duel balance',
    shortLabel: 'FK − FD',
    description: 'First kills minus first deaths, per match.',
    unit: '',
    decimals: 1,
    signed: true,
    lowerIsBetter: false,
    steadyBand: 0.3,
  },
  tradedDeathRate: {
    label: 'Traded deaths',
    shortLabel: 'Traded',
    description:
      'Share of deaths where a teammate killed your killer within five seconds.',
    unit: '%',
    decimals: 1,
    signed: false,
    lowerIsBetter: false,
    steadyBand: 3,
  },
};

/** The value of a stat for one match, or null when it cannot be measured. */
export function matchStatValue(
  match: CompetitiveMatch,
  stat: StatKey,
): number | null {
  const { stats } = match;
  const rounds = roundsInMatch(match);

  switch (stat) {
    case 'winRate':
      return match.outcome === 'win' ? 100 : 0;
    case 'kast':
      return stats.kast;
    case 'killDeathRatio':
      return stats.killDeathRatio;
    case 'averageDamagePerRound':
      return stats.averageDamagePerRound;
    case 'averageCombatScore':
      return stats.averageCombatScore;
    case 'damageDeltaPerRound':
      return stats.damageDeltaPerRound;
    case 'headshotPercentage':
      return stats.totalHits === 0 ? null : stats.headshotPercentage;
    case 'deathsPerRound':
      return rounds === 0 ? null : round(stats.deaths / rounds, 2);
    case 'firstDuelBalance':
      return stats.firstBloods === null || stats.firstDeaths === null
        ? null
        : stats.firstBloods - stats.firstDeaths;
    case 'tradedDeathRate':
      return stats.tradedDeaths === null || stats.deaths === 0
        ? null
        : percentage(stats.tradedDeaths, stats.deaths);
  }
}

/** The value of a stat across a summarized set of matches. */
export function summaryStatValue(
  summary: CompetitiveSummary,
  stat: StatKey,
): number | null {
  switch (stat) {
    case 'firstDuelBalance':
      return summary.firstBloods === null ||
        summary.firstDeaths === null ||
        summary.matchCount === 0
        ? null
        : round(
            (summary.firstBloods - summary.firstDeaths) / summary.matchCount,
            1,
          );
    default:
      return summary[stat];
  }
}
