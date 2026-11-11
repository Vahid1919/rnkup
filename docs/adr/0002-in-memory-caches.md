# Cache lookups in process memory, held on globalThis

Profiles and dashboards are cached for 15 minutes, and completed matches until
evicted by size, in plain `Map`s in `src/lib/server/valorant/cache.ts`. We
chose in-memory caching over Redis or a database because the app runs as one
Node process and has no other storage. The maps hang off `globalThis` so Vite
module reloads in development do not empty them and trip the provider's rate
limit.

## Consequences

- Caches are per process and lost on restart; running several instances would
  need shared storage.
- Caches are used only when the real global `fetch` is in use. Tests that pass
  a fake `fetchFn` bypass them, so tests cannot leak data into each other. The
  cache test stubs the global `fetch` instead.
- Opening a match page reads the dashboard cache (if warm) for "your average"
  comparisons, but never triggers a full history lookup.
