/**
 * Turns untrusted HenrikDev JSON and user input into application types.
 * Required data that is missing or malformed throws `PlayerLookupError`;
 * optional data becomes `null`. Nothing outside this file reads raw provider
 * JSON.
 */

import type {
  CareerMatchInput,
  PlayerRating,
  RatingPoint,
} from '$lib/dashboard';
import {
  buildMatchDetail,
  type MatchDetail,
  type MatchInput,
  type MatchKillInput,
  type MatchPlayerInput,
  type MatchPlayerPosition,
  type MatchRoundInput,
  type MatchRoundPlayerInput,
  type MatchSide,
  type MatchTeamInput,
  type RoundEndType,
} from '$lib/match-detail';
import type {
  LeaderboardPlayer,
  LeaderboardSlice,
  LeaderboardThreshold,
} from '$lib/leaderboard';
import type { MapPoint } from '$lib/maps';
import { type Rank, toRank } from '$lib/ranks';
import { PlayerLookupError } from './errors';

type HenrikAccountResponse = {
  data: {
    puuid: string;
    region: string;
    account_level: number;
    name: string;
    tag: string;
    card: {
      id: string;
      small: string;
      large: string;
      wide: string;
    };
    last_update: string;
  };
  status: number;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function parseAccountResponse(value: unknown): HenrikAccountResponse {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev returned an unexpected response.',
    );
  }

  const { data } = value;
  const card = data.card;

  if (
    !isNonEmptyString(data.puuid) ||
    !isNonEmptyString(data.region) ||
    !isNonNegativeSafeInteger(data.account_level) ||
    !isNonEmptyString(data.name) ||
    !isNonEmptyString(data.tag) ||
    !isRecord(card) ||
    !isNonEmptyString(card.id) ||
    !isNonEmptyString(card.small) ||
    !isNonEmptyString(card.large) ||
    !isNonEmptyString(card.wide) ||
    !isNonEmptyString(data.last_update)
  ) {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev returned incomplete player data.',
    );
  }

  return value as HenrikAccountResponse;
}

export function validateRiotIdPart(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 32) {
    throw new PlayerLookupError(
      'invalid-input',
      `${label} must contain between 1 and 32 characters.`,
    );
  }

  return normalized;
}

export function requiredRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new PlayerLookupError('upstream', message);
  }

  return value;
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  message: string,
): string {
  if (!isNonEmptyString(record[key])) {
    throw new PlayerLookupError('upstream', message);
  }

  return record[key];
}

function requiredNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
  message: string,
): number {
  if (!isNonNegativeSafeInteger(record[key])) {
    throw new PlayerLookupError('upstream', message);
  }

  return record[key];
}

export function optionalRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function optionalString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = record?.[key];
  return isNonEmptyString(value) ? value : null;
}

function optionalNonNegativeInteger(
  record: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = record?.[key];
  return isNonNegativeSafeInteger(value) ? value : null;
}

function optionalFiniteNumber(
  record: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseRank(value: unknown): Rank | null {
  const tier = optionalRecord(value);
  const id = optionalNonNegativeInteger(tier, 'id');
  return id === null ? null : toRank(id);
}

function parseMatchPlayer(value: unknown): MatchPlayerInput {
  const player = requiredRecord(
    value,
    'HenrikDev returned an invalid match player.',
  );
  const stats = requiredRecord(
    player.stats,
    'HenrikDev returned a player without match statistics.',
  );
  const agent = requiredRecord(
    player.agent,
    'HenrikDev returned a player without an agent.',
  );
  const damage = requiredRecord(
    stats.damage,
    'HenrikDev returned a player without damage statistics.',
  );
  const hitMessage = 'HenrikDev returned invalid hit statistics.';

  return {
    puuid: requiredString(
      player,
      'puuid',
      'HenrikDev returned a player without an ID.',
    ),
    name: optionalString(player, 'name') ?? '',
    tag: optionalString(player, 'tag') ?? '',
    teamId: requiredString(
      player,
      'team_id',
      'HenrikDev returned a player without a team.',
    ),
    partyId: optionalString(player, 'party_id'),
    agentId: optionalString(agent, 'id'),
    agentName: requiredString(
      agent,
      'name',
      'HenrikDev returned a player without an agent name.',
    ),
    rank: parseRank(player.tier),
    accountLevel: optionalNonNegativeInteger(player, 'account_level'),
    score: requiredNonNegativeInteger(
      stats,
      'score',
      'HenrikDev returned invalid score statistics.',
    ),
    kills: requiredNonNegativeInteger(
      stats,
      'kills',
      'HenrikDev returned invalid kill statistics.',
    ),
    deaths: requiredNonNegativeInteger(
      stats,
      'deaths',
      'HenrikDev returned invalid death statistics.',
    ),
    assists: requiredNonNegativeInteger(
      stats,
      'assists',
      'HenrikDev returned invalid assist statistics.',
    ),
    headshots: requiredNonNegativeInteger(stats, 'headshots', hitMessage),
    bodyshots: requiredNonNegativeInteger(stats, 'bodyshots', hitMessage),
    legshots: requiredNonNegativeInteger(stats, 'legshots', hitMessage),
    damageDealt: requiredNonNegativeInteger(
      damage,
      'dealt',
      'HenrikDev returned invalid damage statistics.',
    ),
    damageReceived: optionalNonNegativeInteger(damage, 'received'),
  };
}

function parseMatchTeam(value: unknown): MatchTeamInput {
  const team = requiredRecord(value, 'HenrikDev returned an invalid team.');
  const rounds = requiredRecord(
    team.rounds,
    'HenrikDev returned a team without round totals.',
  );
  if (typeof team.won !== 'boolean') {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev returned an invalid match outcome.',
    );
  }

  return {
    id: requiredString(
      team,
      'team_id',
      'HenrikDev returned a team without an ID.',
    ),
    roundsWon: requiredNonNegativeInteger(
      rounds,
      'won',
      'HenrikDev returned an invalid score.',
    ),
    roundsLost: requiredNonNegativeInteger(
      rounds,
      'lost',
      'HenrikDev returned an invalid score.',
    ),
    won: team.won,
  };
}

function parseRoundEndType(value: unknown): RoundEndType {
  switch (value) {
    case 'Elimination':
      return 'elimination';
    case 'Defuse':
      return 'defuse';
    case 'Detonate':
      return 'detonate';
    default:
      return 'other';
  }
}

function parseSide(value: unknown): MatchSide | null {
  if (value === 'Attacker') return 'attack';
  if (value === 'Defender') return 'defense';
  return null;
}

/** Shares one string per player so cached matches don't repeat every ID. */
type Intern = (puuid: string) => string;

function parseLocation(value: unknown): MapPoint | null {
  const location = optionalRecord(value);
  const x = optionalFiniteNumber(location, 'x');
  const y = optionalFiniteNumber(location, 'y');
  return x === null || y === null ? null : { x, y };
}

/** HenrikDev nests the ID under `player`; its published schema puts it at the top. */
function parsePositions(value: unknown, intern: Intern): MatchPlayerPosition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = optionalRecord(item);
    const puuid =
      optionalString(optionalRecord(entry?.player), 'puuid') ??
      optionalString(entry, 'puuid');
    const location = parseLocation(entry?.location);
    if (puuid === null || location === null) return [];
    return [
      {
        puuid: intern(puuid),
        x: location.x,
        y: location.y,
        viewRadians: optionalFiniteNumber(entry, 'view_radians'),
      },
    ];
  });
}

function parseRoundPlayer(value: unknown): MatchRoundPlayerInput | null {
  const entry = optionalRecord(value);
  const puuid = optionalString(optionalRecord(entry?.player), 'puuid');
  if (!entry || puuid === null) return null;

  const stats = optionalRecord(entry.stats);
  const economy = optionalRecord(entry.economy);
  const damage = Array.isArray(entry.damage_events)
    ? entry.damage_events.reduce<number>(
        (total, event) =>
          total +
          (optionalNonNegativeInteger(optionalRecord(event), 'damage') ?? 0),
        0,
      )
    : 0;

  return {
    puuid,
    kills: optionalNonNegativeInteger(stats, 'kills') ?? 0,
    score: optionalNonNegativeInteger(stats, 'score') ?? 0,
    damage,
    loadoutValue: optionalNonNegativeInteger(economy, 'loadout_value'),
    weaponName: optionalString(optionalRecord(economy?.weapon), 'name'),
    armorName: optionalString(optionalRecord(economy?.armor), 'name'),
    creditsRemaining: optionalNonNegativeInteger(economy, 'remaining'),
  };
}

/**
 * Older matches omit which side won a round. Red always attacks for the first
 * twelve rounds and the teams then swap, so the side follows from the round
 * number. Overtime is left unknown.
 */
function inferWinningSide(
  roundIndex: number,
  winningTeamId: string | null,
): MatchSide | null {
  if (winningTeamId !== 'Red' && winningTeamId !== 'Blue') return null;
  if (roundIndex >= 24) return null;

  const redAttacks = roundIndex < 12;
  return (winningTeamId === 'Red') === redAttacks ? 'attack' : 'defense';
}

/** Rounds and kills enrich a match; a malformed entry is skipped, not fatal. */
function parseRound(value: unknown, intern: Intern): MatchRoundInput | null {
  const round = optionalRecord(value);
  const id = optionalNonNegativeInteger(round, 'id');
  if (!round || id === null) return null;

  const plant = optionalRecord(round.plant);
  const planter = optionalString(optionalRecord(plant?.player), 'puuid');
  const plantTime = optionalNonNegativeInteger(plant, 'round_time_in_ms');
  const defuse = optionalRecord(round.defuse);
  const defuser = optionalString(optionalRecord(defuse?.player), 'puuid');
  const defuseTime = optionalNonNegativeInteger(defuse, 'round_time_in_ms');

  const winningTeamId = optionalString(round, 'winning_team');

  return {
    number: id + 1,
    winningTeamId,
    winningSide:
      parseSide(round.winning_team_role) ?? inferWinningSide(id, winningTeamId),
    endType: parseRoundEndType(round.result),
    plant:
      planter !== null && plantTime !== null
        ? {
            playerPuuid: intern(planter),
            site: optionalString(plant, 'site'),
            timeMs: plantTime,
            location: parseLocation(plant?.location),
            positions: parsePositions(plant?.player_locations, intern),
          }
        : null,
    defuse:
      defuser !== null && defuseTime !== null
        ? {
            playerPuuid: intern(defuser),
            timeMs: defuseTime,
            location: parseLocation(defuse?.location),
            positions: parsePositions(defuse?.player_locations, intern),
          }
        : null,
    players: Array.isArray(round.stats)
      ? round.stats.flatMap((entry) => {
          const parsed = parseRoundPlayer(entry);
          return parsed ? [parsed] : [];
        })
      : [],
  };
}

function parseKill(value: unknown, intern: Intern): MatchKillInput | null {
  const kill = optionalRecord(value);
  const round = optionalNonNegativeInteger(kill, 'round');
  const timeMs = optionalNonNegativeInteger(kill, 'time_in_round_in_ms');
  const killerPuuid = optionalString(optionalRecord(kill?.killer), 'puuid');
  const victimPuuid = optionalString(optionalRecord(kill?.victim), 'puuid');
  if (
    !kill ||
    round === null ||
    timeMs === null ||
    killerPuuid === null ||
    victimPuuid === null
  ) {
    return null;
  }

  return {
    round: round + 1,
    timeMs,
    killerPuuid: intern(killerPuuid),
    victimPuuid: intern(victimPuuid),
    assistantPuuids: Array.isArray(kill.assistants)
      ? kill.assistants.flatMap((assistant) => {
          const puuid = optionalString(optionalRecord(assistant), 'puuid');
          return puuid === null ? [] : [intern(puuid)];
        })
      : [],
    weaponName: optionalString(optionalRecord(kill.weapon), 'name'),
    victimLocation: parseLocation(kill.location),
    positions: parsePositions(kill.player_locations, intern),
  };
}

export function parseMatch(value: unknown): MatchInput {
  const match = requiredRecord(value, 'HenrikDev returned an invalid match.');
  const metadata = requiredRecord(
    match.metadata,
    'HenrikDev returned match metadata in an unexpected format.',
  );
  const map = requiredRecord(
    metadata.map,
    'HenrikDev returned a match without a map.',
  );

  if (!Array.isArray(match.players) || !Array.isArray(match.teams)) {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev returned a match without player or team data.',
    );
  }

  const players = match.players.map(parseMatchPlayer);
  const known = new Map(players.map((player) => [player.puuid, player.puuid]));
  const intern: Intern = (puuid) => {
    const shared = known.get(puuid);
    if (shared !== undefined) return shared;
    known.set(puuid, puuid);
    return puuid;
  };

  return {
    id: requiredString(
      metadata,
      'match_id',
      'HenrikDev returned a match without an ID.',
    ),
    mapId: optionalString(map, 'id'),
    mapName: requiredString(
      map,
      'name',
      'HenrikDev returned a match without a map name.',
    ),
    startedAt: requiredString(
      metadata,
      'started_at',
      'HenrikDev returned a match without a start time.',
    ),
    durationMs: optionalNonNegativeInteger(metadata, 'game_length_in_ms'),
    seasonShort: optionalString(optionalRecord(metadata.season), 'short'),
    region: optionalString(metadata, 'region'),
    teams: match.teams.map(parseMatchTeam),
    players,
    rounds: Array.isArray(match.rounds)
      ? match.rounds.flatMap((round) => {
          const parsed = parseRound(round, intern);
          return parsed ? [parsed] : [];
        })
      : [],
    kills: Array.isArray(match.kills)
      ? match.kills.flatMap((kill) => {
          const parsed = parseKill(kill, intern);
          return parsed ? [parsed] : [];
        })
      : [],
  };
}

type MatchPage = {
  matches: MatchDetail[];
  returnedMatchCount: number;
};

export function parseMatchPage(value: unknown): MatchPage {
  const response = requiredRecord(
    value,
    'HenrikDev returned an unexpected match response.',
  );
  if (!Array.isArray(response.data)) {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev returned match data in an unexpected format.',
    );
  }

  return {
    returnedMatchCount: response.data.length,
    matches: response.data.flatMap((match) => {
      try {
        return [buildMatchDetail(parseMatch(match))];
      } catch {
        return [];
      }
    }),
  };
}

export function parseStoredMatch(value: unknown): CareerMatchInput | null {
  const match = optionalRecord(value);
  const meta = optionalRecord(match?.meta);
  const stats = optionalRecord(match?.stats);
  const teams = optionalRecord(match?.teams);
  const map = optionalRecord(meta?.map);
  const character = optionalRecord(stats?.character);
  const shots = optionalRecord(stats?.shots);
  const damage = optionalRecord(stats?.damage);

  const id = optionalString(meta, 'id');
  const startedAt = optionalString(meta, 'started_at');
  const mapName = optionalString(map, 'name');
  const agentName = optionalString(character, 'name');
  const team = optionalString(stats, 'team')?.toLowerCase();
  const kills = optionalNonNegativeInteger(stats, 'kills');
  const deaths = optionalNonNegativeInteger(stats, 'deaths');
  const assists = optionalNonNegativeInteger(stats, 'assists');
  const score = optionalNonNegativeInteger(stats, 'score');
  const red = optionalNonNegativeInteger(teams, 'red');
  const blue = optionalNonNegativeInteger(teams, 'blue');

  if (
    id === null ||
    startedAt === null ||
    mapName === null ||
    agentName === null ||
    (team !== 'red' && team !== 'blue') ||
    kills === null ||
    deaths === null ||
    assists === null ||
    score === null ||
    red === null ||
    blue === null
  ) {
    return null;
  }

  const mode = optionalString(meta, 'mode');
  if (mode !== null && mode.toLowerCase() !== 'competitive') return null;

  const won = team === 'red' ? red : blue;
  const lost = team === 'red' ? blue : red;
  const rounds = won + lost;
  if (rounds === 0) return null;

  const head = optionalNonNegativeInteger(shots, 'head') ?? 0;
  const hits =
    head +
    (optionalNonNegativeInteger(shots, 'body') ?? 0) +
    (optionalNonNegativeInteger(shots, 'leg') ?? 0);
  const damageMade = optionalNonNegativeInteger(damage, 'made');
  const damageReceived = optionalNonNegativeInteger(damage, 'received');
  const tier = optionalNonNegativeInteger(stats, 'tier');

  return {
    id,
    startedAt,
    mapName,
    agentName,
    agentId: optionalString(character, 'id'),
    seasonShort: optionalString(optionalRecord(meta?.season), 'short'),
    rank: tier === null ? null : toRank(tier),
    outcome: won === lost ? 'draw' : won > lost ? 'win' : 'loss',
    score: { won, lost },
    kills,
    deaths,
    assists,
    averageCombatScore: Math.round(score / rounds),
    averageDamagePerRound:
      damageMade === null ? 0 : Math.round(damageMade / rounds),
    damageDeltaPerRound:
      damageMade === null || damageReceived === null
        ? null
        : Math.round((damageMade - damageReceived) / rounds),
    headshotPercentage: hits === 0 ? 0 : Math.round((head / hits) * 1000) / 10,
  };
}

export function parseRating(value: unknown): PlayerRating | null {
  const data = optionalRecord(optionalRecord(value)?.data);
  if (!data) return null;

  const current = optionalRecord(data.current);
  const currentRank = parseRank(current?.tier);
  const currentRr = optionalNonNegativeInteger(current, 'rr');
  const peak = optionalRecord(data.peak);
  const peakRank = parseRank(peak?.tier);

  return {
    current:
      currentRank !== null && currentRr !== null
        ? {
            rank: currentRank,
            rr: currentRr,
            lastChange: optionalFiniteNumber(current, 'last_change'),
          }
        : null,
    peak:
      peakRank !== null
        ? {
            rank: peakRank,
            seasonShort: optionalString(optionalRecord(peak?.season), 'short'),
          }
        : null,
    seasons: Array.isArray(data.seasonal)
      ? data.seasonal.flatMap((entry) => {
          const season = optionalRecord(entry);
          const seasonShort = optionalString(
            optionalRecord(season?.season),
            'short',
          );
          const games = optionalNonNegativeInteger(season, 'games');
          const wins = optionalNonNegativeInteger(season, 'wins');
          return seasonShort === null || games === null || wins === null
            ? []
            : [
                {
                  seasonShort,
                  games,
                  wins,
                  endRank: parseRank(season?.end_tier),
                },
              ];
        })
      : [],
  };
}

export function parseRatingPoint(value: unknown): RatingPoint | null {
  const point = optionalRecord(value);
  const rank = parseRank(point?.tier);
  const date = optionalString(point, 'date');
  const rr = optionalNonNegativeInteger(point, 'rr');
  const rating = optionalNonNegativeInteger(point, 'elo');
  const change = optionalFiniteNumber(point, 'last_change');
  if (
    rank === null ||
    date === null ||
    rr === null ||
    rating === null ||
    change === null
  ) {
    return null;
  }

  return {
    matchId: optionalString(point, 'match_id'),
    date,
    rank,
    rr,
    change,
    rating,
  };
}

function parseLeaderboardPlayer(value: unknown): LeaderboardPlayer | null {
  const player = optionalRecord(value);
  const position = optionalNonNegativeInteger(player, 'leaderboard_rank');
  const tier = optionalNonNegativeInteger(player, 'tier');
  const rankRating = optionalNonNegativeInteger(player, 'rr');
  const wins = optionalNonNegativeInteger(player, 'wins');
  if (
    position === null ||
    position === 0 ||
    tier === null ||
    rankRating === null ||
    wins === null
  ) {
    return null;
  }

  const name = optionalString(player, 'name');
  const tag = optionalString(player, 'tag');
  const hidden = player?.is_anonymized === true;

  return {
    position,
    riotId: hidden || name === null || tag === null ? null : { name, tag },
    rank: toRank(tier),
    rankRating,
    wins,
  };
}

function parseLeaderboardThreshold(
  value: unknown,
): LeaderboardThreshold | null {
  const threshold = optionalRecord(value);
  const rank = parseRank(threshold?.tier);
  const startPosition = optionalNonNegativeInteger(threshold, 'start_index');
  const minRankRating = optionalNonNegativeInteger(threshold, 'threshold');
  if (rank === null || startPosition === null || minRankRating === null) {
    return null;
  }

  return { rank, startPosition, minRankRating };
}

/** Malformed players and thresholds are skipped; a malformed page throws. */
export function parseLeaderboard(value: unknown): LeaderboardSlice {
  const message = 'HenrikDev returned an unexpected leaderboard response.';
  const body = requiredRecord(value, message);
  const results = requiredRecord(body.results, message);
  const data = requiredRecord(body.data, message);
  if (!Array.isArray(data.players)) {
    throw new PlayerLookupError('upstream', message);
  }

  return {
    updatedAt: requiredString(data, 'updated_at', message),
    totalPlayers: requiredNonNegativeInteger(results, 'total', message),
    thresholds: Array.isArray(data.thresholds)
      ? data.thresholds
          .flatMap((entry) => {
            const threshold = parseLeaderboardThreshold(entry);
            return threshold ? [threshold] : [];
          })
          .sort((a, b) => a.startPosition - b.startPosition)
      : [],
    players: data.players.flatMap((entry) => {
      const player = parseLeaderboardPlayer(entry);
      return player ? [player] : [];
    }),
  };
}
