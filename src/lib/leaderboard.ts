/**
 * The regional competitive leaderboard: application-owned types and the pure
 * rules for reading the page URL and paging through it.
 */

import type { Rank } from '$lib/ranks';

export const LEADERBOARD_REGIONS = [
  { id: 'eu', label: 'Europe' },
  { id: 'na', label: 'North America' },
  { id: 'ap', label: 'Asia Pacific' },
  { id: 'kr', label: 'Korea' },
  { id: 'br', label: 'Brazil' },
  { id: 'latam', label: 'Latin America' },
] as const;

export type LeaderboardRegion = (typeof LEADERBOARD_REGIONS)[number]['id'];

/** `radiant` keeps only Radiant players; `immortal` is the whole board. */
export type LeaderboardTierFilter = 'radiant' | 'immortal';

export const LEADERBOARD_PAGE_SIZE = 50;

export type LeaderboardQuery = {
  region: LeaderboardRegion;
  tier: LeaderboardTierFilter;
  page: number;
};

export type LeaderboardPlayer = {
  position: number;
  /** Null when the player has hidden their name on the leaderboard. */
  riotId: { name: string; tag: string } | null;
  rank: Rank;
  rankRating: number;
  wins: number;
};

export type LeaderboardThreshold = {
  rank: Rank;
  /** The highest leaderboard position that holds this rank. */
  startPosition: number;
  minRankRating: number;
};

/** One slice of the leaderboard as provided by the adapter. */
export type LeaderboardSlice = {
  updatedAt: string;
  totalPlayers: number;
  thresholds: LeaderboardThreshold[];
  players: LeaderboardPlayer[];
};

export type LeaderboardPage = LeaderboardQuery & {
  updatedAt: string;
  /** Players matching the tier filter across the whole board. */
  totalPlayers: number;
  pageCount: number;
  thresholds: LeaderboardThreshold[];
  players: LeaderboardPlayer[];
};

export const RADIANT_TIER_ID = 27;

const DEFAULT_QUERY: LeaderboardQuery = {
  region: 'eu',
  tier: 'radiant',
  page: 1,
};

function isRegion(value: string): value is LeaderboardRegion {
  return LEADERBOARD_REGIONS.some((region) => region.id === value);
}

/** Reads the page URL; unknown or malformed values fall back to defaults. */
export function parseLeaderboardQuery(
  params: URLSearchParams,
): LeaderboardQuery {
  const region = params.get('region')?.toLowerCase() ?? '';
  const tier = params.get('tier');
  const page = Number(params.get('page'));

  return {
    region: isRegion(region) ? region : DEFAULT_QUERY.region,
    tier: tier === 'immortal' || tier === 'radiant' ? tier : DEFAULT_QUERY.tier,
    page: Number.isSafeInteger(page) && page >= 1 ? page : DEFAULT_QUERY.page,
  };
}

/** How many players hold Radiant: everyone above the next rank's start. */
export function radiantPlayerCount(
  thresholds: LeaderboardThreshold[],
  totalPlayers: number,
): number {
  const nextStarts = thresholds
    .filter((threshold) => threshold.rank.id < RADIANT_TIER_ID)
    .map((threshold) => threshold.startPosition);
  if (nextStarts.length === 0) return totalPlayers;
  return Math.min(totalPlayers, Math.max(0, Math.min(...nextStarts) - 1));
}

export function buildLeaderboardPage(
  query: LeaderboardQuery,
  slice: LeaderboardSlice,
): LeaderboardPage {
  const totalPlayers =
    query.tier === 'radiant'
      ? radiantPlayerCount(slice.thresholds, slice.totalPlayers)
      : slice.totalPlayers;

  return {
    ...query,
    updatedAt: slice.updatedAt,
    totalPlayers,
    pageCount: Math.max(1, Math.ceil(totalPlayers / LEADERBOARD_PAGE_SIZE)),
    thresholds: slice.thresholds,
    players:
      query.tier === 'radiant'
        ? slice.players.filter((player) => player.rank.id === RADIANT_TIER_ID)
        : slice.players,
  };
}
