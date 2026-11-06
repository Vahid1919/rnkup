<!-- Agents and maps: matches, win rate and K/D for each, top five first. -->
<script lang="ts">
  import AgentIcon from '$lib/components/AgentIcon.svelte';
  import {
    RELIABLE_SAMPLE_MATCHES as SMALL_SAMPLE,
    type BreakdownRow,
    type PlayerDashboard,
  } from '$lib/dashboard';

  type Props = {
    dashboard: PlayerDashboard;
  };

  let { dashboard }: Props = $props();

  const TOP_ROWS = 5;
  // Win rates from fewer matches than this are faded; coaching ignores them.
  const hasSmallSample = $derived(
    [...dashboard.breakdowns.agents, ...dashboard.breakdowns.maps].some(
      (row) => row.matches < SMALL_SAMPLE,
    ),
  );
  let showAllAgents = $state(false);
  let showAllMaps = $state(false);
</script>

{#snippet breakdownTable(
  id: string,
  caption: string,
  firstColumn: string,
  plural: string,
  allRows: BreakdownRow[],
  withAgent: boolean,
  expanded: boolean,
  toggle: () => void,
)}
  {@const rows = expanded ? allRows : allRows.slice(0, TOP_ROWS)}
  <div class="breakdown-block panel">
    <h3 {id} class="table-title">{caption}</h3>
    <!-- The scroll container is focusable so keyboard users can pan the table. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-scroll" role="region" aria-labelledby={id} tabindex="0">
      <table class="data-table" aria-labelledby={id}>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col" class="numeric">Matches</th>
            <th scope="col" class="numeric">Win rate</th>
            <th scope="col" class="numeric">K/D</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.name)}
            <tr>
              <th scope="row">
                <span class="row-name">
                  {#if withAgent}
                    <AgentIcon
                      agentId={row.agentId}
                      agentName={row.name}
                      size="sm"
                    />
                  {/if}
                  {row.name}
                </span>
              </th>
              <td class="numeric">{row.matches}</td>
              <td
                class="numeric"
                class:small-sample={row.matches < SMALL_SAMPLE}
              >
                {Math.round(row.winRate)}%
                {#if row.matches < SMALL_SAMPLE}
                  <span class="sr-only">(few matches)</span>
                {/if}
              </td>
              <td class="numeric">{row.killDeathRatio.toFixed(2)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if allRows.length > TOP_ROWS}
      <button
        type="button"
        class="text-button"
        aria-expanded={expanded}
        onclick={toggle}
      >
        {expanded
          ? `Show top ${TOP_ROWS}`
          : `Show all ${allRows.length} ${plural}`}
      </button>
    {/if}
  </div>
{/snippet}

<div class="breakdown-grid">
  {@render breakdownTable(
    'agents-title',
    'Agents',
    'Agent',
    'agents',
    dashboard.breakdowns.agents,
    true,
    showAllAgents,
    () => (showAllAgents = !showAllAgents),
  )}
  {@render breakdownTable(
    'maps-title',
    'Maps',
    'Map',
    'maps',
    dashboard.breakdowns.maps,
    false,
    showAllMaps,
    () => (showAllMaps = !showAllMaps),
  )}
</div>
{#if hasSmallSample}
  <p class="sample-note">
    Faded win rates come from fewer than {SMALL_SAMPLE} matches, so do not read much
    into them.
  </p>
{/if}

<style>
  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: var(--space-5);
    margin-top: var(--space-5);
  }

  .breakdown-block {
    min-width: 0;
    padding: var(--space-5) var(--space-5) var(--space-3);
  }

  /* Agent and map rows share one height, icon or not. */
  .row-name {
    display: flex;
    min-height: 2rem;
    align-items: center;
    gap: var(--space-3);
    font-weight: 500;
  }

  .data-table tbody th,
  .data-table td {
    padding-block: var(--space-2);
  }

  .small-sample {
    color: var(--val-faint);
  }

  .sample-note {
    margin: var(--space-4) 0 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .table-title {
    margin: 0 0 var(--space-2);
    color: var(--val-cream);
    font-size: var(--text-md);
    font-weight: 600;
  }

  @media (max-width: 860px) {
    .breakdown-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
