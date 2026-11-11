import { describe, expect, it } from 'vitest';
import { facingOnMinimap, minimapUrl, toMinimap } from '../src/lib/maps';
import {
  buildMatchDetail,
  buyRecords,
  economySwings,
  playerEncounters,
  roundEvents,
  roundSnapshot,
  type MatchInput,
  type MatchKillInput,
  type MatchPlayerInput,
  type MatchPlayerPosition,
  type MatchRoundInput,
  type MatchRoundPlayerInput,
} from '../src/lib/match-detail';
import { parseMatch } from '../src/lib/server/valorant/parse';

function player(
  puuid: string,
  teamId: string,
  score: number,
): MatchPlayerInput {
  return {
    puuid,
    name: puuid,
    tag: 'TAG',
    teamId,
    partyId: null,
    agentId: null,
    agentName: 'Jett',
    rank: null,
    accountLevel: null,
    score,
    kills: 0,
    deaths: 0,
    assists: 0,
    headshots: 0,
    bodyshots: 0,
    legshots: 0,
    damageDealt: 0,
    damageReceived: null,
  };
}

function round(number: number, winningTeamId: string): MatchRoundInput {
  return {
    number,
    winningTeamId,
    winningSide: 'attack',
    endType: 'elimination',
    plant: null,
    defuse: null,
    players: [],
  };
}

function kill(
  roundNumber: number,
  timeMs: number,
  killerPuuid: string,
  victimPuuid: string,
): MatchKillInput {
  return {
    round: roundNumber,
    timeMs,
    killerPuuid,
    victimPuuid,
    assistantPuuids: [],
    weaponName: null,
    victimLocation: null,
    positions: [],
  };
}

// Round 1: b1 opens on a1, a2 trades within the window, then wins the round.
// Round 2: a1 opens on b1, then team B wins the round without a trade.
const input: MatchInput = {
  id: 'match',
  mapId: null,
  mapName: 'Ascent',
  startedAt: '2026-09-28T10:00:00Z',
  durationMs: null,
  seasonShort: null,
  region: null,
  teams: [
    { id: 'A', roundsWon: 1, roundsLost: 1, won: false },
    { id: 'B', roundsWon: 1, roundsLost: 1, won: false },
  ],
  players: [
    player('a1', 'A', 400),
    player('a2', 'A', 300),
    player('b1', 'B', 200),
    player('b2', 'B', 100),
  ],
  rounds: [round(1, 'A'), round(2, 'B')],
  kills: [
    kill(1, 1000, 'b1', 'a1'),
    kill(1, 3000, 'a2', 'b1'),
    kill(1, 10000, 'a2', 'b2'),
    kill(2, 1000, 'a1', 'b1'),
    kill(2, 20000, 'b2', 'a1'),
    kill(2, 21000, 'b2', 'a2'),
  ],
};

describe('buildMatchDetail', () => {
  const detail = buildMatchDetail(input);
  const stats = (puuid: string) =>
    detail.players.find((entry) => entry.puuid === puuid)?.stats;

  it('credits first kills and first deaths per round', () => {
    expect(stats('a1')).toMatchObject({ firstKills: 1, firstDeaths: 1 });
    expect(stats('b1')).toMatchObject({ firstKills: 1, firstDeaths: 1 });
    expect(stats('a2')).toMatchObject({ firstKills: 0, firstDeaths: 0 });
  });

  it('counts a death traded within the window toward KAST', () => {
    expect(stats('a1')).toMatchObject({ tradedDeaths: 1, kast: 100 });
    expect(stats('a2')).toMatchObject({ tradeKills: 1, kast: 50 });
    expect(detail.rounds[0].kills[1]).toMatchObject({ isTrade: true });
    expect(detail.rounds[1].kills[1]).toMatchObject({ isTrade: false });
  });

  it('places players by combat score and tallies head-to-head duels', () => {
    expect(detail.players.map((entry) => entry.placement)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(detail.duels).toEqual(
      expect.arrayContaining([
        { killerPuuid: 'b1', victimPuuid: 'a1', kills: 1 },
        { killerPuuid: 'a1', victimPuuid: 'b1', kills: 1 },
      ]),
    );
  });
});

function at(
  puuid: string,
  x: number,
  y: number,
  viewRadians: number | null = null,
): MatchPlayerPosition {
  return { puuid, x, y, viewRadians };
}

function bought(puuid: string, loadoutValue: number): MatchRoundPlayerInput {
  return {
    puuid,
    kills: 0,
    score: 0,
    damage: 0,
    loadoutValue,
    weaponName: null,
    armorName: null,
    creditsRemaining: 0,
  };
}

// Round 1: A attacks on a full buy against B's eco, plants, and B retakes and
// defuses. Round 2: both teams full buy; a1 team-kills a2, then b1 wins it.
const replayInput: MatchInput = {
  ...input,
  mapId: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319',
  rounds: [
    {
      ...round(1, 'B'),
      winningSide: 'defense',
      endType: 'defuse',
      plant: {
        playerPuuid: 'a2',
        site: 'A',
        timeMs: 2000,
        location: { x: 60, y: 60 },
        positions: [at('a1', 0, 0), at('a2', 60, 60), at('b2', 150, 0)],
      },
      defuse: {
        playerPuuid: 'b2',
        timeMs: 6000,
        location: { x: 60, y: 60 },
        positions: [at('b2', 60, 60)],
      },
      players: [
        bought('a1', 12000),
        bought('a2', 12000),
        bought('b1', 2000),
        bought('b2', 2000),
      ],
    },
    {
      ...round(2, 'B'),
      players: [
        bought('a1', 12000),
        bought('a2', 12000),
        bought('b1', 12000),
        bought('b2', 12000),
      ],
    },
  ],
  kills: [
    {
      ...kill(1, 1000, 'a1', 'b1'),
      victimLocation: { x: 100, y: 0 },
      positions: [at('a1', 0, 0, 0), at('a2', 50, 50), at('b2', 200, 0, 1)],
    },
    {
      ...kill(1, 3000, 'b2', 'a2'),
      victimLocation: { x: 60, y: 60 },
      positions: [at('a1', 10, 0), at('b2', 140, 0)],
    },
    {
      ...kill(1, 4000, 'b2', 'a1'),
      victimLocation: { x: 10, y: 0 },
      positions: [at('b2', 130, 0)],
    },
    {
      ...kill(2, 500, 'a1', 'a2'),
      victimLocation: { x: 1, y: 1 },
      positions: [at('a1', 0, 0), at('b1', 20, 20), at('b2', 30, 30)],
    },
    {
      ...kill(2, 1000, 'b1', 'a1'),
      victimLocation: { x: 5, y: 5 },
      positions: [at('b1', 20, 20), at('b2', 30, 30)],
    },
  ],
};

describe('round replay', () => {
  const detail = buildMatchDetail(replayInput);
  const events = roundEvents(detail.rounds[0]);

  it('orders kills, the plant and the defuse by time', () => {
    expect(events.map((event) => event.kind)).toEqual([
      'kill',
      'plant',
      'kill',
      'kill',
      'defuse',
    ]);
  });

  it('shows the living, earlier victims, the shot and the spike at an event', () => {
    const snapshot = roundSnapshot(events, 2);
    expect(snapshot.markers).toEqual([
      expect.objectContaining({ puuid: 'a1', alive: true, highlighted: false }),
      expect.objectContaining({ puuid: 'b2', alive: true, highlighted: true }),
      expect.objectContaining({
        puuid: 'b1',
        alive: false,
        highlighted: false,
      }),
      expect.objectContaining({ puuid: 'a2', alive: false, highlighted: true }),
    ]);
    expect(snapshot.shot).toEqual({
      from: { x: 140, y: 0 },
      to: { x: 60, y: 60 },
    });
    expect(snapshot.spike).toEqual({
      location: { x: 60, y: 60 },
      defused: false,
    });
    expect(roundSnapshot(events, 4).spike?.defused).toBe(true);
    expect(roundSnapshot(events, 99).markers).toEqual([]);
  });

  it("lists a player's kills and deaths against the enemy with positions", () => {
    expect(playerEncounters(detail, 'a1')).toEqual([
      expect.objectContaining({
        round: 1,
        side: 'attack',
        kind: 'kill',
        location: { x: 0, y: 0 },
        opponentLocation: { x: 100, y: 0 },
        isOpening: true,
      }),
      expect.objectContaining({
        round: 1,
        kind: 'death',
        location: { x: 10, y: 0 },
        opponentLocation: { x: 130, y: 0 },
        isOpening: false,
      }),
      expect.objectContaining({
        round: 2,
        side: 'defense',
        kind: 'death',
        location: { x: 5, y: 5 },
        opponentLocation: { x: 20, y: 20 },
      }),
    ]);
  });

  it('records buys and rounds that went against the money', () => {
    expect(buyRecords(detail, 'A')).toEqual([
      { buyType: 'full-buy', played: 2, won: 0 },
    ]);
    expect(buyRecords(detail, 'B')).toEqual([
      { buyType: 'eco', played: 1, won: 1 },
      { buyType: 'full-buy', played: 1, won: 1 },
    ]);
    expect(economySwings(detail, 'A')).toEqual({
      lostWithBetterBuy: [1],
      wonWithWorseBuy: [],
    });
    expect(economySwings(detail, 'B')).toEqual({
      lostWithBetterBuy: [],
      wonWithWorseBuy: [1],
    });
  });
});

describe('minimap projection', () => {
  const ascent = '7EAECC1B-4337-BBF6-6AB9-04B8F06B3319';

  it('swaps the game axes onto the minimap image', () => {
    const point = toMinimap(ascent, { x: 1000, y: 2000 });
    expect(point?.x).toBeCloseTo(0.953895);
    expect(point?.y).toBeCloseTo(0.503242);
    const facing = facingOnMinimap(ascent, 0);
    expect(facing?.x).toBeCloseTo(0);
    expect(facing?.y).toBeCloseTo(-1);
  });

  it('returns null for a map without calibration', () => {
    expect(minimapUrl('unknown-map')).toBeNull();
    expect(toMinimap('unknown-map', { x: 0, y: 0 })).toBeNull();
    expect(toMinimap(null, { x: 0, y: 0 })).toBeNull();
  });
});

describe('parseMatch positions', () => {
  it('reads nested player locations, the death location and credits left', () => {
    const parsed = parseMatch({
      metadata: {
        match_id: 'match-id',
        started_at: '2026-09-28T10:00:00Z',
        map: { id: 'map-id', name: 'Ascent' },
      },
      players: [
        {
          puuid: 'a1',
          team_id: 'Blue',
          agent: { name: 'Jett' },
          stats: {
            kills: 1,
            deaths: 0,
            assists: 0,
            score: 200,
            headshots: 1,
            bodyshots: 0,
            legshots: 0,
            damage: { dealt: 150 },
          },
        },
      ],
      teams: [{ team_id: 'Blue', won: true, rounds: { won: 1, lost: 0 } }],
      rounds: [
        {
          id: 0,
          winning_team: 'Blue',
          result: 'Elimination',
          stats: [
            {
              player: { puuid: 'a1' },
              economy: { loadout_value: 3900, remaining: 450 },
            },
          ],
        },
      ],
      kills: [
        {
          round: 0,
          time_in_round_in_ms: 1500,
          killer: { puuid: 'a1' },
          victim: { puuid: 'b1' },
          location: { x: 10, y: 20 },
          player_locations: [
            {
              player: { puuid: 'a1' },
              view_radians: 1.5,
              location: { x: 1, y: 2 },
            },
            { player: { puuid: 'b2' }, location: { x: 'bad', y: 0 } },
          ],
        },
      ],
    });

    expect(parsed.rounds[0].players[0].creditsRemaining).toBe(450);
    expect(parsed.kills[0]).toMatchObject({
      victimLocation: { x: 10, y: 20 },
      positions: [{ puuid: 'a1', x: 1, y: 2, viewRadians: 1.5 }],
    });
  });
});
