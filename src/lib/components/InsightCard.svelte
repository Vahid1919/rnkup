<script lang="ts">
  import { STAT_DEFINITIONS, type Insight } from '$lib/dashboard';
  import { statForInsight } from './player/insight-stats';

  type Props = {
    insight: Insight;
    /** The lead note: larger, with the reasoning behind it. */
    featured?: boolean;
  };

  let { insight, featured = false }: Props = $props();
  const headingId = $derived(`insight-${insight.id}`);
  const hint = $derived(
    statForInsight(insight.id) === 'kast'
      ? STAT_DEFINITIONS.kast.description
      : null,
  );
</script>

<!-- One thing to work on: the claim, then the numbers it is based on. -->
<article class="insight" class:featured aria-labelledby={headingId}>
  <div class="claim">
    {#if featured}
      <p class="label">Top focus</p>
    {/if}
    <h3 id={headingId}>{insight.title}</h3>
    {#if featured}
      <p class="why">{insight.why}</p>
    {/if}
  </div>

  <div class="numbers">
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
  </div>
</article>

<style>
  p {
    margin: 0;
  }

  .insight,
  .claim,
  .numbers {
    display: grid;
    align-content: start;
    gap: var(--space-2);
  }

  h3 {
    margin: 0;
    color: var(--val-loss);
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1.4;
  }

  .metric {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--space-2);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .value {
    color: var(--val-cream);
    font-weight: 600;
  }

  .comparison,
  .evidence {
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .hint {
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  /* The lead note: claim and reasoning on the left, numbers on the right. */
  .featured {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: var(--space-6);
  }

  .label {
    color: var(--val-loss);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .featured h3 {
    color: var(--val-cream);
    font-size: var(--text-xl);
    line-height: 1.25;
  }

  .why {
    max-width: 40rem;
    color: var(--val-muted);
    line-height: 1.55;
  }

  .featured .numbers {
    border-left: 1px solid var(--val-line);
    padding-left: var(--space-6);
  }

  .featured .metric {
    display: grid;
    gap: var(--space-1);
  }

  .featured .value {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 500;
    line-height: 1;
  }

  @media (max-width: 760px) {
    .featured {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
    }

    .featured .numbers {
      border-top: 1px solid var(--val-line);
      border-left: 0;
      padding-top: var(--space-4);
      padding-left: 0;
    }
  }
</style>
