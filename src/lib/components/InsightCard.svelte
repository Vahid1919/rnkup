<script lang="ts">
  import { STAT_DEFINITIONS, type Insight } from '$lib/dashboard';
  import { statForInsight } from './player/insight-stats';

  type Props = {
    insight: Insight;
  };

  let { insight }: Props = $props();
  const headingId = $derived(`insight-${insight.id}`);
  const hint = $derived(
    statForInsight(insight.id) === 'kast'
      ? STAT_DEFINITIONS.kast.description
      : null,
  );
</script>

<!-- One coaching note: the claim, then the numbers it is based on. -->
<article class="insight {insight.tone}" aria-labelledby={headingId}>
  <p class="tone">{insight.tone === 'focus' ? 'Work on' : 'Strength'}</p>
  <h3 id={headingId}>{insight.title}</h3>

  <p class="metric">
    <span class="stat-label">{insight.metricLabel}</span>
    <strong class="value">{insight.metricValue}</strong>
  </p>
  {#if insight.comparison}
    <p class="comparison">{insight.comparison}</p>
  {/if}

  {#if insight.evidence}
    <p class="evidence">{insight.evidence}</p>
  {/if}
  {#if hint}
    <p class="hint">{hint}</p>
  {/if}

  {#if insight.keep}
    <p class="action">
      <span class="action-label">Keep doing</span>
      {insight.keep}
    </p>
  {/if}
</article>

<style>
  .insight {
    display: grid;
    align-content: start;
    gap: var(--space-2);
  }

  .tone {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0;
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1.4;
  }

  .focus h3 {
    color: var(--val-loss);
  }

  .strength h3 {
    color: var(--val-win);
  }

  .metric {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--space-2);
    margin: 0;
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .value {
    color: var(--val-cream);
    font-weight: 600;
  }

  .comparison {
    margin: calc(-1 * var(--space-1)) 0 0;
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .evidence,
  .hint {
    margin: 0;
    color: var(--val-muted);
    font-size: var(--text-sm);
  }

  .hint {
    color: var(--val-faint);
  }

  .action {
    margin: var(--space-1) 0 0;
    color: var(--val-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .action-label {
    margin-right: var(--space-1);
    color: var(--val-cream);
    font-weight: 600;
  }
</style>
