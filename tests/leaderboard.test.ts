import { describe, expect, it } from 'vitest';
import {
  buildLeaderboardPage,
  parseLeaderboardQuery,
  type LeaderboardSlice,
} from '../src/lib/leaderboard';
import { toRank } from '../src/lib/ranks';

const slice: LeaderboardSlice = {
  updatedAt: '2026-11-10T15:55:45.697Z',
  totalPlayers: 15000,
  thresholds: [
    { rank: toRank(27), startPosition: 1, minRankRating: 300 },
    { rank: toRank(26), startPosition: 501, minRankRating: 200 },
    { rank: toRank(25), startPosition: 3580, minRankRating: 100 },
  ],
  players: [
    {
      position: 500,
      riotId: { name: 'Last', tag: 'RAD' },
      rank: toRank(27),
      rankRating: 300,
      wins: 80,
    },
    {
      position: 501,
      riotId: { name: 'First', tag: 'IMM' },
      rank: toRank(26),
      rankRating: 299,
      wins: 75,
    },
  ],
};

describe('parseLeaderboardQuery', () => {
  it('reads valid filters and falls back to defaults for the rest', () => {
    expect(
      parseLeaderboardQuery(
        new URLSearchParams('region=NA&tier=immortal&page=3'),
      ),
    ).toEqual({ region: 'na', tier: 'immortal', page: 3 });
    expect(
      parseLeaderboardQuery(
        new URLSearchParams('region=moon&tier=gold&page=-2'),
      ),
    ).toEqual({ region: 'eu', tier: 'radiant', page: 1 });
    expect(parseLeaderboardQuery(new URLSearchParams('page=1.5')).page).toBe(1);
  });
});

describe('buildLeaderboardPage', () => {
  it('counts and keeps only Radiant players in the Radiant view', () => {
    const page = buildLeaderboardPage(
      { region: 'eu', tier: 'radiant', page: 10 },
      slice,
    );

    expect(page.totalPlayers).toBe(500);
    expect(page.pageCount).toBe(10);
    expect(page.players.map((player) => player.position)).toEqual([500]);
  });

  it('shows the whole board in the Immortal+ view', () => {
    const page = buildLeaderboardPage(
      { region: 'eu', tier: 'immortal', page: 10 },
      slice,
    );

    expect(page.totalPlayers).toBe(15000);
    expect(page.pageCount).toBe(300);
    expect(page.players).toHaveLength(2);
  });
});
