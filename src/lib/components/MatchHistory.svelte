<script lang="ts" module>
  import { tick } from 'svelte';
  import type { MatchOutcome } from '$lib/dashboard';

  export const PAGE_SIZE = 20;

  /** Filters and paging, lifted to the page so a snapshot can restore them. */
  export type MatchHistoryView = {
    agent: string;
    map: string;
    outcome: 'all' | MatchOutcome;
    visibleCount: number;
    filtersOpen: boolean;
    /** The match last opened from the list, so going back can return to it. */
    openedMatchId: string | null;
  };

  export function defaultHistoryView(): MatchHistoryView {
    return {
      agent: 'all',
      map: 'all',
      outcome: 'all',
      visibleCount: PAGE_SIZE,
      filtersOpen: false,
      openedMatchId: null,
    };
  }

  /** Waits for the row to render, centres it and focuses its link. */
  export async function revealMatchRow(
    matchId: string,
    scroll = true,
  ): Promise<void> {
    await tick();
    const row = document.getElementById(`match-${matchId}`);
    if (scroll) row?.scrollIntoView({ block: 'center' });
    row?.querySelector('a')?.focus({ preventScroll: scroll });
  }

  export function activeFilterCount(view: MatchHistoryView): number {
    return [view.agent, view.map, view.outcome].filter(
      (value) => value !== 'all',
    ).length;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import {
    dayKey,
    formatSeason,
    formatSigned,
    formatTime,
    formatWeekday,
  } from '$lib/format';
  import type { MatchLogEntry } from '$lib/dashboard';
  import AgentIcon from './AgentIcon.svelte';

  type Props = {
    entries: MatchLogEntry[];
    name: string;
    tag: string;
    view: MatchHistoryView;
  };

  type DayGroup = {
    key: string;
    label: string;
    entries: MatchLogEntry[];
  };

  const outcomeLabels: Record<MatchOutcome, string> = {
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',
  };

  let { entries, name, tag, view = $bindable() }: Props = $props();

  const agents = $derived(
    [...new Set(entries.map((entry) => entry.agentName))].sort(),
  );
  const maps = $derived(
    [...new Set(entries.map((entry) => entry.mapName))].sort(),
  );
  const filtered = $derived(
    entries.filter(
      (entry) =>
        (view.agent === 'all' || entry.agentName === view.agent) &&
        (view.map === 'all' || entry.mapName === view.map) &&
        (view.outcome === 'all' || entry.outcome === view.outcome),
    ),
  );
  const visible = $derived(filtered.slice(0, view.visibleCount));
  const isFiltered = $derived(activeFilterCount(view) > 0);

  const groups = $derived.by(() => {
    const result: DayGroup[] = [];
    for (const entry of visible) {
      const key = dayKey(entry.startedAt);
      let group = result.at(-1);
      if (!group || group.key !== key) {
        group = { key, label: formatWeekday(entry.startedAt), entries: [] };
        result.push(group);
      }
      group.entries.push(entry);
    }
    return result;
  });

  function resetPaging(): void {
    view.visibleCount = PAGE_SIZE;
  }

  function clearFilters(): void {
    view.agent = 'all';
    view.map = 'all';
    view.outcome = 'all';
    resetPaging();
  }

  // Returning from a match via its back link lands on that match's row, even
  // when it sits beyond the first page.
  onMount(async () => {
    const hash = page.url.hash;
    if (!hash.startsWith('#match-')) return;

    const index = filtered.findIndex((entry) => `#match-${entry.id}` === hash);
    if (index < 0) return;
    if (index >= view.visibleCount) {
      view.visibleCount = Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE;
    }
    await revealMatchRow(filtered[index].id);
  });

  async function showMore(): Promise<void> {
    const firstNew = filtered[view.visibleCount];
    view.visibleCount += PAGE_SIZE;
    if (firstNew) await revealMatchRow(firstNew.id, false);
  }
</script>

<div class="history">
  <form
    id="match-filters"
    class="filters"
    hidden={!view.filtersOpen}
    onsubmit={(event) => event.preventDefault()}
  >
    <label>
      <span class="filter-label">Agent</span>
      <select bind:value={view.agent} onchange={resetPaging}>
        <option value="all">All agents</option>
        {#each agents as agent (agent)}
          <option value={agent}>{agent}</option>
        {/each}
      </select>
    </label>
    <label>
      <span class="filter-label">Map</span>
      <select bind:value={view.map} onchange={resetPaging}>
        <option value="all">All maps</option>
        {#each maps as map (map)}
          <option value={map}>{map}</option>
        {/each}
      </select>
    </label>
    <label>
      <span class="filter-label">Result</span>
      <select bind:value={view.outcome} onchange={resetPaging}>
        <option value="all">All results</option>
        <option value="win">Wins</option>
        <option value="loss">Losses</option>
        <option value="draw">Draws</option>
      </select>
    </label>
    {#if isFiltered}
      <button type="button" class="text-button" onclick={clearFilters}>
        Clear filters
      </button>
    {/if}
  </form>

  <p class="count" role="status">
    {isFiltered ? `${filtered.length} of ${entries.length} matches` : ''}
  </p>

  {#if filtered.length === 0}
    <div class="empty panel">
      <p>No matches fit these filters.</p>
      <button type="button" class="text-button" onclick={clearFilters}>
        Clear filters
      </button>
    </div>
  {:else}
    <div class="columns" aria-hidden="true">
      <span>Match</span>
      <span>Result</span>
      <span class="num">K/D/A</span>
      <span class="num">ACS</span>
      <span class="num">RR</span>
    </div>
    {#each groups as group (group.key)}
      <section class="day" aria-label={group.label}>
        <h3>{group.label}</h3>
        <ol>
          {#each group.entries as entry (entry.id)}
            <li id="match-{entry.id}">
              <a
                class="match"
                href={resolve('/players/[name]/[tag]/matches/[matchId]', {
                  name,
                  tag,
                  matchId: entry.id,
                })}
                onclick={() => (view.openedMatchId = entry.id)}
              >
                <span class="identity">
                  <AgentIcon
                    agentId={entry.agentId}
                    agentName={entry.agentName}
                    size="sm"
                  />
                  <span class="where">
                    <strong>{entry.mapName}</strong>
                    <span>
                      {entry.agentName} · {formatTime(entry.startedAt)}
                    </span>
                  </span>
                </span>

                <span class="result">
                  <span class="outcome {entry.outcome}">
                    {outcomeLabels[entry.outcome]}
                  </span>
                  <span class="score">
                    {entry.score.won}–{entry.score.lost}
                  </span>
                </span>

                <span class="stats">
                  <span class="cell num">
                    <span class="cell-label">K/D/A</span>
                    {entry.kills} / {entry.deaths} / {entry.assists}
                  </span>
                  <span class="cell num">
                    <span class="cell-label">ACS</span>
                    {entry.averageCombatScore}
                  </span>
                  <span
                    class="cell num"
                    class:no-value={entry.ratingChange === null}
                  >
                    {#if entry.ratingChange !== null}
                      <span class="cell-label">RR</span>
                      <span
                        class:tone-good={entry.ratingChange > 0}
                        class:tone-bad={entry.ratingChange < 0}
                      >
                        {formatSigned(entry.ratingChange)}
                      </span>
                    {:else}
                      <span class="no-rr" aria-hidden="true">—</span>
                      <span class="sr-only">No RR change recorded</span>
                    {/if}
                  </span>
                </span>

                <span class="sr-only">
                  {formatSeason(entry.seasonShort)}. Open match details.
                </span>
              </a>
            </li>
          {/each}
        </ol>
      </section>
    {/each}

    {#if view.visibleCount < filtered.length}
      <button class="show-more" type="button" onclick={showMore}>
        Show {Math.min(PAGE_SIZE, filtered.length - view.visibleCount)} more
        <span>of {filtered.length - view.visibleCount} older</span>
      </button>
    {/if}
  {/if}
</div>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-4);
  }

  .filters[hidden] {
    display: none;
  }

  /* Label and select read as one quiet control. */
  label {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--radius);
    background: var(--val-panel);
  }

  label:hover {
    background: var(--val-panel-raised);
  }

  .filter-label {
    padding-left: var(--space-3);
    color: var(--val-faint);
    font-size: var(--text-sm);
    pointer-events: none;
  }

  select {
    min-height: 2.5rem;
    border: 0;
    border-radius: var(--radius);
    padding: 0 var(--space-3) 0 var(--space-2);
    color: var(--val-cream);
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
  }

  select:focus-visible {
    outline-offset: 2px;
  }

  option {
    background: var(--val-bg);
  }

  .count {
    margin: 0 0 var(--space-3);
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .count:empty {
    display: none;
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    padding: var(--space-6);
    color: var(--val-muted);
    text-align: center;
  }

  .empty p {
    margin: 0;
  }

  /* Shared column template for the header row and every match row. */
  .columns,
  .match {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr) minmax(7.5rem, 1fr) minmax(7.5rem, 1fr)
      4rem 4rem;
    align-items: center;
    gap: var(--space-4);
    padding-inline: var(--space-3);
  }

  .columns {
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--val-line);
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  .stats {
    display: contents;
  }

  .num {
    text-align: right;
  }

  .day {
    margin-top: var(--space-5);
  }

  h3 {
    margin: 0 0 var(--space-1);
    padding-inline: var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    border-top: 1px solid var(--val-line);
  }

  .match {
    min-height: 3.5rem;
    border-radius: var(--radius);
    padding-block: var(--space-2);
    color: var(--val-cream);
    text-decoration: none;
    transition: background-color 150ms ease;
  }

  .match:hover {
    background: var(--val-panel);
  }

  .identity {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-3);
  }

  .where {
    display: grid;
    min-width: 0;
    line-height: 1.3;
  }

  .where strong {
    font-weight: 600;
  }

  .where span {
    overflow: hidden;
    color: var(--val-faint);
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    font-variant-numeric: tabular-nums;
  }

  .outcome {
    min-width: 2.25rem;
    font-weight: 600;
  }

  .outcome.win {
    color: var(--val-win);
  }

  .outcome.loss {
    color: var(--val-loss);
  }

  .outcome.draw {
    color: var(--val-draw);
  }

  .score {
    color: var(--val-muted);
  }

  .cell {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Holds the RR column on wide screens without competing with real values. */
  .no-rr {
    color: var(--val-line-strong);
  }

  /* Column headers label the cells on wide screens; inline labels take over on phones. */
  .cell-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .show-more {
    display: block;
    width: 100%;
    min-height: 2.75rem;
    margin-top: var(--space-5);
    border: 0;
    border-radius: var(--radius);
    color: var(--val-cream);
    background: var(--val-panel);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .show-more:hover {
    background: var(--val-panel-raised);
  }

  .show-more span {
    color: var(--val-faint);
    font-weight: 400;
  }

  @media (max-width: 680px) {
    .columns {
      display: none;
    }

    .match {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity result'
        'stats stats';
      gap: var(--space-1) var(--space-3);
      padding-block: var(--space-3);
    }

    .identity {
      grid-area: identity;
    }

    .result {
      grid-area: result;
    }

    .stats {
      display: flex;
      grid-area: stats;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-4);
      padding-left: calc(2rem + var(--space-3));
      color: var(--val-muted);
      font-size: var(--text-sm);
    }

    .cell {
      text-align: left;
    }

    .cell.no-value {
      display: none;
    }

    .cell-label {
      position: static;
      width: auto;
      height: auto;
      margin-right: var(--space-1);
      clip-path: none;
      color: var(--val-faint);
    }

    label {
      flex: 1 1 8rem;
    }

    select {
      width: 100%;
      min-width: 0;
    }
  }
</style>
