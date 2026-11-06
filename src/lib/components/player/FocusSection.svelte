<!-- Coaching: up to three notes with the numbers behind them, then strengths behind a disclosure. -->
<script lang="ts">
  import InsightCard from '$lib/components/InsightCard.svelte';
  import type { CompetitiveSummary, InsightReport } from '$lib/dashboard';

  type Props = {
    summary: CompetitiveSummary;
    insights: InsightReport;
  };

  let { summary, insights }: Props = $props();
</script>

<section id="focus" class="page-section" aria-labelledby="focus-title">
  <div class="section-heading">
    <h2 id="focus-title" class="section-title">What to work on</h2>
    <p class="section-intro">
      Worked out from the same {summary.matchCount} matches as the stats above. Each
      note shows the number it is based on, and they are ordered by how much that
      number separates your wins from your losses.
    </p>
  </div>

  {#if insights.sampleNote}
    <p class="notice panel">{insights.sampleNote}</p>
  {:else if insights.focus.length === 0}
    <p class="notice panel">
      Nothing here is losing you games. You are level with or ahead of your
      lobbies across the board, so keep queueing.
    </p>
  {:else}
    <ol class="insight-list">
      {#each insights.focus as insight, index (insight.id)}
        <li><InsightCard {insight} {index} /></li>
      {/each}
    </ol>
  {/if}

  {#if insights.strengths.length > 0}
    <details class="more strengths">
      <summary>
        What you already do well <small>{insights.strengths.length}</small>
      </summary>
      <ul class="insight-list more-body">
        {#each insights.strengths as insight (insight.id)}
          <li><InsightCard {insight} /></li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<style>
  /* The explanation sits under the title, not beside it. */
  .section-heading {
    display: grid;
  }

  .notice {
    margin: 0;
    padding: var(--space-5);
    color: var(--val-muted);
  }

  .insight-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-6);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .strengths {
    margin-top: var(--space-4);
  }

  @media (max-width: 900px) {
    .insight-list {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
    }

    .insight-list > li {
      padding-block: var(--space-4);
    }

    .insight-list > li + li {
      border-top: 1px solid var(--val-line);
    }
  }
</style>
