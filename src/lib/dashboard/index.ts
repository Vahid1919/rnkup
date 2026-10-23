/**
 * The dashboard module: turns one player's matches into everything the
 * player and match pages show. It is pure (no network, no caching), so it
 * can be tested with plain objects.
 *
 * Callers import from `$lib/dashboard` only. The files in this folder import
 * from each other directly, never from this index.
 */

import { getAgentRole } from '../agents';
import type { PlayerProfile } from '../player-profile';
import {
  buildBreakdown,
  buildSessionSplit,
  buildSideSplit,
} from './breakdowns';
import { buildWinDrivers } from './drivers';
import { buildActSummaries, buildMatchLog } from './history';
import { buildInsights, type InsightReport } from './insights';
import { calculateKillAssistDeathRatio, round } from './math';
import { buildLobbyBenchmarks, summarizeCompetitiveMatches } from './summary';
import { buildFormTrends, buildCumulativeSeries } from './trends';
import type {
  ActSummary,
  BreakdownRow,
  CareerMatchInput,
  CompetitiveMatch,
  CompetitiveMatchInput,
  CompetitiveSummary,
  FormTrend,
  LobbyBenchmarks,
  MatchLogEntry,
  PlayerRating,
  RatingPoint,
  SeriesKey,
  SeriesPoint,
  SessionSplit,
  SideSplit,
  WinDriver,
} from './types';

export type * from './types';
export { RELIABLE_SAMPLE_MATCHES } from './breakdowns';
export { STAT_DEFINITIONS } from './stats';
export { summarizeMatchForPlayer } from './match-summary';
export {
  buildMatchTakeaways,
  MINIMUM_COACHING_MATCHES,
  type Insight,
  type InsightFamily,
  type InsightReport,
  type MatchTakeaway,
} from './insights';

export type CompetitivePerformance = {
  matches: CompetitiveMatch[];
  summary: CompetitiveSummary;
  benchmarks: LobbyBenchmarks | null;
  trends: FormTrend[];
  series: Record<SeriesKey, SeriesPoint[]>;
  breakdowns: {
    agents: BreakdownRow[];
    maps: BreakdownRow[];
    roles: BreakdownRow[];
  };
  sides: SideSplit | null;
  sessions: SessionSplit | null;
  drivers: WinDriver[];
  insights: InsightReport;
};

export type PlayerDashboard = CompetitivePerformance & {
  profile: PlayerProfile;
  rating: PlayerRating | null;
  ratingHistory: RatingPoint[];
  acts: ActSummary[];
  matchLog: MatchLogEntry[];
};

export function buildCompetitivePerformance(
  matchInputs: CompetitiveMatchInput[],
): CompetitivePerformance {
  const matches = [...matchInputs]
    .sort((first, second) => second.startedAt.localeCompare(first.startedAt))
    .map(
      (match): CompetitiveMatch => ({
        ...match,
        stats: {
          ...match.stats,
          killDeathRatio: round(
            match.stats.kills / Math.max(match.stats.deaths, 1),
            2,
          ),
          killAssistDeathRatio: calculateKillAssistDeathRatio(
            match.stats.kills,
            match.stats.deaths,
            match.stats.assists,
          ),
        },
      }),
    );
  const chronological = [...matches].reverse();
  const summary = summarizeCompetitiveMatches(matches);
  const benchmarks = buildLobbyBenchmarks(matches);
  const trends = buildFormTrends(matches);
  const agentIds = new Map(
    matches.map((match) => [match.agentName, match.agentId]),
  );
  const breakdowns = {
    agents: buildBreakdown(matches, (match) => match.agentName).map((row) => ({
      ...row,
      agentId: agentIds.get(row.name) ?? null,
    })),
    maps: buildBreakdown(matches, (match) => match.mapName),
    roles: buildBreakdown(matches, (match) => getAgentRole(match.agentName)),
  };
  const sides = buildSideSplit(matches);
  const sessions = buildSessionSplit(chronological);
  const drivers = buildWinDrivers(matches);

  return {
    matches,
    summary,
    benchmarks,
    trends,
    series: {
      winRate: buildCumulativeSeries(chronological, 'winRate'),
      kast: buildCumulativeSeries(chronological, 'kast'),
      killDeathRatio: buildCumulativeSeries(chronological, 'killDeathRatio'),
      averageDamagePerRound: buildCumulativeSeries(
        chronological,
        'averageDamagePerRound',
      ),
    },
    breakdowns,
    sides,
    sessions,
    drivers,
    insights: buildInsights({
      summary,
      benchmarks,
      trends,
      breakdowns,
      sides,
      sessions,
      drivers,
    }),
  };
}

export function buildPlayerDashboard(input: {
  profile: PlayerProfile;
  matches: CompetitiveMatchInput[];
  careerMatches?: CareerMatchInput[];
  rating?: PlayerRating | null;
  ratingHistory?: RatingPoint[];
}): PlayerDashboard {
  const performance = buildCompetitivePerformance(input.matches);
  const rating = input.rating ?? null;
  const ratingHistory = [...(input.ratingHistory ?? [])].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
  const matchLog = buildMatchLog(
    performance.matches,
    input.careerMatches ?? [],
    ratingHistory,
  );

  return {
    profile: input.profile,
    rating,
    ratingHistory,
    ...performance,
    acts: buildActSummaries(matchLog, rating),
    matchLog,
  };
}
