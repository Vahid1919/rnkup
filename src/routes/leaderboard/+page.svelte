<script lang="ts">
  import { resolve } from '$app/paths';
  import Nav from '$lib/components/Nav.svelte';
  import RankBadge from '$lib/components/RankBadge.svelte';
  import { formatDateTime } from '$lib/format';
  import {
    LEADERBOARD_REGIONS,
    type LeaderboardQuery,
    type LeaderboardTierFilter,
  } from '$lib/leaderboard';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const board = $derived(data.leaderboard);
  const regionLabel = $derived(
    LEADERBOARD_REGIONS.find((region) => region.id === board.region)?.label ??
      board.region,
  );

  const tierFilters: { id: LeaderboardTierFilter; label: string }[] = [
    { id: 'radiant', label: 'Radiant' },
    { id: 'immortal', label: 'Immortal+' },
  ];

  const numberFormat = new Intl.NumberFormat('en-US');

  /** The query string for this board with some filters changed. */
  function boardQuery(changes: Partial<LeaderboardQuery>): string {
    const next = { ...board, page: 1, ...changes };
    return new URLSearchParams({
      region: next.region,
      tier: next.tier,
      page: String(next.page),
    }).toString();
  }
</script>

<svelte:head>
  <title>{regionLabel} leaderboard | RNKUP</title>
  <meta
    name="description"
    content="The Radiant and Immortal competitive leaderboard for {regionLabel}."
  />
</svelte:head>

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <header class="board-header">
    <p class="eyebrow">Leaderboard · PC</p>
    <h1 class="section-title">{regionLabel}</h1>
    <p class="section-meta">
      Updated {formatDateTime(board.updatedAt)}. Only Immortal and Radiant
      players appear on the leaderboard.
    </p>
  </header>

  <!-- These links keep the resolved path and only change the query string,
       which the lint rule cannot follow. -->
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <div class="filters">
    <nav aria-label="Region">
      <ul>
        {#each LEADERBOARD_REGIONS as region (region.id)}
          <li>
            <a
              href={`${resolve('/leaderboard')}?${boardQuery({ region: region.id })}`}
              aria-current={region.id === board.region ? 'page' : undefined}
            >
              {region.id.toUpperCase()}
              <span class="sr-only">({region.label})</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
    <nav aria-label="Ranks shown">
      <ul>
        {#each tierFilters as filter (filter.id)}
          <li>
            <a
              href={`${resolve('/leaderboard')}?${boardQuery({ tier: filter.id })}`}
              aria-current={filter.id === board.tier ? 'page' : undefined}
            >
              {filter.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>

  <!-- eslint-enable svelte/no-navigation-without-resolve -->

  {#if board.thresholds.length > 0}
    <ul class="thresholds" aria-label="Rank thresholds">
      {#each [...board.thresholds].reverse() as threshold (threshold.rank.id)}
        <li>
          <RankBadge rank={threshold.rank} size="sm" />
          <span>
            from {threshold.minRankRating} RR · #{numberFormat.format(
              threshold.startPosition,
            )}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if board.players.length === 0}
    <p class="empty panel">No players are on the leaderboard yet.</p>
  {:else}
    <!-- The scroll container is focusable so keyboard users can pan the table. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="table-scroll"
      role="region"
      aria-label="Leaderboard"
      tabindex="0"
    >
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col" class="numeric">#</th>
            <th scope="col">Player</th>
            <th scope="col">Rank</th>
            <th scope="col" class="numeric">
              <abbr title="Rank Rating">RR</abbr>
            </th>
            <th scope="col" class="numeric">Wins</th>
          </tr>
        </thead>
        <tbody>
          {#each board.players as player (player.position)}
            <tr>
              <td class="numeric position">{player.position}</td>
              <th scope="row">
                {#if player.riotId}
                  <a
                    class="player-link"
                    href={resolve('/players/[name]/[tag]', {
                      name: player.riotId.name,
                      tag: player.riotId.tag,
                    })}
                  >
                    {player.riotId.name}<span class="tag"
                      >#{player.riotId.tag}</span
                    >
                  </a>
                {:else}
                  <span class="hidden-player">Hidden player</span>
                {/if}
              </th>
              <td><RankBadge rank={player.rank} size="sm" /></td>
              <td class="numeric">{player.rankRating}</td>
              <td class="numeric">{player.wins}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <nav class="pager" aria-label="Leaderboard pages">
    {#if board.page > 1}
      <a
        href={`${resolve('/leaderboard')}?${boardQuery({ page: board.page - 1 })}`}
      >
        ← Previous
      </a>
    {:else}
      <span aria-hidden="true"></span>
    {/if}
    <span class="page-count">
      Page {board.page} of {numberFormat.format(board.pageCount)}
    </span>
    {#if board.page < board.pageCount}
      <a
        href={`${resolve('/leaderboard')}?${boardQuery({ page: board.page + 1 })}`}
      >
        Next →
      </a>
    {:else}
      <span aria-hidden="true"></span>
    {/if}
  </nav>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
</main>

<style>
  .board-header {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
  }

  h1.section-title {
    font-size: var(--text-display-sm);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-5);
    margin-bottom: var(--space-4);
  }

  .filters ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .filters a {
    display: block;
    border: 1px solid var(--val-line);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1;
    text-decoration: none;
  }

  .filters a:hover {
    border-color: var(--val-line-strong);
    color: var(--val-cream);
  }

  .filters a[aria-current] {
    border-color: var(--val-red);
    color: var(--val-cream);
  }

  .thresholds {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    margin: 0 0 var(--space-5);
    padding: 0;
    color: var(--val-faint);
    font-size: var(--text-xs);
    list-style: none;
  }

  .thresholds li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--val-cream);
  }

  .thresholds li > span:last-child {
    color: var(--val-faint);
  }

  .position {
    width: 4rem;
    color: var(--val-faint);
  }

  .data-table th.numeric:first-child,
  .data-table td.numeric:first-child {
    padding-right: var(--space-4);
  }

  .player-link {
    color: var(--val-cream);
    font-weight: 500;
    text-decoration: none;
  }

  .player-link:hover,
  .player-link:focus-visible {
    text-decoration: underline;
  }

  .tag,
  .hidden-player {
    color: var(--val-faint);
  }

  .hidden-player {
    font-style: italic;
  }

  .empty {
    padding: var(--space-5);
    color: var(--val-muted);
  }

  .pager {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-5);
    font-size: var(--text-sm);
  }

  .pager a {
    color: var(--val-cream);
    font-weight: 500;
    text-decoration: none;
  }

  .pager a:last-child {
    justify-self: end;
  }

  .pager a:hover {
    color: var(--val-red);
  }

  .page-count {
    color: var(--val-faint);
  }
</style>
