/**
 * The only module that talks to HenrikDev. Routes call the exported
 * `fetch*` functions; parsing, caching and errors live in sibling files.
 *
 * Every `fetch*` function accepts a `fetchFn` and `apiKey` so tests can pass
 * fakes. Caches are only used with the real global `fetch`, so tests that pass
 * a fake never see results cached by another test.
 */

import { env } from '$env/dynamic/private';
import {
  buildPlayerDashboard,
  type CareerMatchInput,
  type CompetitiveMatchInput,
  type PlayerDashboard,
  type PlayerRating,
  type RatingPoint,
  summarizeMatchForPlayer,
} from '$lib/dashboard';
import {
  buildLeaderboardPage,
  LEADERBOARD_PAGE_SIZE,
  type LeaderboardPage,
  type LeaderboardQuery,
} from '$lib/leaderboard';
import { buildMatchDetail, type MatchDetail } from '$lib/match-detail';
import type { PlayerProfile } from '$lib/player-profile';
import {
  dashboardCache,
  leaderboardCache,
  leaderboardCacheKey,
  matchCache,
  playerCacheKey,
  profileCache,
  readTimedCache,
  rememberMatch,
  writeTimedCache,
} from './cache';
import { PlayerLookupError } from './errors';
import {
  isNonEmptyString,
  isRecord,
  optionalRecord,
  parseAccountResponse,
  parseLeaderboard,
  parseMatch,
  parseMatchPage,
  parseRating,
  parseRatingPoint,
  parseStoredMatch,
  requiredRecord,
  validateRiotIdPart,
} from './parse';

export {
  lookupErrorStatus,
  PlayerLookupError,
  type PlayerLookupErrorKind,
} from './errors';

const HENRIK_API_URL = 'https://api.henrikdev.xyz';

/** The provider returns at most ten detailed matches per request. */
const COMPETITIVE_MATCH_PAGE_SIZE = 10;

const COMPETITIVE_MATCH_LIMIT = 100;

const STORED_MATCH_LIMIT = 500;

const RATING_HISTORY_LIMIT = 500;

const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REGION_PATTERN = /^[a-z]{2,5}$/i;

function requireApiKey(apiKey: string | undefined): string {
  if (!isNonEmptyString(apiKey)) {
    throw new PlayerLookupError(
      'upstream',
      'HenrikDev API access is not configured.',
    );
  }

  return apiKey;
}

type HenrikResult = { found: true; body: unknown } | { found: false };

async function requestHenrik(
  url: URL,
  fetchFn: typeof fetch,
  apiKey: string,
  failureMessage: string,
): Promise<HenrikResult> {
  let response: Response;
  try {
    response = await fetchFn(url, {
      headers: { Authorization: apiKey },
    });
  } catch {
    throw new PlayerLookupError('upstream', 'HenrikDev could not be reached.');
  }

  if (response.status === 404) {
    return { found: false };
  }

  if (response.status === 429) {
    throw new PlayerLookupError(
      'rate-limited',
      'HenrikDev is limiting lookups right now. Try again in a minute.',
    );
  }

  if (!response.ok) {
    throw new PlayerLookupError('upstream', failureMessage);
  }

  try {
    return { found: true, body: await response.json() };
  } catch {
    throw new PlayerLookupError('upstream', 'HenrikDev returned invalid JSON.');
  }
}

export async function fetchPlayerProfile(
  name: string,
  tag: string,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<PlayerProfile> {
  const validatedName = validateRiotIdPart(name, 'Riot ID name');
  const validatedTag = validateRiotIdPart(tag, 'Riot ID tag');
  const key = requireApiKey(apiKey);

  const canUseCache = fetchFn === fetch;
  const cacheKey = playerCacheKey(validatedName, validatedTag);
  const cachedProfile = canUseCache
    ? readTimedCache(profileCache, cacheKey)
    : null;
  if (cachedProfile) return cachedProfile;

  const url = new URL(
    `/valorant/v1/account/${encodeURIComponent(validatedName)}/${encodeURIComponent(validatedTag)}`,
    HENRIK_API_URL,
  );
  const result = await requestHenrik(
    url,
    fetchFn,
    key,
    'HenrikDev could not retrieve the account.',
  );
  if (!result.found) {
    throw new PlayerLookupError(
      'not-found',
      'No Valorant account matches that Riot ID.',
    );
  }

  const account = parseAccountResponse(result.body);
  const profile: PlayerProfile = {
    puuid: account.data.puuid,
    riotId: {
      name: account.data.name,
      tag: account.data.tag,
    },
    region: account.data.region,
    accountLevel: account.data.account_level,
    card: account.data.card,
    lastUpdatedAt: account.data.last_update,
  };

  if (canUseCache) writeTimedCache(profileCache, cacheKey, profile);
  return profile;
}

function playerPath(profile: PlayerProfile): string {
  return `${encodeURIComponent(profile.riotId.name)}/${encodeURIComponent(profile.riotId.tag)}`;
}

type DetailedHistory = {
  matches: MatchDetail[];
  /** False when a later page failed and only part of the history loaded. */
  complete: boolean;
};

async function fetchDetailedHistory(
  profile: PlayerProfile,
  fetchFn: typeof fetch,
  apiKey: string,
): Promise<DetailedHistory> {
  const matches = new Map<string, MatchDetail>();

  for (let start = 0; start < COMPETITIVE_MATCH_LIMIT; ) {
    const url = new URL(
      `/valorant/v4/matches/${encodeURIComponent(profile.region.toLowerCase())}/pc/${playerPath(profile)}`,
      HENRIK_API_URL,
    );
    url.searchParams.set('mode', 'competitive');
    url.searchParams.set('size', String(COMPETITIVE_MATCH_PAGE_SIZE));
    url.searchParams.set('start', String(start));

    let result: HenrikResult;
    try {
      result = await requestHenrik(
        url,
        fetchFn,
        apiKey,
        'HenrikDev could not retrieve competitive matches.',
      );
    } catch (error) {
      // Keep what already loaded rather than failing the whole dashboard.
      if (matches.size > 0) {
        return { matches: [...matches.values()], complete: false };
      }
      throw error;
    }

    if (!result.found) break;

    const page = parseMatchPage(result.body);
    for (const match of page.matches) {
      if (matches.size < COMPETITIVE_MATCH_LIMIT) {
        matches.set(match.id, match);
      }
    }
    if (page.returnedMatchCount === 0) break;

    start += page.returnedMatchCount;
  }

  return { matches: [...matches.values()], complete: true };
}

export async function fetchCompetitiveMatches(
  profile: PlayerProfile,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<CompetitiveMatchInput[]> {
  const history = await fetchDetailedHistory(
    profile,
    fetchFn,
    requireApiKey(apiKey),
  );
  return history.matches.flatMap((match) => {
    const summary = summarizeMatchForPlayer(match, profile.puuid);
    return summary ? [summary] : [];
  });
}

async function fetchStoredMatches(
  profile: PlayerProfile,
  fetchFn: typeof fetch,
  apiKey: string,
): Promise<CareerMatchInput[]> {
  const url = new URL(
    `/valorant/v1/stored-matches/${encodeURIComponent(profile.region.toLowerCase())}/${playerPath(profile)}`,
    HENRIK_API_URL,
  );
  url.searchParams.set('mode', 'competitive');
  url.searchParams.set('size', String(STORED_MATCH_LIMIT));

  const result = await requestHenrik(
    url,
    fetchFn,
    apiKey,
    'HenrikDev could not retrieve stored matches.',
  );
  if (!result.found || !isRecord(result.body)) return [];

  const { data } = result.body;
  return Array.isArray(data)
    ? data.flatMap((match) => {
        const parsed = parseStoredMatch(match);
        return parsed ? [parsed] : [];
      })
    : [];
}

async function fetchRating(
  profile: PlayerProfile,
  fetchFn: typeof fetch,
  apiKey: string,
): Promise<PlayerRating | null> {
  const url = new URL(
    `/valorant/v3/mmr/${encodeURIComponent(profile.region.toLowerCase())}/pc/${playerPath(profile)}`,
    HENRIK_API_URL,
  );
  const result = await requestHenrik(
    url,
    fetchFn,
    apiKey,
    'HenrikDev could not retrieve the rating.',
  );
  return result.found ? parseRating(result.body) : null;
}

/** Combines the live rating history with the provider's longer stored one. */
async function fetchRatingHistory(
  profile: PlayerProfile,
  fetchFn: typeof fetch,
  apiKey: string,
): Promise<RatingPoint[]> {
  const region = encodeURIComponent(profile.region.toLowerCase());
  const recentUrl = new URL(
    `/valorant/v2/mmr-history/${region}/pc/${playerPath(profile)}`,
    HENRIK_API_URL,
  );
  const storedUrl = new URL(
    `/valorant/v2/stored-mmr-history/${region}/pc/${playerPath(profile)}`,
    HENRIK_API_URL,
  );
  storedUrl.searchParams.set('size', String(RATING_HISTORY_LIMIT));

  const failureMessage = 'HenrikDev could not retrieve the rating history.';
  const [recent, stored] = await Promise.all([
    requestHenrik(recentUrl, fetchFn, apiKey, failureMessage).catch(
      (): HenrikResult => ({ found: false }),
    ),
    requestHenrik(storedUrl, fetchFn, apiKey, failureMessage).catch(
      (): HenrikResult => ({ found: false }),
    ),
  ]);

  const points = new Map<string, RatingPoint>();
  const collect = (entries: unknown): void => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      const point = parseRatingPoint(entry);
      if (point) points.set(point.matchId ?? point.date, point);
    }
  };

  if (stored.found) collect(optionalRecord(stored.body)?.data);
  if (recent.found) {
    collect(optionalRecord(optionalRecord(recent.body)?.data)?.history);
  }

  return [...points.values()];
}

/** The cached dashboard for a player, without triggering a provider lookup. */
export function getCachedPlayerDashboard(
  name: string,
  tag: string,
): PlayerDashboard | null {
  return readTimedCache(dashboardCache, playerCacheKey(name, tag));
}

export async function fetchPlayerDashboard(
  name: string,
  tag: string,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<PlayerDashboard> {
  const cacheKey = playerCacheKey(name, tag);
  const canUseCache = fetchFn === fetch;
  const cachedDashboard = canUseCache
    ? readTimedCache(dashboardCache, cacheKey)
    : null;
  if (cachedDashboard) return cachedDashboard;

  const profile = await fetchPlayerProfile(name, tag, fetchFn, apiKey);
  const key = requireApiKey(apiKey);

  // Recent detailed matches are required. The longer history and the rating
  // enrich the dashboard, so a failure there leaves those sections empty.
  const [history, careerMatches, rating, ratingHistory] = await Promise.all([
    fetchDetailedHistory(profile, fetchFn, key),
    fetchStoredMatches(profile, fetchFn, key).catch(
      (): CareerMatchInput[] => [],
    ),
    fetchRating(profile, fetchFn, key).catch((): null => null),
    fetchRatingHistory(profile, fetchFn, key).catch((): RatingPoint[] => []),
  ]);

  const dashboard = buildPlayerDashboard({
    profile,
    matches: history.matches.flatMap((match) => {
      const summary = summarizeMatchForPlayer(match, profile.puuid);
      return summary ? [summary] : [];
    }),
    careerMatches,
    rating,
    ratingHistory,
  });

  if (canUseCache) {
    for (const match of history.matches) rememberMatch(match);
    if (history.complete) {
      writeTimedCache(dashboardCache, cacheKey, dashboard);
    }
  }

  return dashboard;
}

export async function fetchMatchDetail(
  region: string,
  matchId: string,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<MatchDetail> {
  if (!MATCH_ID_PATTERN.test(matchId)) {
    throw new PlayerLookupError('invalid-input', 'That match ID is not valid.');
  }
  if (!REGION_PATTERN.test(region)) {
    throw new PlayerLookupError('invalid-input', 'That region is not valid.');
  }

  const normalizedId = matchId.toLowerCase();
  const canUseCache = fetchFn === fetch;
  const cachedMatch = canUseCache ? matchCache.get(normalizedId) : undefined;
  if (cachedMatch) return cachedMatch;

  const url = new URL(
    `/valorant/v4/match/${encodeURIComponent(region.toLowerCase())}/${encodeURIComponent(normalizedId)}`,
    HENRIK_API_URL,
  );
  const result = await requestHenrik(
    url,
    fetchFn,
    requireApiKey(apiKey),
    'HenrikDev could not retrieve the match.',
  );
  if (!result.found) {
    throw new PlayerLookupError('not-found', 'That match could not be found.');
  }

  const body = requiredRecord(
    result.body,
    'HenrikDev returned an unexpected match response.',
  );
  const detail = buildMatchDetail(parseMatch(body.data));
  if (canUseCache) rememberMatch(detail);
  return detail;
}

/** Loads one match in the context of the player whose page it was opened from. */
export async function fetchPlayerMatch(
  name: string,
  tag: string,
  matchId: string,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<{ profile: PlayerProfile; match: MatchDetail }> {
  const profile = await fetchPlayerProfile(name, tag, fetchFn, apiKey);
  const match = await fetchMatchDetail(
    profile.region,
    matchId,
    fetchFn,
    apiKey,
  );

  if (!match.players.some((player) => player.puuid === profile.puuid)) {
    throw new PlayerLookupError(
      'not-found',
      'This player did not play in that match.',
    );
  }

  return { profile, match };
}

/**
 * One page of a region's PC leaderboard. Pages are always read at the full
 * page size and filtered to Radiant afterwards, so both views share a cache.
 */
export async function fetchLeaderboard(
  query: LeaderboardQuery,
  fetchFn: typeof fetch = fetch,
  apiKey: string | undefined = env.VALORANT_API_KEY,
): Promise<LeaderboardPage> {
  if (!REGION_PATTERN.test(query.region)) {
    throw new PlayerLookupError('invalid-input', 'That region is not valid.');
  }
  if (!Number.isSafeInteger(query.page) || query.page < 1) {
    throw new PlayerLookupError('invalid-input', 'That page is not valid.');
  }

  const key = requireApiKey(apiKey);
  const canUseCache = fetchFn === fetch;
  const cacheKey = leaderboardCacheKey(query.region, query.page);
  const cachedSlice = canUseCache
    ? readTimedCache(leaderboardCache, cacheKey)
    : null;
  if (cachedSlice) return buildLeaderboardPage(query, cachedSlice);

  // HenrikDev's docs list `start_index`, but the API pages with a 1-based `page`.
  const url = new URL(
    `/valorant/v3/leaderboard/${encodeURIComponent(query.region)}/pc`,
    HENRIK_API_URL,
  );
  url.searchParams.set('size', String(LEADERBOARD_PAGE_SIZE));
  url.searchParams.set('page', String(query.page));

  const result = await requestHenrik(
    url,
    fetchFn,
    key,
    'HenrikDev could not retrieve the leaderboard.',
  );
  if (!result.found) {
    throw new PlayerLookupError(
      'not-found',
      'No leaderboard is available for that region.',
    );
  }

  const slice = parseLeaderboard(result.body);
  if (canUseCache) writeTimedCache(leaderboardCache, cacheKey, slice);
  return buildLeaderboardPage(query, slice);
}
