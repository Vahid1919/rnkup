<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import AgentIcon from '$lib/components/AgentIcon.svelte';
  import DuelMatrix from '$lib/components/DuelMatrix.svelte';
  import Nav from '$lib/components/Nav.svelte';
  import RankBadge from '$lib/components/RankBadge.svelte';
  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import {
    formatDateTime,
    formatDuration,
    formatSigned,
    ordinal,
  } from '$lib/format';
  import type { MatchRound } from '$lib/match-detail';
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

  type RoundSummary = {
    number: number;
    won: boolean;
    side: string | null;
    endType: string;
    firstKillForUs: boolean | null;
    subjectKills: number;
    subjectSurvived: boolean;
  };

  function summarizeRound(round: MatchRound): RoundSummary {
    const firstKill = round.kills.find((kill) => kill.isFirstKill);
    const killer = firstKill
      ? match.players.find((player) => player.puuid === firstKill.killerPuuid)
      : undefined;
    const me = round.players.find((player) => player.puuid === profile.puuid);
    return {
      number: round.number,
      won: round.winningTeamId === allyTeamId,
      side:
        round.teams.find((team) => team.teamId === allyTeamId)?.side ?? null,
      endType: round.endType,
      firstKillForUs: killer ? killer.teamId === allyTeamId : null,
      subjectKills: me?.kills ?? 0,
      subjectSurvived: me?.survived ?? false,
    };
  }

  const END_LABELS: Record<string, string> = {
    elimination: 'Elimination',
    defuse: 'Spike defused',
    detonate: 'Spike detonated',
    other: 'Time or surrender',
  };

  const rounds = $derived(match.rounds.map(summarizeRound));

  function roundLabel(round: RoundSummary): string {
    const parts = [
      `Round ${round.number}: ${round.won ? 'won' : 'lost'}`,
      round.side ? `on ${round.side}` : null,
      END_LABELS[round.endType] ?? null,
      round.firstKillForUs === null
        ? null
        : round.firstKillForUs
          ? 'your team got the first kill'
          : 'enemy got the first kill',
      `you: ${round.subjectKills} ${round.subjectKills === 1 ? 'kill' : 'kills'}, ${round.subjectSurvived ? 'survived' : 'died'}`,
    ];
    return parts.filter(Boolean).join(', ');
  }
</script>

{#snippet firstKillMark()}
  <svg class="mark" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0.8 9.2 5 5 9.2 0.8 5z" fill="currentColor" />
  </svg>
{/snippet}

{#snippet deathMark()}
  <svg class="mark" viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M2 2l6 6M8 2l-6 6"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.6"
    />
  </svg>
{/snippet}

<svelte:head>
  <title>
    {outcomeLabel} on {match.mapName} · {profile.riotId.name} | Radiant Stats
  </title>
  <meta
    name="description"
    content="Scoreboard, rounds and duels for one competitive match."
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

  {#if subject}
    <section id="summary" class="summary" aria-labelledby="your-game-title">
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

  {#if match.hasRoundData && rounds.length > 0}
    <section
      id="deep-dive"
      class="page-section"
      aria-labelledby="deep-dive-title"
    >
      <div class="section-heading">
        <h2 id="deep-dive-title" class="section-title">Deep dive</h2>
        <p class="section-meta">For your VOD review</p>
      </div>

      <details class="more">
        <summary>Round by round <small>{rounds.length}</small></summary>
        <div class="more-body">
          <p class="legend">
            <span><span class="swatch won" aria-hidden="true">W</span> Win</span
            >
            <span
              ><span class="swatch lost" aria-hidden="true">L</span> Loss</span
            >
            <span><span class="legend-kills">2K</span> Your kills</span>
            <span>{@render firstKillMark()} Your team got the first kill</span>
            <span>{@render deathMark()} You died</span>
          </p>
          <ol class="rounds">
            {#each rounds as round (round.number)}
              <li
                class:won={round.won}
                class:lost={!round.won}
                class:half={round.number === 13 || round.number === 25}
              >
                <span class="sr-only">{roundLabel(round)}</span>
                <span aria-hidden="true" class="round-head">
                  <span class="round-number">{round.number}</span>
                  <span class="round-result">{round.won ? 'W' : 'L'}</span>
                </span>
                <span aria-hidden="true" class="round-kills">
                  {round.subjectKills > 0 ? `${round.subjectKills}K` : ''}
                </span>
                <span aria-hidden="true" class="round-marks">
                  {#if round.firstKillForUs}{@render firstKillMark()}{/if}
                  {#if !round.subjectSurvived}{@render deathMark()}{/if}
                </span>
              </li>
            {/each}
          </ol>
        </div>
      </details>

      {#if subject && enemies.length > 0}
        <details class="more">
          <summary>Head-to-head duels <small>who beat whom</small></summary>
          <div class="more-body">
            <DuelMatrix
              {match}
              subjectPuuid={profile.puuid}
              {allies}
              {enemies}
            />
          </div>
        </details>
      {/if}
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

  .summary {
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

  .more[open] {
    padding-bottom: var(--space-5);
  }

  .more + .more {
    border-top: 1px solid var(--val-line);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-5);
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .legend > span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Won is a filled tile, lost an outlined one, and each carries a letter. */
  .swatch {
    display: inline-grid;
    width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    line-height: 1;
  }

  .swatch.won,
  .rounds li.won {
    border-color: var(--val-win-fill);
    color: var(--val-win);
    background: var(--val-win-fill);
  }

  .swatch.lost,
  .rounds li.lost {
    border-color: var(--val-loss-line);
    color: var(--val-loss);
    background: transparent;
  }

  .legend-kills {
    color: var(--val-cream);
    font-weight: 600;
  }

  .mark {
    width: 0.7rem;
    height: 0.7rem;
    flex-shrink: 0;
    color: var(--val-cream);
  }

  .rounds {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.25rem, 1fr));
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rounds li {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-1);
    font-variant-numeric: tabular-nums;
  }

  .rounds li.half {
    grid-column-start: 1;
  }

  .round-head {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    font-size: var(--text-xs);
  }

  .round-number {
    color: var(--val-faint);
  }

  .round-result {
    font-weight: 600;
  }

  .round-kills {
    min-height: 1.4em;
    color: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .round-marks {
    display: flex;
    min-height: 0.75rem;
    align-items: center;
    gap: var(--space-1);
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
