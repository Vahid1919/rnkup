<script lang="ts">
  import { tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import AgentIcon from '$lib/components/AgentIcon.svelte';
  import DuelMatrix from '$lib/components/DuelMatrix.svelte';
  import MatchMap from '$lib/components/match/MatchMap.svelte';
  import RoundReview from '$lib/components/match/RoundReview.svelte';
  import Nav from '$lib/components/Nav.svelte';
  import RankBadge from '$lib/components/RankBadge.svelte';
  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import {
    formatDateTime,
    formatDuration,
    formatSigned,
    ordinal,
  } from '$lib/format';
  import { minimapUrl } from '$lib/maps';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const match = $derived(data.match);
  const profile = $derived(data.profile);
  const playerMatch = $derived(data.playerMatch);
  const subject = $derived(
    match.players.find((player) => player.puuid === profile.puuid) ?? null,
  );
  const allyTeamId = $derived(subject?.teamId ?? null);
  const allies = $derived(
    match.players.filter((player) => player.teamId === allyTeamId),
  );
  const enemies = $derived(
    match.players.filter((player) => player.teamId !== allyTeamId),
  );
  const outcome = $derived(playerMatch.outcome);
  const outcomeLabel = $derived(
    outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Draw',
  );
  const allyScore = $derived(playerMatch.score.won);
  const enemyScore = $derived(playerMatch.score.lost);
  const allyResult = $derived(
    outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Draw',
  );
  const enemyResult = $derived(
    outcome === 'win' ? 'Loss' : outcome === 'loss' ? 'Win' : 'Draw',
  );
  let allColumns = $state(false);

  // The back link returns to this match's row on the dashboard. When the
  // dashboard is the previous history entry, going back also restores its
  // scroll position, filters and paging.
  let cameFromDashboard = $state(false);

  afterNavigate(({ from }) => {
    cameFromDashboard =
      from?.route.id === '/players/[name]/[tag]' &&
      from.params?.name?.toLowerCase() === profile.riotId.name.toLowerCase() &&
      from.params?.tag?.toLowerCase() === profile.riotId.tag.toLowerCase();
  });

  function goBack(event: MouseEvent): void {
    if (
      !cameFromDashboard ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    history.back();
  }

  // Only parties of two or more are worth labelling on the scoreboard.
  const partyLabels = $derived.by(() => {
    const sizes: Record<string, number> = {};
    for (const player of match.players) {
      if (player.partyId)
        sizes[player.partyId] = (sizes[player.partyId] ?? 0) + 1;
    }
    const ownParty = subject?.partyId ?? null;
    const labels: [string, string][] = Object.entries(sizes)
      .filter(([, size]) => size > 1)
      .sort(([first], [second]) =>
        first === ownParty ? -1 : second === ownParty ? 1 : 0,
      )
      .map(([partyId], index) => [
        partyId,
        `Party ${String.fromCharCode(65 + index)}`,
      ]);
    return new Map(labels);
  });

  const topTakeaways = $derived(data.takeaways.slice(0, 3));

  const hasRounds = $derived(match.hasRoundData && match.rounds.length > 0);
  const hasMap = $derived(hasRounds && minimapUrl(match.mapId) !== null);

  // A different match starts its replay at its own first round.
  let selectedRound = $derived(match.rounds[0]?.number ?? 1);

  async function openRound(round: number): Promise<void> {
    selectedRound = round;
    await tick();
    document.getElementById('rounds')?.scrollIntoView();
  }
</script>

<svelte:head>
  <title>
    {outcomeLabel} on {match.mapName} · {profile.riotId.name} | RNKUP
  </title>
  <meta
    name="description"
    content="Round replays, positions, scoreboard and duels for one competitive match."
  />
</svelte:head>

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <header class="match-header">
    <a
      class="back"
      href={resolve(`/players/[name]/[tag]#match-${match.id}`, {
        name: profile.riotId.name,
        tag: profile.riotId.tag,
      })}
      onclick={goBack}
    >
      <span aria-hidden="true">&larr;</span>
      {profile.riotId.name}
    </a>

    <div class="headline">
      {#if subject}
        <AgentIcon agentId={subject.agentId} agentName={subject.agentName} />
      {/if}
      <h1>
        <span class="result {outcome}">{outcomeLabel}</span>
        <span class="score">
          {allyScore}<span aria-hidden="true">–</span><span class="sr-only">
            to
          </span>{enemyScore}
        </span>
      </h1>
    </div>

    <p class="context">
      {match.mapName}{subject ? ` · ${subject.agentName}` : ''} · {formatDateTime(
        match.startedAt,
      )}{match.durationMs ? ` · ${formatDuration(match.durationMs)}` : ''}
    </p>

    <dl class="facts">
      {#if subject}
        <div>
          <dt>Placement</dt>
          <dd>{ordinal(subject.placement)} of 10</dd>
        </div>
      {/if}
      {#if data.baseline}
        <div>
          <dt><abbr title="Average combat score">ACS</abbr></dt>
          <dd>
            {Math.round(playerMatch.stats.averageCombatScore)}
            <small
              >your avg {Math.round(data.baseline.averageCombatScore)}</small
            >
          </dd>
        </div>
      {/if}
      {#if data.ratingChange !== null}
        <div>
          <dt>Rank rating</dt>
          <dd>{formatSigned(data.ratingChange)} RR</dd>
        </div>
      {/if}
      {#if match.averageRank}
        <div>
          <dt>Lobby</dt>
          <dd><RankBadge rank={match.averageRank} size="sm" /></dd>
        </div>
      {/if}
    </dl>
  </header>

  {#if hasRounds}
    <section id="rounds" class="page-section" aria-labelledby="rounds-title">
      <div class="section-heading">
        <h2 id="rounds-title" class="section-title">Rounds</h2>
        <p class="section-meta">Replay any round, kill by kill</p>
      </div>
      <RoundReview
        {match}
        subjectPuuid={profile.puuid}
        {allyTeamId}
        bind:selectedRound
      />
    </section>
  {/if}

  {#if subject}
    <section
      id="summary"
      class="page-section"
      aria-labelledby="your-game-title"
    >
      <div class="section-heading">
        <h2 id="your-game-title" class="section-title">Your game</h2>
      </div>

      {#if topTakeaways.length === 0}
        <p class="no-notes">Nothing unusual here. An average game for you.</p>
      {:else}
        <ul class="takeaways">
          {#each topTakeaways as takeaway (takeaway.text)}
            <li>
              <span class="marker" aria-hidden="true">
                {takeaway.tone === 'good'
                  ? '+'
                  : takeaway.tone === 'bad'
                    ? '−'
                    : '·'}
              </span>
              <span class="sr-only">
                {takeaway.tone === 'good'
                  ? 'Strength:'
                  : takeaway.tone === 'bad'
                    ? 'Work on:'
                    : 'Note:'}
              </span>
              {takeaway.text}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if hasMap && subject}
    <section id="map" class="page-section" aria-labelledby="map-title">
      <div class="section-heading">
        <h2 id="map-title" class="section-title">Map</h2>
        <p class="section-meta">Where you won and lost your fights</p>
      </div>
      <MatchMap
        {match}
        subjectPuuid={profile.puuid}
        onSelectRound={openRound}
      />
    </section>
  {/if}

  <section
    id="scoreboard"
    class="page-section"
    aria-labelledby="scoreboard-title"
  >
    <div class="section-heading">
      <h2 id="scoreboard-title" class="section-title">Scoreboard</h2>
      <button
        type="button"
        class="columns-toggle"
        aria-expanded={allColumns}
        onclick={() => (allColumns = !allColumns)}
      >
        {allColumns ? 'Fewer columns' : 'More columns'}
      </button>
    </div>
    <div class="boards">
      <Scoreboard
        team="Your team"
        result={allyResult}
        players={allies}
        subjectPuuid={profile.puuid}
        {partyLabels}
        {allColumns}
      />
      <Scoreboard
        team="Enemy team"
        result={enemyResult}
        players={enemies}
        subjectPuuid={profile.puuid}
        {partyLabels}
        {allColumns}
      />
    </div>
  </section>

  {#if hasRounds && subject && enemies.length > 0}
    <section id="duels" class="page-section" aria-labelledby="duels-title">
      <div class="section-heading">
        <h2 id="duels-title" class="section-title">Duels</h2>
        <p class="section-meta">Who beat whom</p>
      </div>
      <DuelMatrix {match} subjectPuuid={profile.puuid} {allies} {enemies} />
    </section>
  {/if}
</main>

<style>
  .match-header {
    display: grid;
    gap: var(--space-3);
  }

  .back {
    display: inline-flex;
    width: fit-content;
    min-height: 2.75rem;
    align-items: center;
    gap: var(--space-2);
    margin: calc(-1 * var(--space-2)) 0 0;
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
  }

  .back:hover {
    color: var(--val-cream);
  }

  .headline {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  h1 {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-1) var(--space-4);
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-display-sm);
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1;
  }

  .result.win {
    color: var(--val-win);
  }

  .result.loss {
    color: var(--val-loss);
  }

  .result.draw {
    color: var(--val-draw);
  }

  .score {
    color: var(--val-cream);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .context {
    margin: 0;
    color: var(--val-muted);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    margin: var(--space-2) 0 0;
  }

  .facts div {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .facts dt {
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .facts dd {
    margin: 0;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .facts small {
    margin-left: var(--space-1);
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-weight: 400;
  }

  /* The first section sits a little closer to the match header. */
  .match-header + .page-section {
    margin-top: var(--space-7);
  }

  .no-notes {
    margin: 0;
    color: var(--val-muted);
  }

  .takeaways {
    display: grid;
    max-width: 48rem;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* A + or − glyph carries the tone in shape, not colour. */
  .takeaways li {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr);
    gap: var(--space-2);
    line-height: 1.55;
  }

  .marker {
    color: var(--val-muted);
    font-weight: 600;
    text-align: center;
  }

  .boards {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
  }

  .columns-toggle {
    display: none;
    min-height: 2.5rem;
    margin-left: auto;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: 0 var(--space-3);
    color: var(--val-muted);
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .columns-toggle:hover,
  .columns-toggle[aria-expanded='true'] {
    border-color: var(--val-line-strong);
    color: var(--val-cream);
  }

  #scoreboard .section-heading {
    align-items: center;
  }

  @media (max-width: 640px) {
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .facts div {
      display: grid;
      gap: var(--space-1);
    }

    .columns-toggle {
      display: inline-flex;
      align-items: center;
    }
  }
</style>
