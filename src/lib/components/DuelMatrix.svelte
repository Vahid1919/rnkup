<script lang="ts">
  import type { MatchDetail, MatchPlayer } from '$lib/match-detail';
  import AgentIcon from './AgentIcon.svelte';

  type Props = {
    match: MatchDetail;
    subjectPuuid: string;
    allies: MatchPlayer[];
    enemies: MatchPlayer[];
  };

  let { match, subjectPuuid, allies, enemies }: Props = $props();

  const killCounts = $derived(
    new Map(
      match.duels.map((duel) => [
        `${duel.killerPuuid}>${duel.victimPuuid}`,
        duel.kills,
      ]),
    ),
  );

  function record(ally: string, enemy: string) {
    const kills = killCounts.get(`${ally}>${enemy}`) ?? 0;
    const deaths = killCounts.get(`${enemy}>${ally}`) ?? 0;
    return { kills, deaths, net: kills - deaths };
  }

  let scroller = $state<HTMLElement | null>(null);
  let atEnd = $state(true);
  let overflows = $state(false);

  function updateEdge(): void {
    if (!scroller) return;
    overflows = scroller.scrollWidth > scroller.clientWidth + 2;
    atEnd =
      scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
  }

  // The matrix starts inside a closed disclosure, so measure whenever the
  // scroller changes size (opening it, rotating the phone), not just on load.
  $effect(() => {
    if (!scroller) return;
    const observer = new ResizeObserver(updateEdge);
    observer.observe(scroller);
    return () => observer.disconnect();
  });
</script>

<p id="duel-note" class="note">
  Each cell is kills–deaths for one pairing: rows are your team, columns the
  enemy team. Filled cells are pairings your side won, outlined ones it lost.
</p>

<!-- When the table overflows, the scroller is focusable so keyboard users
     can pan it; the table's caption already names it. -->
<div class="matrix" class:fade={!atEnd}>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="table-scroll"
    tabindex={overflows ? 0 : undefined}
    bind:this={scroller}
    onscroll={updateEdge}
  >
    <table class="data-table" aria-describedby="duel-note">
      <caption class="sr-only">Head-to-head duels</caption>
      <thead>
        <tr>
          <td></td>
          {#each enemies as enemy (enemy.puuid)}
            <th scope="col">
              <span class="head" title={enemy.name || enemy.agentName}>
                <AgentIcon
                  agentId={enemy.agentId}
                  agentName={enemy.agentName}
                  size="sm"
                />
                <span class="enemy-name">{enemy.name || enemy.agentName}</span>
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each allies as ally (ally.puuid)}
          <tr class:subject={ally.puuid === subjectPuuid}>
            <th scope="row" class="ally">
              <span class="head row" title={ally.name || ally.agentName}>
                <AgentIcon
                  agentId={ally.agentId}
                  agentName={ally.agentName}
                  size="sm"
                />
                <span class="ally-name">
                  {ally.name || ally.agentName}
                  {#if ally.puuid === subjectPuuid}
                    <span class="you">You</span>
                  {/if}
                </span>
              </span>
            </th>
            {#each enemies as enemy (enemy.puuid)}
              {@const duel = record(ally.puuid, enemy.puuid)}
              <td
                class="duel"
                class:ahead={duel.net > 0}
                class:behind={duel.net < 0}
              >
                <strong>{duel.kills}–{duel.deaths}</strong>
                <span class="sr-only">
                  {duel.net > 0 ? 'ahead' : duel.net < 0 ? 'behind' : 'even'}
                </span>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .matrix {
    position: relative;
    min-width: 0;
  }

  /* An edge fade signals more enemy columns off to the right. */
  .matrix::after {
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

  .matrix.fade::after {
    opacity: 1;
  }

  /* Columns size to their content; the table only scrolls when it must. */
  table {
    width: max-content;
    min-width: 100%;
  }

  .note {
    margin: 0 0 var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-sm);
  }

  /* Keep your team in view while the enemy columns scroll sideways. */
  .ally {
    position: sticky;
    z-index: 1;
    left: 0;
    background: var(--val-bg);
  }

  .head {
    display: grid;
    min-width: 4.5rem;
    justify-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
  }

  .head.row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-3);
    color: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .you {
    margin-left: var(--space-1);
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  thead th {
    text-align: center;
  }

  /* Positioned so the cell's visually hidden label is clipped by the scroller
     instead of widening the page. */
  .duel {
    position: relative;
    text-align: center;
  }

  .duel strong {
    display: inline-block;
    min-width: 2.75rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
    color: var(--val-faint);
    font-weight: 500;
  }

  .duel.ahead strong {
    border-color: var(--val-win-fill);
    color: var(--val-win);
    background: var(--val-win-fill);
  }

  .duel.behind strong {
    border-color: var(--val-loss-line);
    color: var(--val-loss);
  }

  tr.subject > * {
    background: var(--val-panel);
  }

  /* On phones the row header shrinks to the agent icon (name in the title and
     for screen readers), so the duel cells get the width. */
  @media (max-width: 640px) {
    .ally {
      padding-right: var(--space-2);
    }

    .ally-name {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .head {
      min-width: 3.5rem;
    }

    .duel {
      padding-inline: var(--space-1);
    }

    .duel strong {
      min-width: 2.5rem;
      padding-inline: var(--space-1);
    }
  }
</style>
