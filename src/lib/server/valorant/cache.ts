/**
 * In-memory caches for profiles, dashboards, matches and leaderboard pages.
 *
 * Held on globalThis so they survive module reloads in development. Without
 * this, every saved file would repeat the provider lookups and run into the
 * provider's per-minute rate limit. See docs/adr/0002-in-memory-caches.md.
 */

import type { PlayerDashboard } from '$lib/dashboard';
import type { LeaderboardSlice } from '$lib/leaderboard';
import type { MatchDetail } from '$lib/match-detail';
import type { PlayerProfile } from '$lib/player-profile';

const DASHBOARD_CACHE_DURATION_MS = 15 * 60 * 1000;

const DASHBOARD_CACHE_LIMIT = 200;

const MATCH_CACHE_LIMIT = 600;

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type LookupCaches = {
  profiles: Map<string, TimedCacheEntry<PlayerProfile>>;
  dashboards: Map<string, TimedCacheEntry<PlayerDashboard>>;
  /** Completed matches never change, so they are kept until evicted by size. */
  matches: Map<string, MatchDetail>;
  leaderboards: Map<string, TimedCacheEntry<LeaderboardSlice>>;
};

const cacheHolder = globalThis as typeof globalThis & {
  __rnkupCaches?: LookupCaches;
};

const caches: LookupCaches = (cacheHolder.__rnkupCaches ??= {
  profiles: new Map(),
  dashboards: new Map(),
  matches: new Map(),
  leaderboards: new Map(),
});
// A holder created by an older module version in development may lack it.
caches.leaderboards ??= new Map();

export const profileCache = caches.profiles;

export const dashboardCache = caches.dashboards;

export const matchCache = caches.matches;

export const leaderboardCache = caches.leaderboards;

export function leaderboardCacheKey(region: string, page: number): string {
  return `${region}:${page}`;
}

export function playerCacheKey(name: string, tag: string): string {
  return `${name.trim().toLocaleLowerCase()}#${tag.trim().toLocaleLowerCase()}`;
}

export function readTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) return entry.value;

  cache.delete(key);
  return null;
}

export function writeTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  value: T,
): void {
  if (cache.size >= DASHBOARD_CACHE_LIMIT) {
    const now = Date.now();
    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now || cache.size >= DASHBOARD_CACHE_LIMIT) {
        cache.delete(cachedKey);
      }
    }
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + DASHBOARD_CACHE_DURATION_MS,
  });
}

export function rememberMatch(detail: MatchDetail): void {
  const key = detail.id.toLowerCase();
  matchCache.delete(key);
  matchCache.set(key, detail);
  while (matchCache.size > MATCH_CACHE_LIMIT) {
    const oldest = matchCache.keys().next();
    if (oldest.done) break;
    matchCache.delete(oldest.value);
  }
}
