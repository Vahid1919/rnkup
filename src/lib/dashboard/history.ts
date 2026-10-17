/**
 * The match log and per-act summaries.
 */

import { percentage, round, roundsInMatch } from './math';
import type {
  ActSummary,
  CareerMatchInput,
  CompetitiveMatch,
  MatchLogEntry,
  PlayerRating,
  RatingPoint,
} from './types';

function toLogEntry(
  match: CompetitiveMatch,
  ratingChange: number | null,
): MatchLogEntry {
  return {
    id: match.id,
    startedAt: match.startedAt,
    mapName: match.mapName,
    agentName: match.agentName,
    agentId: match.agentId,
    seasonShort: match.seasonShort,
    rank: match.rank,
    outcome: match.outcome,
    score: match.score,
    kills: match.stats.kills,
    deaths: match.stats.deaths,
    assists: match.stats.assists,
    averageCombatScore: match.stats.averageCombatScore,
    averageDamagePerRound: match.stats.averageDamagePerRound,
    damageDeltaPerRound: match.stats.damageDeltaPerRound,
    headshotPercentage: match.stats.headshotPercentage,
    killDeathRatio: match.stats.killDeathRatio,
    kast: match.stats.kast,
    placement: match.placement,
    firstBloods: match.stats.firstBloods,
    firstDeaths: match.stats.firstDeaths,
    ratingChange,
    detailed: match.stats.kast !== null,
  };
}

/** Merges detailed recent matches with the longer stored history. */
export function buildMatchLog(
  matches: CompetitiveMatch[],
  careerMatches: CareerMatchInput[],
  ratingHistory: RatingPoint[],
): MatchLogEntry[] {
  const ratingChanges = new Map(
    ratingHistory.flatMap((point): [string, number][] =>
      point.matchId === null ? [] : [[point.matchId, point.change]],
    ),
  );
  const entries = new Map<string, MatchLogEntry>();

  for (const match of careerMatches) {
    entries.set(match.id, {
      ...match,
      killDeathRatio: round(match.kills / Math.max(match.deaths, 1), 2),
      kast: null,
      placement: null,
      firstBloods: null,
      firstDeaths: null,
      ratingChange: ratingChanges.get(match.id) ?? null,
      detailed: false,
    });
  }
  for (const match of matches) {
    entries.set(
      match.id,
      toLogEntry(match, ratingChanges.get(match.id) ?? null),
    );
  }

  return [...entries.values()].sort((first, second) =>
    second.startedAt.localeCompare(first.startedAt),
  );
}

export function buildActSummaries(
  matchLog: MatchLogEntry[],
  rating: PlayerRating | null,
): ActSummary[] {
  const groups = new Map<string, MatchLogEntry[]>();
  for (const entry of matchLog) {
    if (entry.seasonShort === null) continue;
    const group = groups.get(entry.seasonShort) ?? [];
    group.push(entry);
    groups.set(entry.seasonShort, group);
  }

  return [...groups.entries()]
    .map(([seasonShort, entries]) => {
      const totals = entries.reduce(
        (sum, entry) => {
          const rounds = roundsInMatch(entry);
          sum.kills += entry.kills;
          sum.deaths += entry.deaths;
          sum.rounds += rounds;
          sum.damage += entry.averageDamagePerRound * rounds;
          sum.score += entry.averageCombatScore * rounds;
          sum.headshot += entry.headshotPercentage;
          if (entry.outcome === 'win') sum.wins += 1;
          if (entry.outcome === 'loss') sum.losses += 1;
          if (entry.outcome === 'draw') sum.draws += 1;
          return sum;
        },
        {
          kills: 0,
          deaths: 0,
          rounds: 0,
          damage: 0,
          score: 0,
          headshot: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        },
      );

      return {
        latest: entries[0].startedAt,
        summary: {
          seasonShort,
          matches: entries.length,
          wins: totals.wins,
          losses: totals.losses,
          draws: totals.draws,
          winRate: percentage(totals.wins, entries.length),
          killDeathRatio: round(totals.kills / Math.max(totals.deaths, 1), 2),
          averageDamagePerRound:
            totals.rounds === 0 ? 0 : round(totals.damage / totals.rounds),
          averageCombatScore:
            totals.rounds === 0 ? 0 : round(totals.score / totals.rounds),
          headshotPercentage: round(totals.headshot / entries.length, 1),
          endRank:
            rating?.seasons.find((season) => season.seasonShort === seasonShort)
              ?.endRank ?? null,
        } satisfies ActSummary,
      };
    })
    .sort((first, second) => second.latest.localeCompare(first.latest))
    .map((group) => group.summary);
}
