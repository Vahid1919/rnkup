<script lang="ts">
  import { STAT_DEFINITIONS, type Insight } from '$lib/dashboard';
  import { statForInsight } from './player/insight-stats';

  type Props = {
    insight: Insight;
    /** Position in the focus list; strengths are not numbered. */
    index?: number | null;
  };

  let { insight, index = null }: Props = $props();
  const headingId = $derived(`insight-${insight.id}`);
  const isFocus = $derived(insight.tone === 'focus');
  const hint = $derived(
    statForInsight(insight.id) === 'kast'
      ? STAT_DEFINITIONS.kast.description
      : null,
  );
</script>

<!-- One coaching note: the claim, then the numbers it is based on, then the tip. -->
<article class="insight" aria-labelledby={headingId}>
  {#if index !== null}
    <span class="number" aria-hidden="true">{index + 1}</span>
  {/if}

  <div class="body">
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

    {#if insight.actions.length > 0}
      <p class="action">
        <span class="action-label">{isFocus ? 'Next game' : 'Keep doing'}</span>
        {insight.actions[0]}
      </p>
    {/if}
  </div>
</article>

<style>
  .insight {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--space-3);
  }

  .insight:not(:has(.number)) {
    grid-template-columns: minmax(0, 1fr);
  }

  .body {
    display: grid;
    gap: var(--space-2);
  }

  .number {
    display: inline-grid;
    width: 1.5rem;
    height: 1.5rem;
    place-items: center;
    border-radius: 50%;
    color: var(--val-cream);
    background: var(--val-line-strong);
    font-family: var(--font-display);
    font-size: var(--text-xs);
    font-weight: 500;
    line-height: 1;
  }

  h3 {
    margin: 0;
    color: var(--val-cream);
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1.4;
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
