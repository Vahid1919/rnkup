<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snapshot } from '@sveltejs/kit';
  import { fade } from 'svelte/transition';
  import {
    defaultHistoryView,
    revealMatchRow,
    type MatchHistoryView,
  } from '$lib/components/MatchHistory.svelte';
  import Nav from '$lib/components/Nav.svelte';
  import BreakdownSection from '$lib/components/player/BreakdownSection.svelte';
  import DashboardSkeleton from '$lib/components/player/DashboardSkeleton.svelte';
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
          topFocus={dashboard.insights.focus.at(0) ?? null}
        />
      </section>

      <FocusSection insights={dashboard.insights} />
      <TrendsSection
        ratingHistory={dashboard.ratingHistory}
        matchLog={dashboard.matchLog}
      />
    {/if}

    <MatchesSection
      entries={dashboard.matchLog}
      name={profile.riotId.name}
      tag={profile.riotId.tag}
      bind:view={historyView}
    />

    {#if hasDetailedMatches}
      <BreakdownSection {dashboard} />
    {/if}
  {/if}
{/snippet}

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <!-- Cached dashboards arrive ready; new lookups stream in after the profile. -->
  {#await data.dashboard}
    <PlayerHeader {profile} rating={null} />
    <DashboardSkeleton />
  {:then result}
    {@const dashboard = result.ok ? result.dashboard : null}
    <!-- The header shows the rank only when there is no stats overview to show it. -->
    <PlayerHeader
      {profile}
      rating={dashboard?.rating ?? null}
      showRank={!dashboard || dashboard.summary.matchCount === 0}
    />
    <!-- Fades in when it replaces the placeholder; a cached page just appears. -->
    <div in:fade={{ duration: 300 }}>
      {#if result.ok}
        {@render stats(result.dashboard)}
      {:else}
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
    </div>
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
</style>
