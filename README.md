# Radiant Stats

A SvelteKit app that turns a Valorant player's recent competitive matches into
stats measured against their lobbies, coaching on what to fix first, and a
detailed page for every match. Data comes from the
[HenrikDev Valorant API](https://docs.henrikdev.xyz).

**New to the code?** Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for
the layout, request flow and a suggested reading order. Terms are defined in
[GLOSSARY.md](GLOSSARY.md), and the reasons behind key decisions are in
[docs/adr/](docs/adr/).

## Quick start

Requires Node.js 20+, pnpm, and a HenrikDev API key.

```bash
pnpm install
echo "VALORANT_API_KEY=your_henrikdev_api_key" > .env.local
pnpm dev
```

Open http://localhost:5173 and search for a Riot ID such as `Janhoi#VAL`.

The key is read only by server code. Do not prefix it with `PUBLIC_` or commit
`.env.local`.

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Development server with hot reload  |
| `pnpm check`        | Type-check Svelte and TypeScript    |
| `pnpm lint`         | ESLint                              |
| `pnpm format:check` | Prettier check                      |
| `pnpm test`         | Vitest (provider calls are faked)   |
| `pnpm test:watch`   | Vitest in watch mode                |
| `pnpm build`        | Production build (Node adapter)     |
| `pnpm preview`      | Preview the production build        |
| `pnpm start`        | Run the built server (`node build`) |

## Routes

| Route                                     | Purpose                           |
| ----------------------------------------- | --------------------------------- |
| `/`                                       | Search for a player               |
| `/players/[name]/[tag]`                   | Player dashboard                  |
| `/players/[name]/[tag]/matches/[matchId]` | One match from that player's view |
| `/leaderboard`                            | Regional Radiant/Immortal+ board  |
| `/api/players/[name]/[tag]`               | Profile JSON for the search flow  |
| `/api/health`                             | Health check                      |

## Data limits

- Stats, trends and coaching use up to **100 detailed matches**, loaded 10 per
  request. The match log also lists up to 500 lighter stored matches.
- Neither is a player's full career history; the provider only keeps what it
  has stored.
- KAST, first kills and deaths, and trades come from the round-by-round kill
  feed, and are empty for matches without it.
- Results are cached in memory for 15 minutes per player.
- The leaderboard is the PC board for one region, 50 players per page,
  filtered with `?region=eu&tier=radiant|immortal&page=1`. Only Immortal and
  Radiant players are on it, and each page is cached for 15 minutes.
- HenrikDev allows about 30 requests a minute, so loading many new players
  quickly can return a "try again" error.

See [ADR 0003](docs/adr/0003-two-kinds-of-match-history.md) for why.
