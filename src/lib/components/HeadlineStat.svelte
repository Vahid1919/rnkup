<script lang="ts">
  import { formatStat, lobbyGap } from '$lib/format';
  import { STAT_DEFINITIONS, type StatKey } from '$lib/dashboard';

  type Props = {
    stat: StatKey;
    value: number | null;
    /** Average of the other players in the same matches. */
    lobbyValue?: number | null;
    /** Shown instead of the lobby gap when there is no lobby average. */
    note?: string | null;
    /** Replaces the definition's short label. */
    label?: string | null;
  };

  let {
    stat,
    value,
    lobbyValue = null,
    note = null,
    label = null,
  }: Props = $props();

  const definition = $derived(STAT_DEFINITIONS[stat]);
  const isAbbreviation = $derived(
    label === null && definition.label === definition.label.toUpperCase(),
  );
  const gap = $derived(
    value !== null && lobbyValue !== null
      ? lobbyGap(value, lobbyValue, definition)
      : null,
  );
</script>

<div
  class="headline"
  class:tone-good={gap?.tone === 'good'}
  class:tone-bad={gap?.tone === 'bad'}
>
  <dt>
    {#if isAbbreviation}
      <abbr title={definition.description}>{definition.label}</abbr>
    {:else}
      {label ?? definition.label}
    {/if}
  </dt>
  <dd>
    <strong class="display-number">
      {value === null ? '—' : formatStat(value, definition)}
    </strong>
    {#if gap && lobbyValue !== null}
      <span
        class="sub"
        class:tone-good={gap.tone === 'good'}
        class:tone-bad={gap.tone === 'bad'}
      >
        {gap.text}
        <span class="sr-only">
          (lobby {formatStat(lobbyValue, definition)})
        </span>
      </span>
    {:else if note}
      <span class="sub">{note}</span>
    {/if}
  </dd>
</div>

<style>
  /* A raised card with a bar on the left that takes the lobby comparison's colour. */
  .headline {
    --bar: var(--val-line-strong);
    position: relative;
    display: grid;
    align-content: start;
    gap: var(--space-1);
    border-radius: var(--radius);
    padding: var(--space-4) var(--space-3) var(--space-4) var(--space-5);
    background: var(--val-panel-raised);
  }

  .headline::before {
    position: absolute;
    top: var(--space-4);
    bottom: var(--space-4);
    left: var(--space-3);
    width: 3px;
    border-radius: 2px;
    background: var(--bar);
    content: '';
  }

  .headline.tone-good {
    --bar: var(--val-win);
  }

  .headline.tone-bad {
    --bar: var(--val-loss);
  }

  dt,
  dd {
    margin: 0;
  }

  dt {
    color: var(--val-muted);
    font-size: var(--text-md);
    font-weight: 500;
  }

  dd {
    display: grid;
    gap: var(--space-1);
  }

  strong {
    font-size: var(--text-2xl);
  }

  .sub {
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .sub.tone-good {
    color: var(--val-win);
  }

  .sub.tone-bad {
    color: var(--val-loss);
  }
</style>
