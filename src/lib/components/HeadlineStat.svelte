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
  };

  let { stat, value, lobbyValue = null, note = null }: Props = $props();

  const definition = $derived(STAT_DEFINITIONS[stat]);
  const isAbbreviation = $derived(
    definition.label === definition.label.toUpperCase(),
  );
  const gap = $derived(
    value !== null && lobbyValue !== null
      ? lobbyGap(value, lobbyValue, definition)
      : null,
  );
</script>

<div class="headline">
  <dt class="stat-label">
    {#if isAbbreviation}
      <abbr title={definition.description}>{definition.label}</abbr>
    {:else}
      {definition.label}
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
  /* A raised tile, so the four headline stats read as one row of cards. */
  .headline {
    display: grid;
    align-content: start;
    gap: var(--space-2);
    border-radius: var(--radius);
    padding: var(--space-4);
    background: var(--val-panel-raised);
  }

  dt,
  dd {
    margin: 0;
  }

  dd {
    display: grid;
    gap: var(--space-2);
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
