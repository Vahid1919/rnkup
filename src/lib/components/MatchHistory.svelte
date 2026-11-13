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
    ordinal,
  } from '$lib/format';
  import {
    summarizeMatchLog,
    type MatchLogEntry,
    type MatchLogTotals,
  } from '$lib/dashboard';
  import { rankIconUrl } from '$lib/ranks';
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
    /** The whole day within the filters, even when paging cuts it short. */
    totals: MatchLogTotals;
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

  const totals = $derived(summarizeMatchLog(filtered));

  const groups = $derived.by(() => {
    const days: Record<string, MatchLogEntry[]> = {};
    for (const entry of filtered) {
      (days[dayKey(entry.startedAt)] ??= []).push(entry);
    }

    const result: DayGroup[] = [];
    for (const entry of visible) {
      const key = dayKey(entry.startedAt);
      let group = result.at(-1);
      if (!group || group.key !== key) {
        group = {
          key,
          label: formatWeekday(entry.startedAt),
          entries: [],
          totals: summarizeMatchLog(days[key] ?? []),
        };
        result.push(group);
      }
      group.entries.push(entry);
    }
    return result;
  });

  // Rendered once on the server and once in the browser; both agree on hours.
  const now = Date.now();

  function when(startedAt: string): string {
    const minutes = Math.floor((now - Date.parse(startedAt)) / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
    return formatTime(startedAt);
  }

  function placementLabel(placement: number): string {
    return placement === 1 ? 'MVP' : ordinal(placement);
  }

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
    <div class="overview panel">
      <dl class="totals">
        <div>
          <dt>Record</dt>
          <dd>
            <span class="tone-good">{totals.wins}W</span>
            <span class="tone-bad">{totals.losses}L</span>
            {#if totals.draws > 0}<span>{totals.draws}D</span>{/if}
          </dd>
        </div>
        <div>
          <dt>Win %</dt>
          <dd
            class:tone-good={totals.winRate >= 50}
            class:tone-bad={totals.winRate < 50}
          >
            {totals.winRate.toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt>K/D</dt>
          <dd
            class:tone-good={totals.killDeathRatio >= 1}
            class:tone-bad={totals.killDeathRatio < 1}
          >
            {totals.killDeathRatio.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt><abbr title="Average damage per round">ADR</abbr></dt>
          <dd>{totals.averageDamagePerRound}</dd>
        </div>
        <div>
          <dt><abbr title="Average combat score">ACS</abbr></dt>
          <dd>{totals.averageCombatScore}</dd>
        </div>
        <div>
          <dt>HS%</dt>
          <dd>{totals.headshotPercentage.toFixed(1)}%</dd>
        </div>
      </dl>
    </div>

    {#each groups as group (group.key)}
      <section class="day" aria-label={group.label}>
        <header class="day-head">
          <h3>{group.label}</h3>
          <p>
            {group.totals.matches}
            {group.totals.matches === 1 ? 'match' : 'matches'}
            <span aria-hidden="true">·</span>
            <span class="tone-good">{group.totals.wins}W</span>
            <span class="tone-bad">{group.totals.losses}L</span>
            {#if group.totals.draws > 0}{group.totals.draws}D{/if}
            <span aria-hidden="true">·</span>
            K/D {group.totals.killDeathRatio.toFixed(2)}
            <span aria-hidden="true">·</span>
            ACS {group.totals.averageCombatScore}
          </p>
        </header>
        <ol>
          {#each group.entries as entry (entry.id)}
            {@const rankIcon = entry.rank ? rankIconUrl(entry.rank.id) : null}
            <li id="match-{entry.id}">
              <a
                class="match {entry.outcome}"
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
                  />
                  <span class="where">
                    <span class="meta">
                      {when(entry.startedAt)} · {entry.agentName}
                    </span>
                    <strong>{entry.mapName}</strong>
                  </span>
                </span>

                <span class="result">
                  {#if rankIcon && entry.rank}
                    <img
                      class="rank"
                      src={rankIcon}
                      alt={entry.rank.name}
                      title={entry.rank.name}
                      loading="lazy"
                      width="32"
                      height="32"
                    />
                  {/if}
                  <span class="score-block">
                    <span class="score">
                      <span class="ours">{entry.score.won}</span>
                      <span class="sep" aria-hidden="true">:</span>
                      <span class="sr-only">to</span>
                      <span class="theirs">{entry.score.lost}</span>
                    </span>
                    <span class="outcome-line">
                      <span class="outcome">{outcomeLabels[entry.outcome]}</span
                      >
                      {#if entry.placement !== null}
                        <span
                          class="placement"
                          class:mvp={entry.placement === 1}
                          title="{ordinal(entry.placement)} by combat score"
                        >
                          {placementLabel(entry.placement)}
                        </span>
                      {/if}
                    </span>
                  </span>
                </span>

                <span class="stats">
                  <span class="cell key">
                    <span
                      class="value"
                      class:tone-good={entry.killDeathRatio >= 1}
                      class:tone-bad={entry.killDeathRatio < 1}
                    >
                      {entry.killDeathRatio.toFixed(2)}
                    </span>
                    <span class="cell-label">K/D</span>
                  </span>
                  <span class="cell">
                    <span class="value">
                      {entry.kills}<span class="slash">/</span
                      >{entry.deaths}<span class="slash">/</span>{entry.assists}
                    </span>
                    <span class="cell-label">K/D/A</span>
                  </span>
                  <span
                    class="cell wide"
                    class:no-value={entry.damageDeltaPerRound === null}
                  >
                    <span
                      class="value"
                      class:tone-good={(entry.damageDeltaPerRound ?? 0) > 0}
                      class:tone-bad={(entry.damageDeltaPerRound ?? 0) < 0}
                    >
                      {entry.damageDeltaPerRound === null
                        ? '—'
                        : formatSigned(entry.damageDeltaPerRound)}
                    </span>
                    <span class="cell-label"
                      ><abbr title="Damage dealt minus taken, per round"
                        >DDΔ</abbr
                      ></span
                    >
                  </span>
                  <span class="cell wide">
                    <span class="value"
                      >{Math.round(entry.headshotPercentage)}%</span
                    >
                    <span class="cell-label">HS%</span>
                  </span>
                  <span class="cell wide">
                    <span class="value">{entry.averageCombatScore}</span>
                    <span class="cell-label">ACS</span>
                  </span>
                  <span
                    class="cell"
                    class:no-value={entry.ratingChange === null}
                  >
                    {#if entry.ratingChange !== null}
                      <span
                        class="value"
                        class:tone-good={entry.ratingChange > 0}
                        class:tone-bad={entry.ratingChange < 0}
                      >
                        {formatSigned(entry.ratingChange)}
                      </span>
                    {:else}
                      <span class="value no-rr" aria-hidden="true">—</span>
                      <span class="sr-only">No RR change recorded</span>
                    {/if}
                    <span class="cell-label">RR</span>
                  </span>
                </span>

                <span class="sr-only">
                  {formatSeason(entry.seasonShort)}. Open match details.
                </span>
                <svg class="open" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3.5 10.5 8 6 12.5" />
                </svg>
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

  /* Totals for whatever the filters leave. */
  .overview {
    margin-bottom: var(--space-2);
    padding: var(--space-4) var(--space-5);
  }

  .totals {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-6);
    margin: 0;
  }

  .totals dt {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .totals dd {
    display: flex;
    gap: var(--space-2);
    margin: var(--space-1) 0 0;
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .day {
    margin-top: var(--space-5);
  }

  .day-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-1) var(--space-4);
    margin-bottom: var(--space-2);
    padding-inline: var(--space-1);
  }

  h3 {
    margin: 0;
    color: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .day-head p {
    margin: 0;
    color: var(--val-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
  }

  ol {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Each match is a card: the edge and a faint wash say the result first. */
  .match {
    --tone: var(--val-draw);

    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(8.5rem, 1fr) auto auto;
    align-items: center;
    gap: var(--space-4);
    min-height: 4.25rem;
    border-left: 3px solid var(--tone);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-4) var(--space-2) var(--space-3);
    color: var(--val-cream);
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--tone) 14%, transparent),
        transparent 45%
      ),
      var(--val-panel);
    text-decoration: none;
    transition: background-color 150ms ease;
  }

  .match.win {
    --tone: var(--val-win);
  }

  .match.loss {
    --tone: var(--val-red);
  }

  .match:hover {
    background-color: var(--val-panel-raised);
  }

  /* A chevron says the row opens; it nudges forward on hover. */
  .open {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: var(--val-faint);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.75;
    transition:
      stroke 150ms ease,
      transform 150ms ease;
  }

  .match:hover .open,
  .match:focus-visible .open {
    stroke: var(--val-cream);
    transform: translateX(3px);
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
    line-height: 1.25;
  }

  .where strong {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 500;
  }

  .meta {
    overflow: hidden;
    color: var(--val-faint);
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .rank {
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
  }

  .score-block {
    display: grid;
    gap: 2px;
  }

  .score {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .score .ours {
    color: var(--tone);
  }

  .score .sep,
  .score .theirs {
    color: var(--val-muted);
  }

  .outcome-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .outcome {
    color: var(--tone);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .placement {
    border-radius: 3px;
    padding: 0 0.3rem;
    color: var(--val-muted);
    background: var(--val-panel-raised);
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .placement.mvp {
    color: var(--val-bg);
    background: var(--val-gold);
  }

  .stats {
    display: grid;
    grid-template-columns: 3.5rem 6rem 3.5rem 3.5rem 3.5rem 3rem;
    gap: var(--space-4);
  }

  .cell {
    display: grid;
    justify-items: end;
    gap: 2px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .value {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .key .value {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 500;
    line-height: 1.1;
  }

  .slash {
    margin-inline: 0.15em;
    color: var(--val-faint);
    font-weight: 400;
  }

  .cell-label {
    color: var(--val-faint);
    font-size: 0.6875rem;
    font-weight: 500;
  }

  .no-rr {
    color: var(--val-line-strong);
  }

  .cell.no-value .value:not(.no-rr) {
    color: var(--val-line-strong);
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

  @media (max-width: 920px) {
    .stats {
      grid-template-columns: 3.5rem 6rem 3rem;
    }

    .cell.wide {
      display: none;
    }
  }

  @media (max-width: 680px) {
    .match {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity result'
        'stats stats';
      gap: var(--space-2) var(--space-3);
      padding-block: var(--space-3);
    }

    .identity {
      grid-area: identity;
    }

    .open {
      display: none;
    }

    .result {
      grid-area: result;
    }

    .rank {
      display: none;
    }

    .score-block {
      justify-items: end;
    }

    .stats {
      display: flex;
      grid-area: stats;
      gap: var(--space-5);
      padding-left: calc(2.5rem + var(--space-3));
    }

    .cell {
      justify-items: start;
    }

    .cell.no-value {
      display: none;
    }

    .overview {
      padding: var(--space-4);
    }

    .totals {
      gap: var(--space-3) var(--space-4);
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
