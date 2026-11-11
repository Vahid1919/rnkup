/**
 * Totals across a player's matches, and the lobby averages they are compared with.
 */

import { getAgentRole } from '../agents';
import {
  calculateKillAssistDeathRatio,
  mostFrequent,
  percentage,
  round,
  roundsInMatch,
} from './math';
import type {
  CompetitiveMatch,
  CompetitiveSummary,
  LobbyAverages,
  LobbyBenchmarks,
} from './types';

function sumNullable<T>(
  items: T[],
  select: (item: T) => number | null,
): number | null {
  let total: number | null = null;
  for (const item of items) {
    const value = select(item);
    if (value !== null) total = (total ?? 0) + value;
  }
  return total;
}

export function summarizeCompetitiveMatches(
  matches: CompetitiveMatch[],
): CompetitiveSummary {
  const matchCount = matches.length;
  const totals = {
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    damage: 0,
    rounds: 0,
    headshots: 0,
    bodyshots: 0,
    legshots: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    damageDelta: 0,
    damageDeltaRounds: 0,
    kastRounds: 0,
    kastWeight: 0,
    tradedDeaths: 0,
    tradeTrackedDeaths: 0,
    placement: 0,
    placementMatches: 0,
  };

  for (const match of matches) {
    const rounds = roundsInMatch(match);
    const { stats } = match;
    totals.kills += stats.kills;
    totals.deaths += stats.deaths;
    totals.assists += stats.assists;
    totals.score += stats.averageCombatScore * rounds;
    totals.damage += stats.averageDamagePerRound * rounds;
    totals.rounds += rounds;
    totals.headshots += stats.headshots;
    totals.bodyshots += stats.bodyshots;
    totals.legshots += stats.legshots;
    if (match.outcome === 'win') totals.wins += 1;
    if (match.outcome === 'loss') totals.losses += 1;
    if (match.outcome === 'draw') totals.draws += 1;
    if (stats.damageDeltaPerRound !== null) {
      totals.damageDelta += stats.damageDeltaPerRound * rounds;
      totals.damageDeltaRounds += rounds;
    }
    if (stats.kast !== null) {
      totals.kastRounds += (stats.kast / 100) * rounds;
      totals.kastWeight += rounds;
    }
    if (stats.tradedDeaths !== null) {
      totals.tradedDeaths += stats.tradedDeaths;
      totals.tradeTrackedDeaths += stats.deaths;
    }
    if (match.placement !== null) {
      totals.placement += match.placement;
      totals.placementMatches += 1;
    }
  }

  const totalHits = totals.headshots + totals.bodyshots + totals.legshots;
  const firstBloods = sumNullable(matches, (match) => match.stats.firstBloods);
  const firstDeaths = sumNullable(matches, (match) => match.stats.firstDeaths);
  const firstBloodRoundsWon = sumNullable(
    matches,
    (match) => match.stats.firstBloodRoundsWon,
  );
  const firstDeathRoundsWon = sumNullable(
    matches,
    (match) => match.stats.firstDeathRoundsWon,
  );
  const startTimes = matches.map((match) => match.startedAt).sort();

  return {
    matchCount,
    roundCount: totals.rounds,
    wins: totals.wins,
    losses: totals.losses,
    draws: totals.draws,
    winRate: percentage(totals.wins, matchCount),
    killDeathRatio: round(totals.kills / Math.max(totals.deaths, 1), 2),
    killAssistDeathRatio: calculateKillAssistDeathRatio(
      totals.kills,
      totals.deaths,
      totals.assists,
    ),
    averageCombatScore:
      totals.rounds === 0 ? 0 : round(totals.score / totals.rounds),
    averageDamagePerRound:
      totals.rounds === 0 ? 0 : round(totals.damage / totals.rounds),
    damageDeltaPerRound:
      totals.damageDeltaRounds === 0
        ? null
        : round(totals.damageDelta / totals.damageDeltaRounds),
    headshotPercentage: percentage(totals.headshots, totalHits),
    kast:
      totals.kastWeight === 0
        ? null
        : percentage(totals.kastRounds, totals.kastWeight),
    killsPerRound:
      totals.rounds === 0 ? 0 : round(totals.kills / totals.rounds, 2),
    deathsPerRound:
      totals.rounds === 0 ? 0 : round(totals.deaths / totals.rounds, 2),
    averageKills: matchCount === 0 ? 0 : round(totals.kills / matchCount, 1),
    averageDeaths: matchCount === 0 ? 0 : round(totals.deaths / matchCount, 1),
    averageAssists:
      matchCount === 0 ? 0 : round(totals.assists / matchCount, 1),
    firstBloods,
    firstDeaths,
    firstBloodRoundWinRate:
      firstBloods === null || firstBloods === 0 || firstBloodRoundsWon === null
        ? null
        : percentage(firstBloodRoundsWon, firstBloods, 0),
    firstDeathRoundWinRate:
      firstDeaths === null || firstDeaths === 0 || firstDeathRoundsWon === null
        ? null
        : percentage(firstDeathRoundsWon, firstDeaths, 0),
    tradedDeathRate:
      totals.tradeTrackedDeaths === 0
        ? null
        : percentage(totals.tradedDeaths, totals.tradeTrackedDeaths),
    multiKills: sumNullable(matches, (match) => match.stats.multiKills),
    playtimeMs: sumNullable(matches, (match) => match.durationMs),
    averagePlacement:
      totals.placementMatches === 0
        ? null
        : round(totals.placement / totals.placementMatches, 1),
    accuracy: {
      head: percentage(totals.headshots, totalHits),
      body: percentage(totals.bodyshots, totalHits),
      legs: percentage(totals.legshots, totalHits),
    },
    mostPlayedAgent: mostFrequent(matches.map((match) => match.agentName)),
    mostPlayedMap: mostFrequent(matches.map((match) => match.mapName)),
    mostPlayedRole: mostFrequent(
      matches.flatMap((match) => {
        const role = getAgentRole(match.agentName);
        return role ? [role] : [];
      }),
    ),
    from: startTimes[0] ?? null,
    to: startTimes.at(-1) ?? null,
  };
}

export function buildLobbyBenchmarks(
  matches: CompetitiveMatch[],
): LobbyBenchmarks | null {
  const withLobby = matches.flatMap((match) =>
    match.lobby ? [{ lobby: match.lobby, rounds: roundsInMatch(match) }] : [],
  );
  if (withLobby.length === 0) return null;

  const weighted = (
    select: (lobby: LobbyAverages) => number | null,
    decimals: number,
  ): number | null => {
    let total = 0;
    let weight = 0;
    for (const { lobby, rounds } of withLobby) {
      const value = select(lobby);
      if (value !== null) {
        total += value * rounds;
        weight += rounds;
      }
    }
    return weight === 0 ? null : round(total / weight, decimals);
  };

  return {
    matchCount: withLobby.length,
    averageCombatScore: weighted((lobby) => lobby.averageCombatScore, 0) ?? 0,
    averageDamagePerRound:
      weighted((lobby) => lobby.averageDamagePerRound, 0) ?? 0,
    headshotPercentage: weighted((lobby) => lobby.headshotPercentage, 1) ?? 0,
    killDeathRatio: weighted((lobby) => lobby.killDeathRatio, 2) ?? 0,
    deathsPerRound: weighted((lobby) => lobby.deathsPerRound, 2) ?? 0,
    kast: weighted((lobby) => lobby.kast, 1),
    tradedDeathRate: weighted((lobby) => lobby.tradedDeathRate, 1),
  };
}
