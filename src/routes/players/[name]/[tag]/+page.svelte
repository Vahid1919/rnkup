<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snapshot } from '@sveltejs/kit';
  import {
    defaultHistoryView,
    revealMatchRow,
    type MatchHistoryView,
  } from '$lib/components/MatchHistory.svelte';
  import Nav from '$lib/components/Nav.svelte';
  import BreakdownSection from '$lib/components/player/BreakdownSection.svelte';
  import FocusSection from '$lib/components/player/FocusSection.svelte';
  import FormSection from '$lib/components/player/FormSection.svelte';
  import MatchesSection from '$lib/components/player/MatchesSection.svelte';
  import PlayerHeader from '$lib/components/player/PlayerHeader.svelte';
  import TrendsSection from '$lib/components/player/TrendsSection.svelte';
  import type { PlayerDashboard } from '$lib/dashboard';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const profile = $derived(data.profile);

  let historyView = $state<MatchHistoryView>(defaultHistoryView());

  // Back from a match restores the filters and how many matches were shown.
  export const snapshot: Snapshot<MatchHistoryView> = {
    capture: () => $state.snapshot(historyView),
    restore: (value) => {
      historyView = { ...defaultHistoryView(), ...value };
      // Scroll restoration runs before this, so it can't reach a row beyond
      // the first page; land on the match the player came back from instead.
      if (value.openedMatchId) void revealMatchRow(value.openedMatchId);
    },
  };

  // A different player starts with a clean list.
  let viewedPlayer: string | null = null;
  $effect(() => {
    const puuid = profile.puuid;
    if (viewedPlayer !== null && viewedPlayer !== puuid) {
      historyView = defaultHistoryView();
    }
    viewedPlayer = puuid;
  });
</script>

<svelte:head>
  <title>{profile.riotId.name}#{profile.riotId.tag} | RNKUP</title>
  <meta
    name="description"
    content="Ranked Valorant stats, trends and coaching for {profile.riotId
      .name}."
  />
</svelte:head>

{#snippet stats(dashboard: PlayerDashboard)}
  {@const summary = dashboard.summary}
  {@const hasDetailedMatches = summary.matchCount > 0}
  <PlayerHeader
    {profile}
    rating={dashboard.rating}
    showRank={!hasDetailedMatches}
  />

  {#if dashboard.matchLog.length === 0}
    <section class="notice panel page-section" aria-labelledby="empty-title">
      <h2 id="empty-title" class="section-title">No competitive matches yet</h2>
      <p>
        HenrikDev returned no competitive matches for this player. Try another
        Riot ID or come back later.
      </p>
    </section>
  {:else}
    {#if hasDetailedMatches}
      <section id="stats" class="stats" aria-labelledby="stats-title">
        <h2 id="stats-title" class="sr-only">Stats</h2>
        <FormSection
          {summary}
          benchmarks={dashboard.benchmarks}
          rating={dashboard.rating}
          level={profile.accountLevel}
          storedCount={dashboard.matchLog.length}
        />
        <TrendsSection ratingHistory={dashboard.ratingHistory} />
      </section>

      <FocusSection {summary} insights={dashboard.insights} />
      <BreakdownSection {dashboard} />
    {/if}

    <MatchesSection
      entries={dashboard.matchLog}
      name={profile.riotId.name}
      tag={profile.riotId.tag}
      bind:view={historyView}
    />
  {/if}
{/snippet}

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <!-- Cached dashboards arrive ready; new lookups stream in after the profile. -->
  {#await data.dashboard}
    <PlayerHeader {profile} rating={null} />
    <section
      class="loading page-section"
      role="status"
      aria-labelledby="loading-title"
    >
      <div class="section-heading loading-heading">
        <span class="spinner" aria-hidden="true"></span>
        <h2 id="loading-title" class="section-title">
          Loading match history<span class="dots" aria-hidden="true"></span>
        </h2>
        <p class="section-meta">
          Analysing up to 100 recent competitive matches.
        </p>
      </div>
      <!-- Placeholder shaped like the stats overview that replaces it. -->
      <div class="skeleton panel" aria-hidden="true">
        <div class="skeleton-grid">
          {#each [0, 1, 2, 3] as tile (tile)}
            <div>
              <span class="bone bone-label"></span>
              <span class="bone bone-value"></span>
            </div>
          {/each}
        </div>
        <span class="bone bone-chart"></span>
      </div>
    </section>
  {:then result}
    {#if result.ok}
      {@render stats(result.dashboard)}
    {:else}
      <PlayerHeader {profile} rating={null} />
      <section
        class="notice panel page-section"
        role="alert"
        aria-labelledby="failed-title"
      >
        <h2 id="failed-title" class="section-title">
          Match history unavailable
        </h2>
        <p>{result.message}</p>
        <p>
          <!-- A full reload, since client navigation to the same URL skips the load. -->
          <a
            href={resolve('/players/[name]/[tag]', {
              name: profile.riotId.name,
              tag: profile.riotId.tag,
            })}
            data-sveltekit-reload>Try again</a
          >
        </p>
      </section>
    {/if}
  {/await}
</main>

<style>
  .stats {
    margin-top: var(--space-7);
  }

  .notice {
    padding: var(--space-6);
  }

  .notice p {
    max-width: 36rem;
    margin: var(--space-2) 0 0;
    color: var(--val-muted);
  }

  .loading-heading {
    align-items: center;
  }

  .spinner {
    width: 1.375rem;
    height: 1.375rem;
    flex-shrink: 0;
    border: 2px solid var(--val-line-strong);
    border-top-color: var(--val-red);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }

  .dots::after {
    content: '';
    animation: dots 1.4s steps(1) infinite;
  }

  .skeleton {
    padding: var(--space-5);
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-5);
  }

  /* A grey block with a band of light sweeping across it. */
  .bone {
    position: relative;
    display: block;
    overflow: hidden;
    border-radius: var(--radius-sm);
    background: var(--val-panel-raised);
  }

  .bone::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgb(236 232 225 / 10%),
      transparent
    );
    content: '';
    transform: translateX(-100%);
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .bone-label {
    width: 55%;
    height: 0.625rem;
  }

  .bone-value {
    width: 80%;
    height: 2rem;
    margin-top: var(--space-3);
  }

  .bone-chart {
    height: 9rem;
    margin-top: var(--space-5);
  }

  /* Each column starts a beat later, so the light reads as one sweep. */
  .skeleton-grid > :nth-child(2) .bone::after {
    animation-delay: 120ms;
  }

  .skeleton-grid > :nth-child(3) .bone::after {
    animation-delay: 240ms;
  }

  .skeleton-grid > :nth-child(4) .bone::after {
    animation-delay: 360ms;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes shimmer {
    to {
      transform: translateX(100%);
    }
  }

  @keyframes dots {
    0% {
      content: '';
    }

    25% {
      content: '.';
    }

    50% {
      content: '..';
    }

    75% {
      content: '...';
    }
  }

  @media (max-width: 560px) {
    .skeleton-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
