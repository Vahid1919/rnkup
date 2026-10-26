<script lang="ts">
  import { rankIconUrl, type Rank } from '$lib/ranks';

  type Props = {
    rank: Rank | null;
    size?: 'sm' | 'md';
    /** Hide the rank name visually; it stays available to screen readers. */
    iconOnly?: boolean;
  };

  let { rank, size = 'md', iconOnly = false }: Props = $props();
  const iconUrl = $derived(rank ? rankIconUrl(rank.id) : null);
</script>

<span class="rank-badge {size}">
  {#if rank && iconUrl}
    <img src={iconUrl} alt="" loading="lazy" />
  {/if}
  <span class:sr-only={iconOnly && iconUrl !== null}>
    {rank?.name ?? 'Unranked'}
  </span>
</span>

<style>
  .rank-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 500;
    white-space: nowrap;
  }

  img {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    object-fit: contain;
  }

  .sm img {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
