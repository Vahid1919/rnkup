# Stats come from 100 detailed matches; the match log uses stored matches

HenrikDev offers two kinds of history. The v4 matches endpoint returns full
matches (rounds, kill feed, all ten players) ten at a time. The stored-matches
endpoint returns lighter records, up to 500 at once, but with less detail,
possible gaps and shifting page positions. Every calculated stat, trend and
insight uses up to 100 detailed matches, because KAST, trades and first
kills/deaths need the kill feed. The match log on the dashboard shows the
stored matches so players can see further back. We rejected fetching every
match in detail because that costs one request per ten matches against a
30-per-minute limit.

## Consequences

- Neither history is a player's complete career; the UI says "available
  history" or "last 100 matches".
- First kills, first deaths, trades and KAST are derived from the kill feed in
  `src/lib/match-detail.ts`, not read from provider totals, and are `null`
  for matches without round data.

## Sources

- [HenrikDev: Get matches by name (v4)](https://docs.henrikdev.xyz/api-reference/valorant/get-matches-by-name-v4.md)
- [HenrikDev: Stored Matches](https://docs.henrikdev.xyz/valorant/guides/stored-matches.md)
