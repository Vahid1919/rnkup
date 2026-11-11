<!-- Current and peak rank as two matching blocks: label, icon, rank name, one detail line. -->
<script lang="ts">
  import type { PlayerRating } from '$lib/dashboard';
  import { formatSeason } from '$lib/format';
  import { rankIconUrl } from '$lib/ranks';

  type Props = {
    rating: PlayerRating;
  };

  let { rating }: Props = $props();
</script>

{#snippet rankIcon(tierId: number)}
  {@const url = rankIconUrl(tierId, 'large')}
  {#if url}
    <img class="rank-icon" src={url} alt="" width="64" height="64" />
  {/if}
{/snippet}

<dl class="rating">
  <div class="rating-block">
    <dt>Current</dt>
    <dd>
      {#if rating.current}
        {@render rankIcon(rating.current.rank.id)}
        <span class="rating-text">
          <span class="rating-name">{rating.current.rank.name}</span>
          <span class="rating-detail">{rating.current.rr} RR</span>
        </span>
      {:else}
        <span class="rating-name">Unranked</span>
      {/if}
    </dd>
  </div>
  {#if rating.peak}
    <div class="rating-block">
      <dt>Peak</dt>
      <dd>
        {@render rankIcon(rating.peak.rank.id)}
        <span class="rating-text">
          <span class="rating-name">{rating.peak.rank.name}</span>
          {#if rating.peak.seasonShort}
            <span class="rating-detail">
              {formatSeason(rating.peak.seasonShort)}
            </span>
          {/if}
        </span>
      </dd>
    </div>
  {/if}
</dl>

<style>
  /* Current and peak rank: two identical blocks */
  .rating {
    display: flex;
    margin: 0;
  }

  .rating-block {
    display: grid;
    gap: var(--space-2);
  }

  .rating-block + .rating-block {
    margin-left: var(--space-5);
    border-left: 1px solid var(--val-line);
    padding-left: var(--space-5);
  }

  dt {
    color: var(--val-muted);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: 0;
  }

  .rank-icon {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    object-fit: contain;
  }

  .rating-text {
    display: grid;
  }

  .rating-name {
    color: var(--val-cream);
    font-size: var(--text-lg);
    font-weight: 600;
    white-space: nowrap;
  }

  .rating-detail {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 560px) {
    .rating {
      flex-direction: column;
      gap: var(--space-4);
    }

    .rating-block + .rating-block {
      margin-left: 0;
      border-top: 1px solid var(--val-line);
      border-left: 0;
      padding-top: var(--space-4);
      padding-left: 0;
    }
  }
</style>
