<!-- Player identity: card, Riot ID, current rank with RR and peak rank as one quiet line. -->
<script lang="ts">
  import RankBadge from '$lib/components/RankBadge.svelte';
  import type { PlayerRating } from '$lib/dashboard';
  import { formatSeason } from '$lib/format';
  import type { PlayerProfile } from '$lib/player-profile';

  type Props = {
    profile: PlayerProfile;
    rating: PlayerRating | null;
  };

  let { profile, rating }: Props = $props();
</script>

<header id="profile" class="player-header">
  <img class="avatar" src={profile.card.small} alt="" width="64" height="64" />
  <div class="identity">
    <h1>
      {profile.riotId.name}<span class="tag">#{profile.riotId.tag}</span>
    </h1>
    <p class="rank">
      {#if rating?.current}
        <RankBadge rank={rating.current.rank} />
        <span class="rr">{rating.current.rr} RR</span>
      {:else}
        <span class="rr">Unranked</span>
      {/if}
    </p>
    {#if rating?.peak}
      <p class="peak">
        Peak {rating.peak.rank.name}{rating.peak.seasonShort
          ? `, ${formatSeason(rating.peak.seasonShort)}`
          : ''}
      </p>
    {/if}
  </div>
</header>

<style>
  .player-header {
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  .avatar {
    width: 4rem;
    height: 4rem;
    flex-shrink: 0;
    border-radius: var(--radius);
    object-fit: cover;
  }

  .identity {
    display: grid;
    min-width: 0;
    gap: var(--space-1);
  }

  h1 {
    margin: 0;
    color: var(--val-cream);
    font-family: var(--font-display);
    margin-bottom: var(--space-1);
    font-size: var(--text-display-sm);
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1;
    overflow-wrap: anywhere;
  }

  .tag {
    margin-left: 0.1em;
    color: var(--val-faint);
    font-weight: 400;
  }

  .rank {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-3);
    margin: 0;
  }

  .peak {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .rr {
    color: var(--val-muted);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 560px) {
    .player-header {
      gap: var(--space-4);
    }

    .avatar {
      width: 3.25rem;
      height: 3.25rem;
    }
  }
</style>
