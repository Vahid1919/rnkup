<script lang="ts">
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import { formatRoundClock } from '$lib/format';
  import {
    playerEncounters,
    type MatchDetail,
    type MatchSide,
    type PlayerEncounter,
  } from '$lib/match-detail';
  import Minimap from './Minimap.svelte';

  type Props = {
    match: MatchDetail;
    subjectPuuid: string;
    /** Opens the round replay at the given round. */
    onSelectRound: (round: number) => void;
  };

  let { match, subjectPuuid, onSelectRound }: Props = $props();

  const uid = $props.id();
  let side = $state<'all' | MatchSide>('all');
  let show = $state<'all' | 'kills' | 'deaths'>('all');
  let openingOnly = $state(false);

  const encounters = $derived(playerEncounters(match, subjectPuuid));
  const onSide = $derived(
    encounters.filter((encounter) => side === 'all' || encounter.side === side),
  );
  const shown = $derived(
    onSide.filter(
      (encounter) =>
        (show === 'all' ||
          (show === 'kills') === (encounter.kind === 'kill')) &&
        (!openingOnly || encounter.isOpening),
    ),
  );

  const nameOf = (puuid: string): string =>
    match.players.find((player) => player.puuid === puuid)?.name ??
    'Unknown player';

  function tally(list: PlayerEncounter[]) {
    const kills = list.filter((encounter) => encounter.kind === 'kill');
    const deaths = list.filter((encounter) => encounter.kind === 'death');
    return {
      kills: kills.length,
      deaths: deaths.length,
      openingWins: kills.filter((encounter) => encounter.isOpening).length,
      openingLosses: deaths.filter((encounter) => encounter.isOpening).length,
    };
  }

  const totals = $derived(tally(onSide));
  const bySide = $derived(
    (['attack', 'defense'] as const).map((value) => ({
      side: value,
      ...tally(encounters.filter((encounter) => encounter.side === value)),
    })),
  );

  function describe(encounter: PlayerEncounter): string {
    const action =
      encounter.kind === 'kill'
        ? `Killed ${nameOf(encounter.opponentPuuid)}`
        : `Died to ${nameOf(encounter.opponentPuuid)}`;
    return `Round ${encounter.round}, ${formatRoundClock(encounter.timeMs)}: ${action}${encounter.weaponName ? ` (${encounter.weaponName})` : ''}${encounter.isOpening ? ', opening duel' : ''}`;
  }

  const capitalize = (value: string): string =>
    value.charAt(0).toUpperCase() + value.slice(1);
</script>

<div class="match-map">
  <div class="controls">
    <SegmentedControl
      legend="Side"
      name="{uid}-side"
      bind:value={side}
      options={[
        { value: 'all', label: 'Both sides' },
        { value: 'attack', label: 'Attack' },
        { value: 'defense', label: 'Defense' },
      ]}
    />
    <SegmentedControl
      legend="Show"
      name="{uid}-show"
      bind:value={show}
      options={[
        { value: 'all', label: 'Kills and deaths' },
        { value: 'kills', label: 'Kills' },
        { value: 'deaths', label: 'Deaths' },
      ]}
    />
    <label class="check">
      <input type="checkbox" bind:checked={openingOnly} />
      Opening duels only
    </label>
  </div>

  <div class="layout">
    <Minimap
      mapId={match.mapId}
      mapName={match.mapName}
      description="{shown.length} of your kills and deaths on {match.mapName}. The list below the map has each one."
    >
      {#snippet children(project)}
        {#each shown as encounter, index (index)}
          {@const at = project(encounter.location)}
          {@const other = encounter.opponentLocation
            ? project(encounter.opponentLocation)
            : null}
          {#if at}
            <g
              class="encounter"
              class:kill={encounter.kind === 'kill'}
              class:death={encounter.kind === 'death'}
            >
              <title>{describe(encounter)}</title>
              {#if other}
                <line
                  class="link"
                  x1={at.x}
                  y1={at.y}
                  x2={other.x}
                  y2={other.y}
                />
                <circle class="opponent" cx={other.x} cy={other.y} r="7" />
              {/if}
              {#if encounter.kind === 'kill'}
                <circle class="dot" cx={at.x} cy={at.y} r="13" />
              {:else}
                <path
                  class="cross"
                  d="M{at.x - 12} {at.y - 12}l24 24m0 -24l-24 24"
                />
              {/if}
            </g>
          {/if}
        {/each}
      {/snippet}
    </Minimap>

    <div class="side-panel">
      <p class="legend">
        <span
          ><span class="key-dot" aria-hidden="true"></span> Where you got a kill</span
        >
        <span
          ><span class="key-cross" aria-hidden="true">✕</span> Where you died</span
        >
        <span>
          <span class="key-ring" aria-hidden="true"></span> Where the other player
          stood
        </span>
      </p>

      <dl class="totals">
        <div>
          <dt>Kills</dt>
          <dd>{totals.kills}</dd>
        </div>
        <div>
          <dt>Deaths</dt>
          <dd>{totals.deaths}</dd>
        </div>
        <div>
          <dt>Opening duels</dt>
          <dd>{totals.openingWins}–{totals.openingLosses}</dd>
        </div>
      </dl>

      <table class="sides">
        <caption class="sr-only"
          >Kills, deaths and opening duels by side</caption
        >
        <thead>
          <tr>
            <th scope="col">Side</th>
            <th scope="col" class="num">Kills</th>
            <th scope="col" class="num">Deaths</th>
            <th scope="col" class="num">Opening duels</th>
          </tr>
        </thead>
        <tbody>
          {#each bySide as row (row.side)}
            <tr>
              <th scope="row">{capitalize(row.side)}</th>
              <td class="num">{row.kills}</td>
              <td class="num">{row.deaths}</td>
              <td class="num">{row.openingWins}–{row.openingLosses}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <p class="note">
        Look for clusters of crosses: the same spot losing you fights round
        after round is the first thing to change.
      </p>
    </div>
  </div>

  <details class="list">
    <summary>Every kill and death <small>{shown.length}</small></summary>
    {#if shown.length === 0}
      <p class="note">Nothing matches these filters.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Side</th>
            <th scope="col">What happened</th>
            <th scope="col">Weapon</th>
            <th scope="col" class="num">Time</th>
            <th scope="col"><span class="sr-only">Replay</span></th>
          </tr>
        </thead>
        <tbody>
          {#each shown as encounter, index (index)}
            <tr>
              <td class="num">{encounter.round}</td>
              <td>{encounter.side ? capitalize(encounter.side) : '—'}</td>
              <td class:kill-text={encounter.kind === 'kill'}>
                {encounter.kind === 'kill' ? 'Killed' : 'Died to'}
                {nameOf(encounter.opponentPuuid)}
                {#if encounter.isOpening}<span class="tag">Opening</span>{/if}
              </td>
              <td>{encounter.weaponName ?? '—'}</td>
              <td class="num">{formatRoundClock(encounter.timeMs)}</td>
              <td>
                <button
                  type="button"
                  onclick={() => onSelectRound(encounter.round)}
                >
                  Replay<span class="sr-only"> round {encounter.round}</span>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </details>
</div>

<style>
  .match-map {
    display: grid;
    gap: var(--space-5);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-5);
  }

  .check {
    display: inline-flex;
    min-height: 2.5rem;
    align-items: center;
    gap: var(--space-2);
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .check input {
    width: 1rem;
    height: 1rem;
    accent-color: var(--val-red);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(16rem, 1fr);
    gap: var(--space-6);
    align-items: start;
  }

  .side-panel {
    display: grid;
    gap: var(--space-5);
  }

  .legend {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    color: var(--val-muted);
    font-size: var(--text-sm);
  }

  .legend > span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .key-dot,
  .key-ring {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }

  .key-dot {
    background: var(--val-win);
  }

  .key-ring {
    width: 0.5rem;
    height: 0.5rem;
    margin: 0 0.125rem;
    border: 2px solid var(--val-cream);
  }

  .key-cross {
    width: 0.75rem;
    color: var(--val-loss);
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }

  .totals {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin: 0;
  }

  .totals div {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: var(--space-3);
    background: var(--val-panel);
  }

  .totals dt {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .totals dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th,
  td {
    border-bottom: 1px solid var(--val-line);
    padding: var(--space-2) var(--space-3) var(--space-2) 0;
    text-align: left;
  }

  thead th {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  tbody th {
    font-weight: 500;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .note {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
    line-height: 1.55;
  }

  .list summary {
    min-height: 2.5rem;
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .list summary small {
    margin-left: var(--space-2);
    color: var(--val-faint);
    font-weight: 400;
  }

  .list table {
    margin-top: var(--space-3);
  }

  .kill-text {
    color: var(--val-cream);
  }

  .tag {
    margin-left: var(--space-2);
    border: 1px solid var(--val-line-strong);
    border-radius: var(--radius-sm);
    padding: 1px var(--space-2);
    color: var(--val-muted);
    font-size: var(--text-xs);
  }

  .list button {
    min-height: 2rem;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: 0 var(--space-3);
    color: var(--val-muted);
    background: transparent;
    font: inherit;
    font-size: var(--text-xs);
    font-weight: 600;
    cursor: pointer;
  }

  .list button:hover {
    border-color: var(--val-line-strong);
    color: var(--val-cream);
  }

  /* Kills are filled dots and deaths crosses, so shape carries the meaning. */
  .link {
    stroke: var(--val-cream);
    stroke-width: 2;
    opacity: 0.28;
  }

  .opponent {
    fill: none;
    stroke: var(--val-cream);
    stroke-width: 3;
    opacity: 0.6;
  }

  .dot {
    fill: var(--val-win);
    stroke: var(--val-bg);
    stroke-width: 3;
  }

  .cross {
    fill: none;
    stroke: var(--val-loss);
    stroke-linecap: round;
    stroke-width: 7;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .layout > :global(.minimap) {
      max-width: 36rem;
    }
  }

  @media (max-width: 640px) {
    .list {
      overflow-x: auto;
    }
  }
</style>
