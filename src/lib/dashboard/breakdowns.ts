/**
 * Results grouped by agent, map, role, side and play session.
 */

import { percentage } from './math';
import { summarizeCompetitiveMatches } from './summary';
import type {
  BreakdownRow,
  CompetitiveMatch,
  SessionSplit,
  SideSplit,
} from './types';

/**
 * Fewest matches before a group's win rate is worth acting on. Coaching only
 * headlines groups this large, and the breakdown tables fade smaller ones.
 */
export const RELIABLE_SAMPLE_MATCHES = 8;

const SESSION_GAP_MS = 2.5 * 60 * 60 * 1000;

export function buildBreakdown(
  matches: CompetitiveMatch[],
  keyOf: (match: CompetitiveMatch) => string | null,
): BreakdownRow[] {
  const groups = new Map<string, CompetitiveMatch[]>();
  for (const match of matches) {
    const key = keyOf(match);
    if (key === null) continue;
    const group = groups.get(key) ?? [];
    group.push(match);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([name, group]): BreakdownRow => {
      const summary = summarizeCompetitiveMatches(group);
      return {
        name,
        agentId: null,
        matches: summary.matchCount,
        wins: summary.wins,
        losses: summary.losses,
        draws: summary.draws,
        winRate: summary.winRate,
        killDeathRatio: summary.killDeathRatio,
        averageDamagePerRound: summary.averageDamagePerRound,
        averageCombatScore: summary.averageCombatScore,
        headshotPercentage: summary.headshotPercentage,
        kast: summary.kast,
      };
    })
    .sort(
      (first, second) =>
        second.matches - first.matches || second.winRate - first.winRate,
    );
}

export function buildSideSplit(matches: CompetitiveMatch[]): SideSplit | null {
  const totals = {
    attack: { roundsWon: 0, roundsPlayed: 0 },
    defense: { roundsWon: 0, roundsPlayed: 0 },
  };
  for (const match of matches) {
    if (!match.sides) continue;
    for (const side of ['attack', 'defense'] as const) {
      totals[side].roundsWon += match.sides[side].roundsWon;
      totals[side].roundsPlayed += match.sides[side].roundsPlayed;
    }
  }

  if (totals.attack.roundsPlayed === 0 || totals.defense.roundsPlayed === 0) {
    return null;
  }

  return {
    attack: {
      ...totals.attack,
      winRate: percentage(totals.attack.roundsWon, totals.attack.roundsPlayed),
    },
    defense: {
      ...totals.defense,
      winRate: percentage(
        totals.defense.roundsWon,
        totals.defense.roundsPlayed,
      ),
    },
  };
}

/**
 * Splits matches by their position in a playing session. A new session
 * starts after a gap of more than two and a half hours between match starts.
 */
export function buildSessionSplit(
  chronological: CompetitiveMatch[],
): SessionSplit | null {
  const early = { matches: 0, wins: 0 };
  const late = { matches: 0, wins: 0 };
  let position = 0;
  let previousStart: number | null = null;

  for (const match of chronological) {
    const start = Date.parse(match.startedAt);
    if (Number.isNaN(start)) continue;

    position =
      previousStart !== null && start - previousStart <= SESSION_GAP_MS
        ? position + 1
        : 1;
    previousStart = start;

    const bucket = position <= 2 ? early : late;
    bucket.matches += 1;
    if (match.outcome === 'win') bucket.wins += 1;
  }

  if (early.matches === 0 || late.matches === 0) return null;

  return {
    early: {
      matches: early.matches,
      winRate: percentage(early.wins, early.matches),
    },
    late: {
      matches: late.matches,
      winRate: percentage(late.wins, late.matches),
    },
  };
}
