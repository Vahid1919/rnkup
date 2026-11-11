# Minimap calibration is hard-coded from valorant-api.com

HenrikDev reports positions in game units. Placing them on a minimap needs a
per-map scale and offset, which valorant-api.com publishes with its map
images (`/v1/maps`: `xMultiplier`, `yMultiplier`, `xScalarToAdd`,
`yScalarToAdd`). We copied those numbers into `MAP_CALIBRATIONS` in
`src/lib/maps.ts`, keyed by map ID, instead of fetching them at runtime. A
fetch would add a second external dependency to every match page, a new
failure mode, and a cache, for values that change only when Riot ships or
reworks a map.

## Consequences

- The projection is a pure function, so it is tested without the network.
- A new or reworked map shows no minimap until its entry is added or
  updated: the match page hides the Map section, and the round replay shows
  the timeline without the map.
- The minimap images themselves are still loaded from valorant-api.com, like
  agent and rank images.
