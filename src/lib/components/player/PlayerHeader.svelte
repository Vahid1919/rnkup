<!-- Player identity: card and Riot ID, plus rank when the stats overview isn't there to show it. -->
<script lang="ts">
  import RatingSummary from '$lib/components/player/RatingSummary.svelte';
  import type { PlayerRating } from '$lib/dashboard';
  import type { PlayerProfile } from '$lib/player-profile';

  type Props = {
    profile: PlayerProfile;
    rating: PlayerRating | null;
    /** Off when the stats overview already shows the rank. */
    showRank?: boolean;
  };

  let { profile, rating, showRank = true }: Props = $props();
</script>

<header id="profile" class="player-header">
  <div class="identity">
    <img
      class="avatar"
      src={profile.card.small}
      alt=""
      width="64"
      height="64"
    />
    <h1>
      {profile.riotId.name}<span class="tag">#{profile.riotId.tag}</span>
    </h1>
  </div>

  {#if showRank && rating}
    <RatingSummary {rating} />
  {/if}
</header>

<style>
  .player-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-5) var(--space-6);
  }

  .identity {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: var(--space-5);
  }

  .avatar {
    width: 4rem;
    height: 4rem;
    flex-shrink: 0;
    border-radius: var(--radius);
    object-fit: cover;
  }

  h1 {
    margin: 0;
    color: var(--val-cream);
    font-family: var(--font-display);
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

  @media (max-width: 560px) {
    .identity {
      gap: var(--space-4);
    }

    .avatar {
      width: 3.25rem;
      height: 3.25rem;
    }
  }
</style>
