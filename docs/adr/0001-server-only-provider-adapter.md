# All HenrikDev access goes through one server-only module

Every call to HenrikDev, and every read of its JSON, happens in
`src/lib/server/valorant/`. Routes call its `fetch*` functions and get back
application-owned types; Svelte components never see provider JSON. We chose
this over calling HenrikDev from the browser because the API key must stay
secret (SvelteKit refuses to bundle `$lib/server` or `$env/dynamic/private`
into client code) and because one module makes the 30-requests-per-minute rate
limit manageable: caching, pagination and error mapping live in one place.

## Consequences

- Swapping or upgrading the provider means rewriting `parse.ts` and
  `henrik-client.ts`, not the UI or the dashboard maths.
- Provider failures reach routes only as `PlayerLookupError`, whose `kind`
  maps to an HTTP status in `errors.ts`.
