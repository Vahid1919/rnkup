<!-- Match history: stored competitive matches, opening into the match page. Filters stay folded away until asked for. -->
<script lang="ts">
  import MatchHistory, {
    activeFilterCount,
    type MatchHistoryView,
  } from '$lib/components/MatchHistory.svelte';
  import type { MatchLogEntry } from '$lib/dashboard';

  type Props = {
    entries: MatchLogEntry[];
    name: string;
    tag: string;
    view: MatchHistoryView;
  };

  let { entries, name, tag, view = $bindable() }: Props = $props();

  const activeFilters = $derived(activeFilterCount(view));
</script>

<section id="matches" class="page-section" aria-labelledby="matches-title">
  <div class="section-heading">
    <h2 id="matches-title" class="section-title">Matches</h2>
    <button
      type="button"
      class="filter-toggle"
      aria-expanded={view.filtersOpen}
      aria-controls="match-filters"
      onclick={() => (view.filtersOpen = !view.filtersOpen)}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 4h12M4.5 8h7M7 12h2" />
      </svg>
      Filter
      {#if activeFilters > 0}
        <span class="badge">
          {activeFilters}<span class="sr-only">
            active {activeFilters === 1 ? 'filter' : 'filters'}</span
          >
        </span>
      {/if}
    </button>
  </div>
  <MatchHistory {entries} {name} {tag} bind:view />
</section>

<style>
  .section-heading {
    align-items: center;
  }

  .filter-toggle {
    display: inline-flex;
    min-height: 2.5rem;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: 0 var(--space-3);
    color: var(--val-muted);
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
    transition:
      color 150ms ease,
      border-color 150ms ease;
  }

  .filter-toggle:hover,
  .filter-toggle[aria-expanded='true'] {
    border-color: var(--val-line-strong);
    color: var(--val-cream);
  }

  svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-width: 1.5;
  }

  .badge {
    display: inline-grid;
    min-width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    border-radius: var(--radius-sm);
    padding: 0 var(--space-1);
    color: var(--val-bg);
    background: var(--val-cream);
    font-size: var(--text-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
