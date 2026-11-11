<script lang="ts">
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
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const dashboard = $derived(data.dashboard);
  const profile = $derived(dashboard.profile);
  const summary = $derived(dashboard.summary);
  const hasDetailedMatches = $derived(summary.matchCount > 0);

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

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <PlayerHeader
    {profile}
    rating={dashboard.rating}
    showRank={!hasDetailedMatches}
  />

  {#if dashboard.matchLog.length === 0}
    <section class="empty panel page-section" aria-labelledby="empty-title">
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
</main>

<style>
  .stats {
    margin-top: var(--space-7);
  }

  .empty {
    padding: var(--space-6);
  }

  .empty p {
    max-width: 36rem;
    margin: var(--space-2) 0 0;
    color: var(--val-muted);
  }
</style>
