import { averageRank, type Rank } from './ranks';

/**
 * Application-owned model of one competitive match: the scoreboard, every
 * round, and the kill feed. `MatchInput` is the validated provider data;
 * `buildMatchDetail` derives the statistics shown to players.
 */

export type MatchSide = 'attack' | 'defense';
export type RoundEndType = 'elimination' | 'defuse' | 'detonate' | 'other';
export type BuyType = 'eco' | 'semi-eco' | 'semi-buy' | 'full-buy';

export type MatchPlayerInput = {
  puuid: string;
  name: string;
  tag: string;
  teamId: string;
  partyId: string | null;
  agentId: string | null;
  agentName: string;
  rank: Rank | null;
  accountLevel: number | null;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  damageDealt: number;
  damageReceived: number | null;
};

export type MatchTeamInput = {
  id: string;
  roundsWon: number;
  roundsLost: number;
  won: boolean;
};

export type MatchRoundPlayerInput = {
  puuid: string;
  kills: number;
  score: number;
  damage: number;
  loadoutValue: number | null;
  weaponName: string | null;
  armorName: string | null;
};

export type MatchRoundInput = {
  number: number;
  winningTeamId: string | null;
  winningSide: MatchSide | null;
  endType: RoundEndType;
  plant: { playerPuuid: string; site: string | null; timeMs: number } | null;
  defuse: { playerPuuid: string; timeMs: number } | null;
  players: MatchRoundPlayerInput[];
};

export type MatchKillInput = {
  round: number;
  timeMs: number;
  killerPuuid: string;
  victimPuuid: string;
  assistantPuuids: string[];
  weaponName: string | null;
};

export type MatchInput = {
  id: string;
  mapId: string | null;
  mapName: string;
  startedAt: string;
  durationMs: number | null;
  seasonShort: string | null;
  region: string | null;
  teams: MatchTeamInput[];
  players: MatchPlayerInput[];
  rounds: MatchRoundInput[];
  kills: MatchKillInput[];
};

export type MatchPlayerStats = {
  averageCombatScore: number;
  kills: number;
  deaths: number;
  assists: number;
  plusMinus: number;
  killDeathRatio: number;
  averageDamagePerRound: number;
  damageDeltaPerRound: number | null;
  headshots: number;
  bodyshots: number;
  legshots: number;
  headshotPercentage: number;
  /** Null when the provider returned no round-by-round data. */
  kast: number | null;
  firstKills: number | null;
  firstDeaths: number | null;
  multiKills: number | null;
  tradedDeaths: number | null;
  tradeKills: number | null;
  plants: number | null;
  defuses: number | null;
  averageLoadoutValue: number | null;
};

export type MatchPlayer = Omit<
  MatchPlayerInput,
  | 'score'
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'headshots'
  | 'bodyshots'
  | 'legshots'
  | 'damageDealt'
  | 'damageReceived'
> & {
  /** 1 is the highest combat score in the match. */
  placement: number;
  stats: MatchPlayerStats;
};

export type MatchRoundKill = MatchKillInput & {
  isFirstKill: boolean;
  /** The victim had killed one of the killer's teammates moments earlier. */
  isTrade: boolean;
};

export type MatchRoundTeam = {
  teamId: string;
  side: MatchSide | null;
  loadoutValue: number | null;
  buyType: BuyType | null;
};

export type MatchRoundPlayer = MatchRoundPlayerInput & {
  survived: boolean;
};

export type MatchRound = Omit<MatchRoundInput, 'players'> & {
  kills: MatchRoundKill[];
  teams: MatchRoundTeam[];
  players: MatchRoundPlayer[];
};

export type MatchDuel = {
  killerPuuid: string;
  victimPuuid: string;
  kills: number;
};

export type MatchDetail = {
  id: string;
  mapId: string | null;
  mapName: string;
  startedAt: string;
  durationMs: number | null;
  seasonShort: string | null;
  region: string | null;
  roundCount: number;
  hasRoundData: boolean;
  averageRank: Rank | null;
  teams: MatchTeamInput[];
  players: MatchPlayer[];
  rounds: MatchRound[];
  duels: MatchDuel[];
};

/** A death counts as traded when the killer dies to a teammate this soon. */
export const TRADE_WINDOW_MS = 5000;
const MULTI_KILL_THRESHOLD = 3;

function roundTo(value: number, decimals = 0): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function classifyBuy(teamLoadoutValue: number): BuyType {
  if (teamLoadoutValue < 5000) return 'eco';
  if (teamLoadoutValue < 10000) return 'semi-eco';
  if (teamLoadoutValue < 20000) return 'semi-buy';
  return 'full-buy';
}

function oppositeSide(side: MatchSide): MatchSide {
  return side === 'attack' ? 'defense' : 'attack';
}

type PlayerTally = {
  kastRounds: number;
  firstKills: number;
  firstDeaths: number;
  multiKills: number;
  tradedDeaths: number;
  tradeKills: number;
  plants: number;
  defuses: number;
  loadoutTotal: number;
  loadoutRounds: number;
};

export function buildMatchDetail(input: MatchInput): MatchDetail {
  const teamByPlayer = new Map(
    input.players.map((player) => [player.puuid, player.teamId]),
  );
  const isEnemyKill = (kill: MatchKillInput): boolean => {
    const killerTeam = teamByPlayer.get(kill.killerPuuid);
    const victimTeam = teamByPlayer.get(kill.victimPuuid);
    return (
      killerTeam !== undefined &&
      victimTeam !== undefined &&
      killerTeam !== victimTeam
    );
  };

  const scoreRoundCount = Math.max(
    0,
    ...input.teams.map((team) => team.roundsWon + team.roundsLost),
  );
  const roundCount = scoreRoundCount || input.rounds.length;
  const hasRoundData = input.rounds.length > 0 && input.kills.length > 0;

  const killsByRound = new Map<number, MatchKillInput[]>();
  for (const kill of input.kills) {
    const roundKills = killsByRound.get(kill.round) ?? [];
    roundKills.push(kill);
    killsByRound.set(kill.round, roundKills);
  }

  const tallies = new Map<string, PlayerTally>(
    input.players.map((player) => [
      player.puuid,
      {
        kastRounds: 0,
        firstKills: 0,
        firstDeaths: 0,
        multiKills: 0,
        tradedDeaths: 0,
        tradeKills: 0,
        plants: 0,
        defuses: 0,
        loadoutTotal: 0,
        loadoutRounds: 0,
      },
    ]),
  );
  const duelCounts = new Map<string, MatchDuel>();

  const rounds = [...input.rounds]
    .sort((first, second) => first.number - second.number)
    .map((round): MatchRound => {
      const orderedKills = [...(killsByRound.get(round.number) ?? [])].sort(
        (first, second) => first.timeMs - second.timeMs,
      );
      const enemyKills = orderedKills.filter(isEnemyKill);
      const firstKill = enemyKills[0];

      const kills = orderedKills.map((kill): MatchRoundKill => {
        const killerTeam = teamByPlayer.get(kill.killerPuuid);
        const isTrade =
          isEnemyKill(kill) &&
          enemyKills.some(
            (earlier) =>
              earlier !== kill &&
              earlier.killerPuuid === kill.victimPuuid &&
              teamByPlayer.get(earlier.victimPuuid) === killerTeam &&
              earlier.timeMs <= kill.timeMs &&
              kill.timeMs - earlier.timeMs <= TRADE_WINDOW_MS,
          );
        return { ...kill, isFirstKill: kill === firstKill, isTrade };
      });

      for (const kill of enemyKills) {
        const key = `${kill.killerPuuid}>${kill.victimPuuid}`;
        const duel = duelCounts.get(key) ?? {
          killerPuuid: kill.killerPuuid,
          victimPuuid: kill.victimPuuid,
          kills: 0,
        };
        duel.kills += 1;
        duelCounts.set(key, duel);
      }

      if (firstKill) {
        const killer = tallies.get(firstKill.killerPuuid);
        const victim = tallies.get(firstKill.victimPuuid);
        if (killer) killer.firstKills += 1;
        if (victim) victim.firstDeaths += 1;
      }

      for (const kill of kills) {
        if (!kill.isTrade) continue;
        const killer = tallies.get(kill.killerPuuid);
        if (killer) killer.tradeKills += 1;
      }

      const deaths = new Map<string, MatchRoundKill>();
      for (const kill of kills) {
        if (!deaths.has(kill.victimPuuid)) deaths.set(kill.victimPuuid, kill);
      }

      for (const player of input.players) {
        const tally = tallies.get(player.puuid);
        if (!tally) continue;

        const killCount = enemyKills.filter(
          (kill) => kill.killerPuuid === player.puuid,
        ).length;
        const assisted = orderedKills.some((kill) =>
          kill.assistantPuuids.includes(player.puuid),
        );
        const death = deaths.get(player.puuid);
        const traded =
          death !== undefined &&
          kills.some(
            (kill) =>
              kill.victimPuuid === death.killerPuuid &&
              teamByPlayer.get(kill.killerPuuid) === player.teamId &&
              kill.timeMs >= death.timeMs &&
              kill.timeMs - death.timeMs <= TRADE_WINDOW_MS,
          );

        if (killCount > 0 || assisted || death === undefined || traded) {
          tally.kastRounds += 1;
        }
        if (killCount >= MULTI_KILL_THRESHOLD) tally.multiKills += 1;
        if (traded) tally.tradedDeaths += 1;
      }

      if (round.plant) {
        const planter = tallies.get(round.plant.playerPuuid);
        if (planter) planter.plants += 1;
      }
      if (round.defuse) {
        const defuser = tallies.get(round.defuse.playerPuuid);
        if (defuser) defuser.defuses += 1;
      }

      for (const roundPlayer of round.players) {
        const tally = tallies.get(roundPlayer.puuid);
        if (tally && roundPlayer.loadoutValue !== null) {
          tally.loadoutTotal += roundPlayer.loadoutValue;
          tally.loadoutRounds += 1;
        }
      }

      const teams = input.teams.map((team): MatchRoundTeam => {
        const loadouts = round.players.flatMap((roundPlayer) =>
          teamByPlayer.get(roundPlayer.puuid) === team.id &&
          roundPlayer.loadoutValue !== null
            ? [roundPlayer.loadoutValue]
            : [],
        );
        const loadoutValue =
          loadouts.length === 0
            ? null
            : loadouts.reduce((total, value) => total + value, 0);
        const side =
          round.winningSide === null || round.winningTeamId === null
            ? null
            : team.id === round.winningTeamId
              ? round.winningSide
              : oppositeSide(round.winningSide);

        return {
          teamId: team.id,
          side,
          loadoutValue,
          buyType: loadoutValue === null ? null : classifyBuy(loadoutValue),
        };
      });

      return {
        ...round,
        kills,
        teams,
        players: round.players.map((roundPlayer) => ({
          ...roundPlayer,
          survived: !deaths.has(roundPlayer.puuid),
        })),
      };
    });

  const kastRoundCount = rounds.length;
  const placementOrder = [...input.players].sort(
    (first, second) => second.score - first.score,
  );

  const players = placementOrder.map((player, index): MatchPlayer => {
    const tally = tallies.get(player.puuid);
    const totalHits = player.headshots + player.bodyshots + player.legshots;
    const {
      score,
      kills,
      deaths,
      assists,
      headshots,
      bodyshots,
      legshots,
      damageDealt,
      damageReceived,
      ...identity
    } = player;

    return {
      ...identity,
      placement: index + 1,
      stats: {
        averageCombatScore:
          roundCount === 0 ? 0 : Math.round(score / roundCount),
        kills,
        deaths,
        assists,
        plusMinus: kills - deaths,
        killDeathRatio: roundTo(kills / Math.max(deaths, 1), 2),
        averageDamagePerRound:
          roundCount === 0 ? 0 : roundTo(damageDealt / roundCount, 1),
        damageDeltaPerRound:
          damageReceived === null || roundCount === 0
            ? null
            : Math.round((damageDealt - damageReceived) / roundCount),
        headshots,
        bodyshots,
        legshots,
        headshotPercentage:
          totalHits === 0 ? 0 : roundTo((headshots / totalHits) * 100, 1),
        kast:
          hasRoundData && tally && kastRoundCount > 0
            ? roundTo((tally.kastRounds / kastRoundCount) * 100, 1)
            : null,
        firstKills: hasRoundData && tally ? tally.firstKills : null,
        firstDeaths: hasRoundData && tally ? tally.firstDeaths : null,
        multiKills: hasRoundData && tally ? tally.multiKills : null,
        tradedDeaths: hasRoundData && tally ? tally.tradedDeaths : null,
        tradeKills: hasRoundData && tally ? tally.tradeKills : null,
        plants: hasRoundData && tally ? tally.plants : null,
        defuses: hasRoundData && tally ? tally.defuses : null,
        averageLoadoutValue:
          tally && tally.loadoutRounds > 0
            ? Math.round(tally.loadoutTotal / tally.loadoutRounds)
            : null,
      },
    };
  });

  return {
    id: input.id,
    mapId: input.mapId,
    mapName: input.mapName,
    startedAt: input.startedAt,
    durationMs: input.durationMs,
    seasonShort: input.seasonShort,
    region: input.region,
    roundCount,
    hasRoundData,
    averageRank: averageRank(input.players.map((player) => player.rank)),
    teams: input.teams,
    players,
    rounds,
    duels: [...duelCounts.values()],
  };
}

export function findMatchPlayer(
  detail: MatchDetail,
  puuid: string,
): MatchPlayer | null {
  return detail.players.find((player) => player.puuid === puuid) ?? null;
}

export function findMatchPlayerByRiotId(
  detail: MatchDetail,
  name: string,
  tag: string,
): MatchPlayer | null {
  const normalizedName = name.trim().toLocaleLowerCase();
  const normalizedTag = tag.trim().toLocaleLowerCase();
  return (
    detail.players.find(
      (player) =>
        player.name.toLocaleLowerCase() === normalizedName &&
        player.tag.toLocaleLowerCase() === normalizedTag,
    ) ?? null
  );
}
