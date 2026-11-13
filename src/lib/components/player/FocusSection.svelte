<!-- Coaching: the one thing to fix first, then the rest to work on beside what to keep doing. -->
<script lang="ts">
  import InsightCard from '$lib/components/InsightCard.svelte';
  import type { InsightReport } from '$lib/dashboard';

  type Props = {
    insights: InsightReport;
  };

  let { insights }: Props = $props();
  const lead = $derived(insights.focus.at(0) ?? null);
  const moreFocus = $derived(insights.focus.slice(1));
  const hasColumns = $derived(
    moreFocus.length > 0 || insights.strengths.length > 0,
  );
</script>

<section id="focus" class="page-section" aria-labelledby="focus-title">
  <div class="section-heading">
    <h2 id="focus-title" class="section-title">Coaching</h2>
  </div>

  <div class="coaching panel">
    {#if insights.sampleNote}
      <p class="notice">{insights.sampleNote}</p>
    {:else if lead}
      <div class="lead">
        <InsightCard insight={lead} featured />
      </div>
    {:else}
      <p class="notice">
        Nothing here is losing you games. You are level with or ahead of your
        lobbies across the board, so keep queueing.
      </p>
    {/if}

    {#if hasColumns}
      <div class="columns">
        {#if moreFocus.length > 0}
          <div class="column">
            <h3 class="column-title focus">Also work on</h3>
            <ul class="focus-list">
              {#each moreFocus as insight (insight.id)}
                <li><InsightCard {insight} /></li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if insights.strengths.length > 0}
          <div class="column">
            <h3 class="column-title strength">Keep doing</h3>
            <ul class="strength-list">
              {#each insights.strengths as strength (strength.id)}
                <li>
                  <p class="strength-row">
                    <span class="strength-title">{strength.title}</span>
                    <span class="strength-metric">
                      {strength.metricLabel}
                      <strong>{strength.metricValue}</strong>
                    </span>
                  </p>
                  {#if strength.keep}
                    <p class="strength-keep">{strength.keep}</p>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  p,
  ul {
    margin: 0;
  }

  ul {
    padding: 0;
    list-style: none;
  }

  /* A red edge and wash so coaching reads as the page's call to action. */
  .coaching {
    display: grid;
    gap: var(--space-6);
    border-top: 2px solid var(--val-loss);
    padding: var(--space-6);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--val-loss) 9%, var(--val-panel)),
      var(--val-panel) 14rem
    );
  }

  .notice {
    color: var(--val-muted);
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: var(--space-6);
    border-top: 1px solid var(--val-line);
    padding-top: var(--space-6);
  }

  .column {
    display: grid;
    align-content: start;
    gap: var(--space-4);
  }

  .column-title {
    margin: 0;
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .column-title.focus {
    color: var(--val-loss);
  }

  .column-title.strength {
    color: var(--val-win);
  }

  .focus-list,
  .strength-list {
    display: grid;
  }

  .focus-list > li + li,
  .strength-list > li + li {
    margin-top: var(--space-3);
    border-top: 1px solid var(--val-line);
    padding-top: var(--space-3);
  }

  .strength-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .strength-title {
    color: var(--val-cream);
    font-weight: 600;
  }

  .strength-metric {
    flex-shrink: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .strength-metric strong {
    margin-left: var(--space-1);
    color: var(--val-win);
    font-size: var(--text-md);
    font-weight: 600;
  }

  .strength-keep {
    margin-top: var(--space-1);
    color: var(--val-muted);
    font-size: var(--text-sm);
  }

  @media (max-width: 560px) {
    .coaching {
      padding: var(--space-4);
    }

    .columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
