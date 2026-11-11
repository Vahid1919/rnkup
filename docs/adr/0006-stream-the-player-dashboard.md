# Stream the player dashboard after the profile

Loading a new player takes about 15 HenrikDev requests, and the page used to
wait for all of them. The player page's server `load` now awaits only the
profile and returns the dashboard as a promise, which SvelteKit streams to the
page. We kept the profile awaited so that invalid or unknown Riot IDs still
answer with a real 400 or 404. A cached dashboard is returned resolved, so
warm pages render fully on the server.

## Consequences

- Once streaming starts the HTTP status is already 200, so a failed match
  history can't become a 502 page. The promise always resolves to
  `{ ok: true, dashboard }` or `{ ok: false, message }`, and the page shows the
  message with a retry link.
- Streamed data needs JavaScript; without it the loading panel stays.
- The dashboard call reuses the profile cached a moment earlier, so streaming
  adds no provider request.

## Sources

- [SvelteKit: Streaming with promises](https://svelte.dev/docs/kit/load#Streaming-with-promises)
