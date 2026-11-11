/**
 * Types shared by the dashboard modules: the per-match input built from
 * provider data, and every shape the dashboard returns.
 */

import type { AgentRole } from '../agents';
import type { Rank } from '../ranks';

export type MatchOutcome = 'win' | 'loss' | 'draw';

export type SideRecord = {
  roundsWon: number;
  roundsPlayed: number;
};

/** Averages of the other players in the same match. */
export type LobbyAverages = {
  averageCombatScore: number;
  averageDamagePerRound: number;
  headshotPercentage: number;
  killDeathRatio: number;
  deathsPerRound: number;
  kast: number | null;
  tradedDeathRate: number | null;
};

type CompetitiveMatchInputStatistics = {
  kills: number;
  deaths: number;
  assists: number;
  averageCombatScore: number;
  averageDamagePerRound: number;
  damageDeltaPerRound: number | null;
  headshots: number;
  bodyshots: number;
  legshots: number;
  totalHits: number;
  headshotPercentage: number;
  /** The fields below are null when the match has no round-by-round data. */
  kast: number | null;
  firstBloods: number | null;
  firstDeaths: number | null;
  firstBloodRoundsWon: number | null;
  firstDeathRoundsWon: number | null;
  tradedDeaths: number | null;
  multiKills: number | null;
};

type CompetitiveMatchStatistics = CompetitiveMatchInputStatistics & {
  killDeathRatio: number;
  killAssistDeathRatio: number;
};

export type CompetitiveMatchInput = {
  id: string;
  startedAt: string;
  mapName: string;
  agentName: string;
  agentId: string | null;
  seasonShort: string | null;
  rank: Rank | null;
  outcome: MatchOutcome;
  score: {
    won: number;
    lost: number;
  };
  durationMs: number | null;
  /** 1 is the highest combat score among all players in the match. */
  placement: number | null;
  stats: CompetitiveMatchInputStatistics;
  sides: { attack: SideRecord; defense: SideRecord } | null;
  lobby: LobbyAverages | null;
};

export type CompetitiveMatch = Omit<CompetitiveMatchInput, 'stats'> & {
  stats: CompetitiveMatchStatistics;
};

/** A lightweight match from the provider's long-term stored history. */
export type CareerMatchInput = {
  id: string;
  startedAt: string;
  mapName: string;
  agentName: string;
  agentId: string | null;
  seasonShort: string | null;
  rank: Rank | null;
  outcome: MatchOutcome;
  score: {
    won: number;
    lost: number;
  };
  kills: number;
  deaths: number;
  assists: number;
  averageCombatScore: number;
  averageDamagePerRound: number;
  damageDeltaPerRound: number | null;
  headshotPercentage: number;
};

export type MatchLogEntry = CareerMatchInput & {
  killDeathRatio: number;
  kast: number | null;
  placement: number | null;
  firstBloods: number | null;
  firstDeaths: number | null;
  ratingChange: number | null;
  /** True when round-by-round statistics are available for this match. */
  detailed: boolean;
};

export type PlayerRating = {
  current: { rank: Rank; rr: number; lastChange: number | null } | null;
  peak: { rank: Rank; seasonShort: string | null } | null;
  seasons: {
    seasonShort: string;
    games: number;
    wins: number;
    endRank: Rank | null;
  }[];
};

export type RatingPoint = {
  matchId: string | null;
  date: string;
  rank: Rank;
  rr: number;
  change: number;
  /** Cumulative rating: 100 points per tier below Immortal. */
  rating: number;
};

export type CompetitiveSummary = {
  matchCount: number;
  roundCount: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  killDeathRatio: number;
  killAssistDeathRatio: number;
  averageCombatScore: number;
  averageDamagePerRound: number;
  damageDeltaPerRound: number | null;
  headshotPercentage: number;
  kast: number | null;
  killsPerRound: number;
  deathsPerRound: number;
  averageKills: number;
  averageDeaths: number;
  averageAssists: number;
  firstBloods: number | null;
  firstDeaths: number | null;
  firstBloodRoundWinRate: number | null;
  firstDeathRoundWinRate: number | null;
  tradedDeathRate: number | null;
  multiKills: number | null;
  /** Null when no match reported its length. */
  playtimeMs: number | null;
  averagePlacement: number | null;
  accuracy: { head: number; body: number; legs: number };
  mostPlayedAgent: string | null;
  mostPlayedMap: string | null;
  mostPlayedRole: AgentRole | null;
  from: string | null;
  to: string | null;
};

export type StatKey =
  | 'winRate'
  | 'kast'
  | 'killDeathRatio'
  | 'averageDamagePerRound'
  | 'averageCombatScore'
  | 'damageDeltaPerRound'
  | 'headshotPercentage'
  | 'deathsPerRound'
  | 'firstDuelBalance'
  | 'tradedDeathRate';

export type StatDefinition = {
  label: string;
  shortLabel: string;
  description: string;
  unit: '%' | '';
  decimals: number;
  signed: boolean;
  lowerIsBetter: boolean;
  /** Changes smaller than this are reported as steady. */
  steadyBand: number;
};

export type LobbyBenchmarks = LobbyAverages & {
  matchCount: number;
};

export type FormTrend = {
  stat: StatKey;
  recent: number;
  previous: number;
  delta: number;
  direction: 'improving' | 'declining' | 'steady';
  windowSize: number;
};

export type SeriesPoint = {
  matchId: string;
  startedAt: string;
  outcome: MatchOutcome;
  /** Average of every match up to and including this one. */
  value: number;
  /** This match on its own, or null when it has no value for the stat. */
  matchValue: number | null;
  windowMatchCount: number;
};

export type SeriesKey =
  | 'winRate'
  | 'kast'
  | 'killDeathRatio'
  | 'averageDamagePerRound';

export type BreakdownRow = {
  name: string;
  agentId: string | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  killDeathRatio: number;
  averageDamagePerRound: number;
  averageCombatScore: number;
  headshotPercentage: number;
  kast: number | null;
};

export type SideSplit = {
  attack: SideRecord & { winRate: number };
  defense: SideRecord & { winRate: number };
};

export type SessionSplit = {
  early: { matches: number; winRate: number };
  late: { matches: number; winRate: number };
};

/** How a player's win rate differs on either side of their own median. */
export type WinDriver = {
  stat: StatKey;
  threshold: number;
  goodWinRate: number;
  badWinRate: number;
  goodCount: number;
  badCount: number;
  gap: number;
};

export type ActSummary = {
  seasonShort: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  killDeathRatio: number;
  averageDamagePerRound: number;
  averageCombatScore: number;
  headshotPercentage: number;
  endRank: Rank | null;
};
