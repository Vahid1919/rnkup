import { describe, expect, it, vi } from 'vitest';
import {
  fetchCompetitiveMatches,
  fetchLeaderboard,
  fetchPlayerDashboard,
  fetchPlayerProfile,
  PlayerLookupError,
} from '../src/lib/server/valorant/henrik-client';

const accountResponse = {
  status: 200,
  data: {
    puuid: 'player-id',
    region: 'eu',
    account_level: 42,
    name: 'Player Name',
    tag: 'EUW',
    card: {
      id: 'card-id',
      small: 'https://example.com/small.png',
      large: 'https://example.com/large.png',
      wide: 'https://example.com/wide.png',
    },
    last_update: '10 minutes ago',
  },
};

const playerProfile = {
  puuid: 'player-id',
  riotId: { name: 'Player Name', tag: 'EUW' },
  region: 'eu',
  accountLevel: 42,
  card: accountResponse.data.card,
  lastUpdatedAt: '10 minutes ago',
};

const competitiveMatchResponse = {
  status: 200,
  data: [
    {
      metadata: {
        match_id: 'match-id',
        started_at: '2026-09-28T10:00:00Z',
        map: { name: 'Ascent' },
      },
      players: [
        {
          puuid: 'player-id',
          team_id: 'Blue',
          agent: { name: 'Jett' },
          stats: {
            kills: 20,
            deaths: 15,
            assists: 5,
            score: 5000,
            headshots: 20,
            bodyshots: 30,
            legshots: 10,
            first_bloods: 4,
            damage: { dealt: 3000 },
          },
        },
      ],
      teams: [
        {
          team_id: 'Blue',
          won: true,
          rounds: { won: 13, lost: 7 },
        },
      ],
    },
  ],
};

const emptyCompetitiveMatchResponse = { status: 200, data: [] };

describe('fetchPlayerProfile', () => {
  it('encodes the Riot ID and maps a valid upstream response', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(accountResponse), { status: 200 }),
      );

    await expect(
      fetchPlayerProfile('Player Name', 'EUW', fetchFn, 'test-api-key'),
    ).resolves.toEqual({
      puuid: 'player-id',
      riotId: { name: 'Player Name', tag: 'EUW' },
      region: 'eu',
      accountLevel: 42,
      card: accountResponse.data.card,
      lastUpdatedAt: '10 minutes ago',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://api.henrikdev.xyz/valorant/v1/account/Player%20Name/EUW',
      }),
      { headers: { Authorization: 'test-api-key' } },
    );
  });

  it('rejects an empty Riot ID before making an upstream request', async () => {
    const fetchFn = vi.fn<typeof fetch>();

    await expect(
      fetchPlayerProfile(' ', 'EUW', fetchFn, 'test-api-key'),
    ).rejects.toMatchObject({
      kind: 'invalid-input',
    } satisfies Partial<PlayerLookupError>);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects incomplete upstream data', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: 200, data: { puuid: 'player-id' } }),
          { status: 200 },
        ),
      );

    await expect(
      fetchPlayerProfile('Player', 'EUW', fetchFn, 'test-api-key'),
    ).rejects.toMatchObject({
      kind: 'upstream',
    } satisfies Partial<PlayerLookupError>);
  });

  it('returns a not-found error for a missing player', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      fetchPlayerProfile('Player', 'EUW', fetchFn, 'test-api-key'),
    ).rejects.toMatchObject({
      kind: 'not-found',
    } satisfies Partial<PlayerLookupError>);
  });

  it('fails without a configured API key before making an upstream request', async () => {
    const fetchFn = vi.fn<typeof fetch>();

    await expect(
      fetchPlayerProfile('Player', 'EUW', fetchFn, ''),
    ).rejects.toMatchObject({
      kind: 'upstream',
      message: 'HenrikDev API access is not configured.',
    } satisfies Partial<PlayerLookupError>);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

function matchesPage(ids: string[]) {
  return {
    ...competitiveMatchResponse,
    data: ids.map((id) => ({
      ...competitiveMatchResponse.data[0],
      metadata: { ...competitiveMatchResponse.data[0].metadata, match_id: id },
    })),
  };
}

function matchIds(from: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `match-${from + index}`);
}

/** Answers each history request by its `start`; unknown starts are empty. */
function historyFetch(pages: Record<number, unknown>) {
  return vi.fn<typeof fetch>((input) => {
    const start = Number(new URL(String(input)).searchParams.get('start'));
    const body = pages[start];
    if (body === 'error') {
      return Promise.resolve(new Response(null, { status: 500 }));
    }
    return Promise.resolve(
      new Response(JSON.stringify(body ?? emptyCompetitiveMatchResponse), {
        status: 200,
      }),
    );
  });
}

function requestedStarts(fetchFn: ReturnType<typeof historyFetch>): number[] {
  return fetchFn.mock.calls
    .map(([input]) => Number(new URL(String(input)).searchParams.get('start')))
    .sort((first, second) => first - second);
}

describe('fetchCompetitiveMatches', () => {
  it('requests the first detailed history page and maps player metrics', async () => {
    const fetchFn = historyFetch({ 0: competitiveMatchResponse });

    await expect(
      fetchCompetitiveMatches(playerProfile, fetchFn, 'test-api-key'),
    ).resolves.toMatchObject([
      {
        id: 'match-id',
        startedAt: '2026-09-28T10:00:00Z',
        mapName: 'Ascent',
        agentName: 'Jett',
        outcome: 'win',
        score: { won: 13, lost: 7 },
        stats: {
          kills: 20,
          deaths: 15,
          assists: 5,
          averageCombatScore: 250,
          averageDamagePerRound: 150,
          headshots: 20,
          totalHits: 60,
          headshotPercentage: 33.3,
          // Derived from the kill timeline, which this fixture omits.
          firstBloods: null,
        },
      },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://api.henrikdev.xyz/valorant/v4/matches/eu/pc/Player%20Name/EUW?mode=competitive&size=10&start=0',
      }),
      { headers: { Authorization: 'test-api-key' } },
    );
  });

  it('requests every ten-match page at once', async () => {
    const pending: (() => void)[] = [];
    const fetchFn = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          pending.push(() =>
            resolve(
              new Response(JSON.stringify(emptyCompetitiveMatchResponse), {
                status: 200,
              }),
            ),
          );
        }),
    );

    const history = fetchCompetitiveMatches(
      playerProfile,
      fetchFn,
      'test-api-key',
    );
    // No response has arrived yet, so every page must already be requested.
    expect(fetchFn).toHaveBeenCalledTimes(10);
    for (const release of pending) release();
    await expect(history).resolves.toEqual([]);
  });

  it('joins ten-match pages in order', async () => {
    const fetchFn = historyFetch({
      0: matchesPage(matchIds(0, 10)),
      10: matchesPage(['match-10']),
    });

    const matches = await fetchCompetitiveMatches(
      playerProfile,
      fetchFn,
      'test-api-key',
    );

    expect(matches.map((match) => match.id)).toEqual(matchIds(0, 11));
    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://api.henrikdev.xyz/valorant/v4/matches/eu/pc/Player%20Name/EUW?mode=competitive&size=10&start=10',
      }),
      { headers: { Authorization: 'test-api-key' } },
    );
  });

  it('continues after a short nonempty history page', async () => {
    const fetchFn = historyFetch({
      0: matchesPage(matchIds(0, 5)),
      5: matchesPage(matchIds(5, 10)),
      10: matchesPage(matchIds(10, 3)),
    });

    const matches = await fetchCompetitiveMatches(
      playerProfile,
      fetchFn,
      'test-api-key',
    );

    // The page at 5 overlaps the page at 10; each match appears once.
    expect(matches.map((match) => match.id)).toEqual(matchIds(0, 15));
    expect(requestedStarts(fetchFn)).toContain(5);
  });

  it('keeps the matches before a failed page and drops the ones after it', async () => {
    const fetchFn = historyFetch({
      0: matchesPage(matchIds(0, 10)),
      10: 'error',
      20: matchesPage(matchIds(20, 10)),
    });

    const matches = await fetchCompetitiveMatches(
      playerProfile,
      fetchFn,
      'test-api-key',
    );

    expect(matches.map((match) => match.id)).toEqual(matchIds(0, 10));
  });

  it('fails when the most recent page fails', async () => {
    const fetchFn = historyFetch({
      0: 'error',
      10: matchesPage(matchIds(10, 10)),
    });

    await expect(
      fetchCompetitiveMatches(playerProfile, fetchFn, 'test-api-key'),
    ).rejects.toMatchObject({
      kind: 'upstream',
    } satisfies Partial<PlayerLookupError>);
  });
});

describe('fetchCompetitiveMatches limit', () => {
  it('stops after one hundred detailed matches', async () => {
    const fetchFn = vi.fn<typeof fetch>((input) => {
      const start = Number(new URL(String(input)).searchParams.get('start'));
      return Promise.resolve(
        new Response(JSON.stringify(matchesPage(matchIds(start, 10))), {
          status: 200,
        }),
      );
    });

    await expect(
      fetchCompetitiveMatches(playerProfile, fetchFn, 'test-api-key'),
    ).resolves.toHaveLength(100);
    expect(fetchFn).toHaveBeenCalledTimes(10);
  });
});

describe('fetchPlayerDashboard', () => {
  it('reuses a cached dashboard for fifteen minutes', async () => {
    const fetchFn = vi.fn<typeof fetch>((input) => {
      const url = new URL(String(input));
      const json = (body: unknown, status = 200) =>
        Promise.resolve(new Response(JSON.stringify(body), { status }));
      if (url.pathname.startsWith('/valorant/v1/account/')) {
        return json(accountResponse);
      }
      if (url.pathname.startsWith('/valorant/v4/matches/')) {
        return json(
          url.searchParams.get('start') === '0'
            ? competitiveMatchResponse
            : emptyCompetitiveMatchResponse,
        );
      }
      return json({ status: 404 }, 404);
    });
    vi.stubGlobal('fetch', fetchFn);

    try {
      const first = await fetchPlayerDashboard(
        'Cached Player',
        'EUW',
        undefined,
        'test-api-key',
      );
      const callsAfterFirstLoad = fetchFn.mock.calls.length;
      const second = await fetchPlayerDashboard(
        'Cached Player',
        'EUW',
        undefined,
        'test-api-key',
      );

      expect(second).toBe(first);
      expect(fetchFn).toHaveBeenCalledTimes(callsAfterFirstLoad);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('fetchLeaderboard', () => {
  const leaderboardResponse = {
    status: 200,
    results: { total: 15000, returned: 3 },
    data: {
      updated_at: '2026-11-10T15:55:45.697Z',
      thresholds: [
        { tier: { id: 26 }, start_index: 501, threshold: 200 },
        { tier: { id: 27 }, start_index: 1, threshold: 300 },
      ],
      players: [
        {
          is_anonymized: true,
          puuid: null,
          name: '',
          tag: '',
          leaderboard_rank: 1,
          tier: 27,
          rr: 1106,
          wins: 44,
        },
        {
          is_anonymized: false,
          puuid: 'player-id',
          name: 'Player Name',
          tag: 'EUW',
          leaderboard_rank: 2,
          tier: 27,
          rr: 1005,
          wins: 76,
        },
        { leaderboard_rank: 'third', tier: 27, rr: 900, wins: 10 },
      ],
    },
  };

  it('requests one page and maps players, hiding anonymous names', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(leaderboardResponse), { status: 200 }),
      );

    const page = await fetchLeaderboard(
      { region: 'na', tier: 'radiant', page: 2 },
      fetchFn,
      'test-key',
    );

    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.pathname).toBe('/valorant/v3/leaderboard/na/pc');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('size')).toBe('50');
    expect(page.totalPlayers).toBe(500);
    expect(page.thresholds.map((threshold) => threshold.rank.id)).toEqual([
      27, 26,
    ]);
    expect(page.players).toEqual([
      expect.objectContaining({ position: 1, riotId: null }),
      expect.objectContaining({
        position: 2,
        riotId: { name: 'Player Name', tag: 'EUW' },
        rankRating: 1005,
      }),
    ]);
  });

  it('rejects an invalid page without calling HenrikDev', async () => {
    const fetchFn = vi.fn<typeof fetch>();

    await expect(
      fetchLeaderboard(
        { region: 'eu', tier: 'radiant', page: 0 },
        fetchFn,
        'test-key',
      ),
    ).rejects.toMatchObject({ kind: 'invalid-input' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reports a malformed leaderboard as an upstream error', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 200, data: {} }), {
        status: 200,
      }),
    );

    await expect(
      fetchLeaderboard(
        { region: 'eu', tier: 'immortal', page: 1 },
        fetchFn,
        'test-key',
      ),
    ).rejects.toBeInstanceOf(PlayerLookupError);
  });
});
