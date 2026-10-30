<script lang="ts">
  import { resolve } from '$app/paths';
  import type { MatchPlayer } from '$lib/match-detail';
  import AgentIcon from './AgentIcon.svelte';
  import RankBadge from './RankBadge.svelte';

  type Props = {
    /** Team name, e.g. "Your team". */
    team: string;
    result: 'Win' | 'Loss' | 'Draw';
    players: MatchPlayer[];
    /** The player whose page this match was opened from. */
    subjectPuuid: string;
    /** Labels for players who queued together, keyed by party ID. */
    partyLabels: Map<string, string>;
    /** On phones only ACS and K/D/A show until the reader asks for more. */
    allColumns: boolean;
  };

  let { team, result, players, subjectPuuid, partyLabels, allColumns }: Props =
    $props();

  const caption = $derived(`${team} · ${result}`);
  let scroller = $state<HTMLElement | null>(null);
  let atEnd = $state(true);
  let overflows = $state(false);

  function updateEdge(): void {
    if (!scroller) return;
    overflows = scroller.scrollWidth > scroller.clientWidth + 2;
    atEnd =
      scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
  }

  // Re-measure when the column set or the viewport changes.
  $effect(() => {
    void allColumns;
    updateEdge();
  });

  function nullable(value: number | null, suffix = ''): string {
    return value === null ? '—' : `${value}${suffix}`;
  }
</script>

<svelte:window onresize={updateEdge} />

<div class="board" class:compact={!allColumns} class:fade={!atEnd}>
  <!-- When the table overflows, the scroller is focusable so keyboard users
       can pan it; the table's caption already names it. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="table-scroll"
    tabindex={overflows ? 0 : undefined}
    bind:this={scroller}
    onscroll={updateEdge}
  >
    <table class="data-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" class="player-column">Player</th>
          <th scope="col" class="numeric">
            <abbr title="Average combat score">ACS</abbr>
          </th>
          <th scope="col" class="numeric">
            <abbr title="Kills, deaths and assists">K/D/A</abbr>
          </th>
          <th scope="col" class="numeric extra">
            <abbr title="Average damage per round">ADR</abbr>
          </th>
          <th scope="col" class="numeric extra">
            <abbr title="Headshot percentage">HS%</abbr>
          </th>
          <th scope="col" class="numeric extra">
            <abbr
              title="Share of rounds with a kill, an assist, a survival, or a traded death"
            >
              KAST
            </abbr>
          </th>
          <th scope="col" class="numeric extra">
            <abbr title="First kills">FK</abbr>
          </th>
          <th scope="col" class="numeric extra">
            <abbr title="First deaths">FD</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each players as player (player.puuid)}
          {@const isSubject = player.puuid === subjectPuuid}
          {@const party = player.partyId
            ? partyLabels.get(player.partyId)
            : undefined}
          <tr class:subject={isSubject}>
            <th scope="row" class="player-column">
              <span class="player">
                <AgentIcon
                  agentId={player.agentId}
                  agentName={player.agentName}
                  size="sm"
                />
                <span class="names">
                  {#if player.name && player.tag}
                    <a
                      href={resolve('/players/[name]/[tag]', {
                        name: player.name,
                        tag: player.tag,
                      })}
                    >
                      {player.name}<span class="tag">#{player.tag}</span>
                    </a>
                  {:else}
                    <span>Unknown player</span>
                  {/if}
                  <small>
                    <RankBadge rank={player.rank} size="sm" iconOnly />
                    <span>{player.agentName}</span>
                    {#if isSubject}<span class="flag">You</span>{/if}
                    {#if party}<span>{party}</span>{/if}
                  </small>
                </span>
              </span>
            </th>
            <td class="numeric strong">{player.stats.averageCombatScore}</td>
            <td class="numeric">
              {player.stats.kills} / {player.stats.deaths} / {player.stats
                .assists}
            </td>
            <td class="numeric extra">
              {Math.round(player.stats.averageDamagePerRound)}
            </td>
            <td class="numeric extra">
              {Math.round(player.stats.headshotPercentage)}%
            </td>
            <td class="numeric extra">
              {player.stats.kast === null
                ? '—'
                : `${Math.round(player.stats.kast)}%`}
            </td>
            <td class="numeric extra">{nullable(player.stats.firstKills)}</td>
            <td class="numeric extra">{nullable(player.stats.firstDeaths)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .board {
    position: relative;
    min-width: 0;
  }

  table {
    min-width: 46rem;
  }

  .data-table caption {
    padding-left: var(--space-3);
  }

  /* Keep the player in view while the stats scroll sideways. */
  .player-column {
    position: sticky;
    z-index: 1;
    left: 0;
    min-width: 15rem;
    background: var(--val-bg);
  }

  tr.subject > * {
    background: var(--val-panel);
  }

  tr.subject > :first-child {
    border-radius: var(--radius) 0 0 var(--radius);
  }

  tr.subject > :last-child {
    border-radius: 0 var(--radius) var(--radius) 0;
  }

  /* Inset the edges so the subject row's tint never touches its text. */
  tr > :first-child {
    padding-left: var(--space-3);
  }

  tr > :last-child {
    padding-right: var(--space-3);
  }

  .player {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .names {
    display: grid;
    min-width: 0;
    gap: 0.15rem;
    line-height: 1.25;
  }

  .names a {
    overflow: hidden;
    color: var(--val-cream);
    font-weight: 600;
    text-decoration: none;
    text-overflow: ellipsis;
  }

  .names a:hover,
  .names a:focus-visible {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .tag {
    color: var(--val-faint);
    font-weight: 400;
  }

  small {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 400;
  }

  small :global(.rank-badge img) {
    width: 1rem;
    height: 1rem;
  }

  .flag {
    color: var(--val-cream);
    font-weight: 600;
  }

  .strong {
    font-weight: 600;
  }

  /* An edge fade signals more columns off to the right. */
  .board::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 2.5rem;
    content: '';
    background: linear-gradient(to right, transparent, var(--val-bg));
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }

  .board.fade::after {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .player-column {
      min-width: 0;
      max-width: 11rem;
    }

    .tag {
      display: none;
    }

    /* With every column showing, size columns to their content so ACS and
       K/D/A stay next to the player and only the extra stats scroll. */
    table {
      width: max-content;
      min-width: 100%;
    }

    .compact table {
      width: 100%;
      min-width: 0;
    }

    .compact .extra {
      display: none;
    }

    .compact .player-column {
      position: static;
      width: 100%;
      max-width: none;
    }
  }
</style>
