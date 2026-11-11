/**
 * Reduces one full match to a single player's line.
 */

import type { MatchDetail } from '../match-detail';
import { percentage, round } from './math';
import type { CompetitiveMatchInput, LobbyAverages } from './types';

/**
 * Reduces a full match to one player's line, including how the rest of the
 * lobby performed so the player can be compared with their own matches.
 */
export function summarizeMatchForPlayer(
  detail: MatchDetail,
  puuid: string,
): CompetitiveMatchInput | null {
  const player = detail.players.find((candidate) => candidate.puuid === puuid);
  if (!player) return null;

  const team = detail.teams.find((candidate) => candidate.id === player.teamId);
  if (!team) return null;

  const others = detail.players.filter(
    (candidate) => candidate.puuid !== puuid,
  );
  const rounds = team.roundsWon + team.roundsLost;

  let sides: CompetitiveMatchInput['sides'] = null;
  let firstBloodRoundsWon: number | null = null;
  let firstDeathRoundsWon: number | null = null;
  if (detail.hasRoundData) {
    sides = {
      attack: { roundsWon: 0, roundsPlayed: 0 },
      defense: { roundsWon: 0, roundsPlayed: 0 },
    };
    firstBloodRoundsWon = 0;
    firstDeathRoundsWon = 0;

    for (const matchRound of detail.rounds) {
      const won = matchRound.winningTeamId === team.id;
      const side = matchRound.teams.find(
        (candidate) => candidate.teamId === team.id,
      )?.side;
      if (side) {
        sides[side].roundsPlayed += 1;
        if (won) sides[side].roundsWon += 1;
      }

      const firstKill = matchRound.kills.find((kill) => kill.isFirstKill);
      if (won && firstKill?.killerPuuid === puuid) firstBloodRoundsWon += 1;
      if (won && firstKill?.victimPuuid === puuid) firstDeathRoundsWon += 1;
    }
  }

  let lobby: LobbyAverages | null = null;
  if (others.length > 0 && rounds > 0) {
    const average = (values: number[]): number =>
      values.reduce((total, value) => total + value, 0) / values.length;
    const kastValues = others.flatMap((other) =>
      other.stats.kast === null ? [] : [other.stats.kast],
    );
    const otherDeaths = others.reduce(
      (total, other) => total + other.stats.deaths,
      0,
    );
    const otherKills = others.reduce(
      (total, other) => total + other.stats.kills,
      0,
    );
    const otherTradedDeaths = others.reduce(
      (total, other) => total + (other.stats.tradedDeaths ?? 0),
      0,
    );

    lobby = {
      averageCombatScore: round(
        average(others.map((other) => other.stats.averageCombatScore)),
        1,
      ),
      averageDamagePerRound: round(
        average(others.map((other) => other.stats.averageDamagePerRound)),
        1,
      ),
      headshotPercentage: round(
        average(others.map((other) => other.stats.headshotPercentage)),
        1,
      ),
      killDeathRatio: round(otherKills / Math.max(otherDeaths, 1), 2),
      deathsPerRound: round(otherDeaths / others.length / rounds, 3),
      kast: kastValues.length === 0 ? null : round(average(kastValues), 1),
      tradedDeathRate:
        detail.hasRoundData && otherDeaths > 0
          ? percentage(otherTradedDeaths, otherDeaths)
          : null,
    };
  }

  const { stats } = player;
  return {
    id: detail.id,
    startedAt: detail.startedAt,
    mapName: detail.mapName,
    agentName: player.agentName,
    agentId: player.agentId,
    seasonShort: detail.seasonShort,
    rank: player.rank,
    outcome:
      team.roundsWon === team.roundsLost ? 'draw' : team.won ? 'win' : 'loss',
    score: { won: team.roundsWon, lost: team.roundsLost },
    durationMs: detail.durationMs,
    placement: detail.players.length > 1 ? player.placement : null,
    stats: {
      kills: stats.kills,
      deaths: stats.deaths,
      assists: stats.assists,
      averageCombatScore: stats.averageCombatScore,
      averageDamagePerRound: Math.round(stats.averageDamagePerRound),
      damageDeltaPerRound: stats.damageDeltaPerRound,
      headshots: stats.headshots,
      bodyshots: stats.bodyshots,
      legshots: stats.legshots,
      totalHits: stats.headshots + stats.bodyshots + stats.legshots,
      headshotPercentage: stats.headshotPercentage,
      kast: stats.kast,
      firstBloods: stats.firstKills,
      firstDeaths: stats.firstDeaths,
      firstBloodRoundsWon,
      firstDeathRoundsWon,
      tradedDeaths: stats.tradedDeaths,
      multiKills: stats.multiKills,
    },
    sides,
    lobby,
  };
}
