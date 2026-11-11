import type { MapPoint } from './maps';
import { averageRank, type Rank } from './ranks';

/**
 * Application-owned model of one competitive match: the scoreboard, every
 * round, and the kill feed. `MatchInput` is the validated provider data;
 * `buildMatchDetail` derives the statistics shown to players.
 */

export type MatchSide = 'attack' | 'defense';
export type RoundEndType = 'elimination' | 'defuse' | 'detonate' | 'other';
export type BuyType = 'eco' | 'semi-eco' | 'semi-buy' | 'full-buy';

export const BUY_TYPE_LABELS: Record<BuyType, string> = {
  eco: 'Eco',
  'semi-eco': 'Semi-eco',
  'semi-buy': 'Half buy',
  'full-buy': 'Full buy',
};

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
  /** Credits left unspent after the buy phase. */
  creditsRemaining: number | null;
};

/** Where a living player stood, and which way they faced, at one moment. */
export type MatchPlayerPosition = {
  puuid: string;
  x: number;
  y: number;
  viewRadians: number | null;
};

export type MatchPlantInput = {
  playerPuuid: string;
  site: string | null;
  timeMs: number;
  location: MapPoint | null;
  positions: MatchPlayerPosition[];
};

export type MatchDefuseInput = {
  playerPuuid: string;
  timeMs: number;
  location: MapPoint | null;
  positions: MatchPlayerPosition[];
};

export type MatchRoundInput = {
  number: number;
  winningTeamId: string | null;
  winningSide: MatchSide | null;
  endType: RoundEndType;
  plant: MatchPlantInput | null;
  defuse: MatchDefuseInput | null;
  players: MatchRoundPlayerInput[];
};

export type MatchKillInput = {
  round: number;
  timeMs: number;
  killerPuuid: string;
  victimPuuid: string;
  assistantPuuids: string[];
  weaponName: string | null;
  /** Where the victim died. */
  victimLocation: MapPoint | null;
  /** Living players at the moment of the kill; includes the killer. */
  positions: MatchPlayerPosition[];
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
  creditsRemaining: number | null;
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
        const credits = round.players.flatMap((roundPlayer) =>
          teamByPlayer.get(roundPlayer.puuid) === team.id &&
          roundPlayer.creditsRemaining !== null
            ? [roundPlayer.creditsRemaining]
            : [],
        );
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
          creditsRemaining:
            credits.length === 0
              ? null
              : credits.reduce((total, value) => total + value, 0),
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

export type RoundEvent =
  | { kind: 'kill'; timeMs: number; kill: MatchRoundKill }
  | { kind: 'plant'; timeMs: number; plant: MatchPlantInput }
  | { kind: 'defuse'; timeMs: number; defuse: MatchDefuseInput };

/** Kills, the plant and the defuse of one round in the order they happened. */
export function roundEvents(round: MatchRound): RoundEvent[] {
  const events: RoundEvent[] = round.kills.map((kill) => ({
    kind: 'kill',
    timeMs: kill.timeMs,
    kill,
  }));
  if (round.plant) {
    events.push({
      kind: 'plant',
      timeMs: round.plant.timeMs,
      plant: round.plant,
    });
  }
  if (round.defuse) {
    events.push({
      kind: 'defuse',
      timeMs: round.defuse.timeMs,
      defuse: round.defuse,
    });
  }
  // Array sort is stable, so kills at the same moment keep the feed order.
  return events.sort((first, second) => first.timeMs - second.timeMs);
}

function eventPositions(event: RoundEvent): MatchPlayerPosition[] {
  if (event.kind === 'kill') return event.kill.positions;
  return event.kind === 'plant'
    ? event.plant.positions
    : event.defuse.positions;
}

export type SnapshotMarker = {
  puuid: string;
  location: MapPoint;
  viewRadians: number | null;
  alive: boolean;
  /** The killer or victim of the event this snapshot shows. */
  highlighted: boolean;
};

export type RoundSnapshot = {
  markers: SnapshotMarker[];
  /** From the killer to the victim when the event is a kill. */
  shot: { from: MapPoint; to: MapPoint } | null;
  spike: { location: MapPoint; defused: boolean } | null;
};

/**
 * The map at one event: where everyone alive stood, where earlier victims
 * fell, and the spike once planted. Positions are only recorded at events,
 * so this is a series of still frames rather than continuous movement.
 */
export function roundSnapshot(
  events: RoundEvent[],
  index: number,
): RoundSnapshot {
  const event = events[index];
  if (!event) return { markers: [], shot: null, spike: null };

  const killer = event.kind === 'kill' ? event.kill.killerPuuid : null;
  const victim = event.kind === 'kill' ? event.kill.victimPuuid : null;
  const markers: SnapshotMarker[] = eventPositions(event).map((position) => ({
    puuid: position.puuid,
    location: { x: position.x, y: position.y },
    viewRadians: position.viewRadians,
    alive: true,
    highlighted: position.puuid === killer,
  }));

  let spikeLocation: MapPoint | null = null;
  let defused = false;
  for (const earlier of events.slice(0, index + 1)) {
    if (earlier.kind === 'kill' && earlier.kill.victimLocation) {
      markers.push({
        puuid: earlier.kill.victimPuuid,
        location: earlier.kill.victimLocation,
        viewRadians: null,
        alive: false,
        highlighted: earlier === event,
      });
    } else if (earlier.kind === 'plant' && earlier.plant.location) {
      spikeLocation = earlier.plant.location;
    } else if (earlier.kind === 'defuse') {
      defused = true;
    }
  }

  let shot: RoundSnapshot['shot'] = null;
  if (event.kind === 'kill' && event.kill.victimLocation) {
    const from = markers.find(
      (marker) => marker.alive && marker.puuid === killer,
    );
    if (from && victim !== killer) {
      shot = { from: from.location, to: event.kill.victimLocation };
    }
  }

  return {
    markers,
    shot,
    spike: spikeLocation === null ? null : { location: spikeLocation, defused },
  };
}

export type PlayerEncounter = {
  round: number;
  side: MatchSide | null;
  kind: 'kill' | 'death';
  /** Where the player stood. */
  location: MapPoint;
  /** Where the opponent stood, when recorded. */
  opponentLocation: MapPoint | null;
  opponentPuuid: string;
  weaponName: string | null;
  timeMs: number;
  /** The round's first kill, won or lost by this player. */
  isOpening: boolean;
};

/** Every kill and death of one player against the enemy team, with positions. */
export function playerEncounters(
  detail: MatchDetail,
  puuid: string,
): PlayerEncounter[] {
  const teamId = detail.players.find(
    (player) => player.puuid === puuid,
  )?.teamId;
  if (teamId === undefined) return [];
  const teamByPlayer = new Map(
    detail.players.map((player) => [player.puuid, player.teamId]),
  );

  return detail.rounds.flatMap((round) => {
    const side =
      round.teams.find((team) => team.teamId === teamId)?.side ?? null;
    return round.kills.flatMap((kill): PlayerEncounter[] => {
      const enemy =
        kill.killerPuuid === puuid ? kill.victimPuuid : kill.killerPuuid;
      if (teamByPlayer.get(enemy) === teamId) return [];

      const killerPosition = kill.positions.find(
        (position) => position.puuid === kill.killerPuuid,
      );
      const killerLocation = killerPosition
        ? { x: killerPosition.x, y: killerPosition.y }
        : null;
      const base = {
        round: round.number,
        side,
        opponentPuuid: enemy,
        weaponName: kill.weaponName,
        timeMs: kill.timeMs,
        isOpening: kill.isFirstKill,
      };

      if (kill.killerPuuid === puuid && killerLocation) {
        return [
          {
            ...base,
            kind: 'kill',
            location: killerLocation,
            opponentLocation: kill.victimLocation,
          },
        ];
      }
      if (kill.victimPuuid === puuid && kill.victimLocation) {
        return [
          {
            ...base,
            kind: 'death',
            location: kill.victimLocation,
            opponentLocation: killerLocation,
          },
        ];
      }
      return [];
    });
  });
}

export type BuyRecord = {
  buyType: BuyType;
  played: number;
  won: number;
};

const BUY_ORDER: BuyType[] = ['eco', 'semi-eco', 'semi-buy', 'full-buy'];

/** How often a team converted each kind of buy into a round win. */
export function buyRecords(detail: MatchDetail, teamId: string): BuyRecord[] {
  const records = new Map<BuyType, BuyRecord>(
    BUY_ORDER.map((buyType) => [buyType, { buyType, played: 0, won: 0 }]),
  );
  for (const round of detail.rounds) {
    const buyType = round.teams.find((team) => team.teamId === teamId)?.buyType;
    const record = buyType ? records.get(buyType) : undefined;
    if (!record) continue;
    record.played += 1;
    if (round.winningTeamId === teamId) record.won += 1;
  }
  return BUY_ORDER.flatMap((buyType) => {
    const record = records.get(buyType);
    return record && record.played > 0 ? [record] : [];
  });
}

export type EconomySwings = {
  /** Rounds lost while buying at least two tiers above the enemy. */
  lostWithBetterBuy: number[];
  /** Rounds won while buying at least two tiers below the enemy. */
  wonWithWorseBuy: number[];
};

/** Rounds where the result went against the money, e.g. a full buy lost to an eco. */
export function economySwings(
  detail: MatchDetail,
  teamId: string,
): EconomySwings {
  const swings: EconomySwings = { lostWithBetterBuy: [], wonWithWorseBuy: [] };
  for (const round of detail.rounds) {
    const own = round.teams.find((team) => team.teamId === teamId)?.buyType;
    const enemy = round.teams.find((team) => team.teamId !== teamId)?.buyType;
    if (!own || !enemy) continue;
    const gap = BUY_ORDER.indexOf(own) - BUY_ORDER.indexOf(enemy);
    const won = round.winningTeamId === teamId;
    if (gap >= 2 && !won) swings.lostWithBetterBuy.push(round.number);
    if (gap <= -2 && won) swings.wonWithWorseBuy.push(round.number);
  }
  return swings;
}
