import { describe, expect, it } from 'vitest';
import {
  buildMatchDetail,
  type MatchInput,
  type MatchKillInput,
  type MatchPlayerInput,
  type MatchRoundInput,
} from '../src/lib/match-detail';

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
