<script lang="ts">
  import { agentPortraitUrl } from '$lib/agents';
  import AgentIcon from '$lib/components/AgentIcon.svelte';
  import { formatCredits, formatRoundClock } from '$lib/format';
  import { facingOnMinimap, minimapUrl, type MapPoint } from '$lib/maps';
  import {
    BUY_TYPE_LABELS,
    roundEvents,
    roundSnapshot,
    type MatchDetail,
    type MatchRound,
    type MatchRoundTeam,
    type MatchSide,
    type RoundEvent,
  } from '$lib/match-detail';
  import Minimap from './Minimap.svelte';

  type Props = {
    match: MatchDetail;
    subjectPuuid: string;
    allyTeamId: string | null;
    /** Round number shown; bound so other sections can jump to a round. */
    selectedRound: number;
  };

  let {
    match,
    subjectPuuid,
    allyTeamId,
    selectedRound = $bindable(),
  }: Props = $props();

  const uid = $props.id();
  const playersById = $derived(
    new Map(match.players.map((player) => [player.puuid, player])),
  );
  const round = $derived(
    match.rounds.find((candidate) => candidate.number === selectedRound) ??
      match.rounds[0],
  );
  const events = $derived(round ? roundEvents(round) : []);
  const showMap = $derived(minimapUrl(match.mapId) !== null);

  // The event on screen, remembered against its round. A round opened from
  // anywhere else has no cursor yet, so it starts at its first event.
  let cursor = $state.raw<{ round: MatchRound; step: number } | null>(null);
  const step = $derived(
    round && cursor?.round === round
      ? Math.min(cursor.step, Math.max(0, events.length - 1))
      : 0,
  );
  const snapshot = $derived(roundSnapshot(events, step));

  const roundIndex = $derived(round ? match.rounds.indexOf(round) : -1);
  const previousRound = $derived(match.rounds[roundIndex - 1] ?? null);
  const nextRound = $derived(
    roundIndex < 0 ? null : (match.rounds[roundIndex + 1] ?? null),
  );
  const atFirstEvent = $derived(step === 0);
  const atLastEvent = $derived(step >= events.length - 1);

  function showStep(index: number): void {
    if (round) cursor = { round, step: index };
  }

  function openRound(target: MatchRound, at: 'start' | 'end' = 'start'): void {
    cursor = {
      round: target,
      step: at === 'end' ? Math.max(0, roundEvents(target).length - 1) : 0,
    };
    selectedRound = target.number;
  }

  function moveRound(delta: 1 | -1): void {
    const target = delta > 0 ? nextRound : previousRound;
    if (target) openRound(target);
  }

  /**
   * Steps one event, running on into the neighbouring round at either end so
   * the whole match plays as one sequence. Going back lands on the previous
   * round's last event.
   */
  function moveStep(delta: 1 | -1): void {
    const target = step + delta;
    if (showMap && target >= 0 && target < events.length) {
      showStep(target);
    } else if (delta > 0) {
      moveRound(1);
    } else if (previousRound) {
      openRound(previousRound, showMap ? 'end' : 'start');
    }
  }

  let root = $state<HTMLElement>();
  let strip = $state<HTMLElement>();
  let feed = $state<HTMLElement>();

  /** Whether any of the review sits below the sticky header and on screen. */
  function onScreen(): boolean {
    if (!root) return false;
    const box = root.getBoundingClientRect();
    const header = document.querySelector('header')?.offsetHeight ?? 0;
    return box.bottom > header && box.top < window.innerHeight;
  }

  // Arrow keys drive the replay from anywhere on the page while it is on
  // screen. Form controls keep their own arrow keys, which is what lets the
  // round picker change rounds when it has focus.
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest('input, select, textarea, [contenteditable]')
    ) {
      return;
    }
    if (!onScreen()) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    if (event.shiftKey) moveRound(delta);
    else moveStep(delta);
  }

  /** Scrolls a container, and nothing else, until the child is in view. */
  function reveal(container: HTMLElement, child: HTMLElement): void {
    const box = container.getBoundingClientRect();
    const item = child.getBoundingClientRect();
    const margin = 8;
    if (item.left < box.left) {
      container.scrollLeft -= box.left - item.left + margin;
    } else if (item.right > box.right) {
      container.scrollLeft += item.right - box.right + margin;
    }
    if (item.top < box.top) {
      container.scrollTop -= box.top - item.top + margin;
    } else if (item.bottom > box.bottom) {
      container.scrollTop += item.bottom - box.bottom + margin;
    }
  }

  // Keep the picked round and the current event visible in their scrollers.
  $effect(() => {
    const tile = strip?.querySelector<HTMLElement>(
      `[data-round="${round?.number}"]`,
    );
    if (strip && tile) reveal(strip, tile);
  });

  $effect(() => {
    void round;
    const row = feed?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (feed && row) reveal(feed, row);
  });

  const END_LABELS: Record<string, string> = {
    elimination: 'Elimination',
    defuse: 'Spike defused',
    detonate: 'Spike detonated',
    other: 'Time ran out or surrender',
  };

  const isAlly = (puuid: string): boolean =>
    playersById.get(puuid)?.teamId === allyTeamId;
  const nameOf = (puuid: string): string =>
    playersById.get(puuid)?.name ?? 'Unknown player';

  type RoundSummary = {
    number: number;
    won: boolean;
    side: MatchSide | null;
    endType: string;
  };

  function summarize(entry: MatchRound): RoundSummary {
    return {
      number: entry.number,
      won: entry.winningTeamId === allyTeamId,
      side:
        entry.teams.find((team) => team.teamId === allyTeamId)?.side ?? null,
      endType: entry.endType,
    };
  }

  const summaries = $derived(match.rounds.map(summarize));

  type SideRun = { side: MatchSide | null; rounds: RoundSummary[] };

  // Consecutive rounds on one side: the two halves, then one round at a time
  // in overtime, where the sides swap every round.
  const sideRuns = $derived.by(() => {
    const runs: SideRun[] = [];
    for (const summary of summaries) {
      const last = runs.at(-1);
      if (last && last.side === summary.side) last.rounds.push(summary);
      else runs.push({ side: summary.side, rounds: [summary] });
    }
    return runs;
  });

  const SIDE_LABELS: Record<MatchSide, { long: string; short: string }> = {
    attack: { long: 'Attack', short: 'Atk' },
    defense: { long: 'Defense', short: 'Def' },
  };
  const current = $derived(round ? summarize(round) : null);

  function roundLabel(summary: RoundSummary): string {
    return [
      `Round ${summary.number}: ${summary.won ? 'won' : 'lost'}`,
      summary.side ? `on ${summary.side}` : null,
      END_LABELS[summary.endType] ?? null,
    ]
      .filter(Boolean)
      .join(', ');
  }

  function describe(event: RoundEvent): string {
    const clock = formatRoundClock(event.timeMs);
    if (event.kind === 'kill') {
      const { kill } = event;
      const tags = [
        kill.isFirstKill ? 'first kill' : null,
        kill.isTrade ? 'trade' : null,
      ].filter(Boolean);
      return `${clock}: ${nameOf(kill.killerPuuid)} killed ${nameOf(kill.victimPuuid)}${kill.weaponName ? ` with ${kill.weaponName}` : ''}${tags.length > 0 ? ` (${tags.join(', ')})` : ''}`;
    }
    if (event.kind === 'plant') {
      return `${clock}: ${nameOf(event.plant.playerPuuid)} planted the spike${event.plant.site ? ` on ${event.plant.site}` : ''}`;
    }
    return `${clock}: ${nameOf(event.defuse.playerPuuid)} defused the spike`;
  }

  function teamBuy(team: MatchRoundTeam | undefined): string {
    if (!team || team.buyType === null || team.loadoutValue === null) {
      return 'Unknown';
    }
    return `${BUY_TYPE_LABELS[team.buyType]} · ${formatCredits(team.loadoutValue)}`;
  }

  const allyTeam = $derived(
    round?.teams.find((team) => team.teamId === allyTeamId),
  );
  const enemyTeam = $derived(
    round?.teams.find((team) => team.teamId !== allyTeamId),
  );

  const loadoutGroups = $derived.by(() => {
    if (!round) return [];
    const group = (label: string, ally: boolean) => ({
      label,
      players: round.players
        .filter((entry) => isAlly(entry.puuid) === ally)
        .sort(
          (first, second) =>
            (second.loadoutValue ?? 0) - (first.loadoutValue ?? 0),
        ),
    });
    return [group('Your team', true), group('Enemy team', false)];
  });

  /** A narrow cone pointing where the player was looking. */
  function viewCone(direction: MapPoint): string {
    const length = 70;
    const spread = 26;
    const tipX = direction.x * length;
    const tipY = direction.y * length;
    const sideX = -direction.y * spread;
    const sideY = direction.x * spread;
    return `M0 0L${tipX + sideX} ${tipY + sideY}L${tipX - sideX} ${tipY - sideY}Z`;
  }
</script>

{#snippet person(puuid: string)}
  {@const player = playersById.get(puuid)}
  <span class="person" class:me={puuid === subjectPuuid}>
    <AgentIcon
      agentId={player?.agentId ?? null}
      agentName={player?.agentName ?? 'Unknown agent'}
      size="sm"
    />
    <span class="person-name">{player?.name ?? 'Unknown'}</span>
  </span>
{/snippet}

<svelte:window onkeydown={onKeydown} />

<div class="round-review" bind:this={root}>
  <!-- Sticks under the header so any round is one click away mid-review. -->
  <fieldset class="round-picker">
    <legend class="sr-only">Pick a round to review</legend>
    <ol class="runs" bind:this={strip}>
      {#each sideRuns as run (run.rounds[0]?.number)}
        <li class="run" style:--count={run.rounds.length}>
          <!-- Each round's own label names its side for screen readers. -->
          <span class="run-side" aria-hidden="true">
            {#if run.side}
              {run.rounds.length > 1
                ? SIDE_LABELS[run.side].long
                : SIDE_LABELS[run.side].short}
            {/if}
          </span>
          <ol class="rounds">
            {#each run.rounds as summary (summary.number)}
              <li
                class:won={summary.won}
                class:lost={!summary.won}
                data-round={summary.number}
              >
                <label>
                  <!-- A mouse click gives focus back to the page, so the arrow
                       keys go on to step through the round just picked. -->
                  <input
                    type="radio"
                    name="{uid}-round"
                    value={summary.number}
                    checked={summary.number === round?.number}
                    onchange={() => (selectedRound = summary.number)}
                    onclick={(event) => {
                      if (event.detail > 0) event.currentTarget.blur();
                    }}
                  />
                  <span class="sr-only">{roundLabel(summary)}</span>
                  <span aria-hidden="true" class="round-number">
                    {summary.number}
                  </span>
                  <span aria-hidden="true" class="round-result">
                    {summary.won ? 'W' : 'L'}
                  </span>
                </label>
              </li>
            {/each}
          </ol>
        </li>
      {/each}
    </ol>
  </fieldset>

  {#if round && current}
    <div class="round-body">
      <header class="round-title">
        <h3>
          Round {round.number}
          <span class:won={current.won} class:lost={!current.won}>
            {current.won ? 'Won' : 'Lost'}
          </span>
        </h3>
        <p>
          {current.side ? `On ${current.side}` : 'Side unknown'} · {END_LABELS[
            round.endType
          ]}
        </p>
        <dl class="buys">
          <div>
            <dt>Your team</dt>
            <dd>{teamBuy(allyTeam)}</dd>
          </div>
          <div>
            <dt>Enemy</dt>
            <dd>{teamBuy(enemyTeam)}</dd>
          </div>
        </dl>
      </header>

      <div class="replay" class:no-map={!showMap}>
        {#if showMap}
          <div class="map-column">
            <Minimap
              mapId={match.mapId}
              mapName={match.mapName}
              description={events[step]
                ? `Positions at ${describe(events[step])}`
                : `Round ${round.number} has no recorded positions`}
            >
              {#snippet children(project, clipId)}
                {#if snapshot.spike}
                  {@const at = project(snapshot.spike.location)}
                  {#if at}
                    <path
                      class="spike"
                      class:defused={snapshot.spike.defused}
                      d="M{at.x} {at.y - 18}l18 18l-18 18l-18 -18z"
                    />
                  {/if}
                {/if}
                {#if snapshot.shot}
                  {@const from = project(snapshot.shot.from)}
                  {@const to = project(snapshot.shot.to)}
                  {#if from && to}
                    <line
                      class="shot"
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                    />
                  {/if}
                {/if}
                {#each snapshot.markers as marker (`${marker.puuid}-${marker.alive}`)}
                  {@const at = project(marker.location)}
                  {@const player = playersById.get(marker.puuid)}
                  {@const portrait = agentPortraitUrl(player?.agentId ?? null)}
                  {@const facing =
                    marker.viewRadians === null
                      ? null
                      : facingOnMinimap(match.mapId, marker.viewRadians)}
                  {#if at}
                    <g
                      class="marker"
                      class:ally={isAlly(marker.puuid)}
                      class:enemy={!isAlly(marker.puuid)}
                      class:dead={!marker.alive}
                      class:highlighted={marker.highlighted}
                      class:subject={marker.puuid === subjectPuuid}
                      transform="translate({at.x} {at.y})"
                    >
                      <title>
                        {player?.name ?? 'Unknown'} ({player?.agentName ??
                          'Unknown agent'}){marker.alive ? '' : ', dead'}
                      </title>
                      {#if marker.alive}
                        {#if facing}
                          <path class="cone" d={viewCone(facing)} />
                        {/if}
                        <circle class="ring" r="24" />
                        {#if portrait}
                          <image
                            href={portrait}
                            x="-20"
                            y="-20"
                            width="40"
                            height="40"
                            clip-path="url(#{clipId})"
                          />
                        {/if}
                      {:else}
                        <path class="cross" d="M-13 -13L13 13M13 -13L-13 13" />
                      {/if}
                    </g>
                  {/if}
                {/each}
              {/snippet}
            </Minimap>

            <!-- At either end of a round the buttons carry on into the
                 neighbouring round. -->
            <div class="stepper">
              <button
                type="button"
                disabled={atFirstEvent && !previousRound}
                onclick={() => moveStep(-1)}
              >
                <span aria-hidden="true">&larr;</span>
                {atFirstEvent && previousRound
                  ? `Round ${previousRound.number}`
                  : 'Previous'}
              </button>
              <span class="step-count" aria-live="polite">
                {#if events.length > 0}
                  <span class="sr-only">Event</span>
                  {step + 1}
                  <span aria-hidden="true">/</span>
                  <span class="sr-only">of</span>
                  {events.length}
                {:else}
                  No events
                {/if}
              </span>
              <button
                type="button"
                disabled={atLastEvent && !nextRound}
                onclick={() => moveStep(1)}
              >
                {atLastEvent && nextRound
                  ? `Round ${nextRound.number}`
                  : 'Next'}
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        {/if}

        <div class="timeline">
          <h4 class="sub-title">Timeline</h4>
          {#if events.length === 0}
            <p class="note">No kills were recorded this round.</p>
          {:else}
            <ol class="events" bind:this={feed}>
              {#each events as event, index (`${event.kind}-${index}`)}
                <li data-step={index}>
                  <button
                    type="button"
                    class="event"
                    class:current={showMap && index === step}
                    class:ally={event.kind === 'kill'
                      ? isAlly(event.kill.killerPuuid)
                      : event.kind === 'plant'
                        ? isAlly(event.plant.playerPuuid)
                        : isAlly(event.defuse.playerPuuid)}
                    aria-current={showMap && index === step
                      ? 'step'
                      : undefined}
                    aria-label={describe(event)}
                    onclick={() => showStep(index)}
                  >
                    <span class="clock">{formatRoundClock(event.timeMs)}</span>
                    {#if event.kind === 'kill'}
                      <span class="feed">
                        {@render person(event.kill.killerPuuid)}
                        <span class="weapon">
                          {event.kill.weaponName ?? ''}
                        </span>
                        {@render person(event.kill.victimPuuid)}
                      </span>
                      <span class="tags">
                        {#if event.kill.isFirstKill}
                          <span class="tag">First kill</span>
                        {/if}
                        {#if event.kill.isTrade}
                          <span class="tag">Trade</span>
                        {/if}
                      </span>
                    {:else if event.kind === 'plant'}
                      <span class="feed">
                        {@render person(event.plant.playerPuuid)}
                        <span class="objective">
                          Planted{event.plant.site
                            ? ` on ${event.plant.site}`
                            : ''}
                        </span>
                      </span>
                      <span class="tags"></span>
                    {:else}
                      <span class="feed">
                        {@render person(event.defuse.playerPuuid)}
                        <span class="objective">Defused</span>
                      </span>
                      <span class="tags"></span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ol>
          {/if}
        </div>
      </div>

      <div class="footnotes">
        {#if showMap}
          <p class="note">
            Positions are captured at each kill, plant and defuse, so the map
            shows still frames rather than movement.
          </p>
        {/if}
        <p class="note keys">
          {#if showMap}
            <kbd>&larr;</kbd> <kbd>&rarr;</kbd> step through events ·
            <kbd>Shift</kbd> + <kbd>&larr;</kbd> <kbd>&rarr;</kbd> change round
          {:else}
            <kbd>&larr;</kbd> <kbd>&rarr;</kbd> change round
          {/if}
        </p>
      </div>

      <details class="loadouts">
        <summary>Loadouts and credits</summary>
        <div class="loadout-tables">
          {#each loadoutGroups as group (group.label)}
            <table>
              <caption>{group.label}</caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Weapon</th>
                  <th scope="col">Armor</th>
                  <th scope="col" class="num">Loadout</th>
                  <th scope="col" class="num">Credits left</th>
                </tr>
              </thead>
              <tbody>
                {#each group.players as entry (entry.puuid)}
                  <tr class:me={entry.puuid === subjectPuuid}>
                    <th scope="row">{@render person(entry.puuid)}</th>
                    <td>{entry.weaponName ?? '—'}</td>
                    <td>{entry.armorName ?? 'None'}</td>
                    <td class="num">
                      {entry.loadoutValue === null
                        ? '—'
                        : formatCredits(entry.loadoutValue)}
                    </td>
                    <td class="num">
                      {entry.creditsRemaining === null
                        ? '—'
                        : formatCredits(entry.creditsRemaining)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/each}
        </div>
      </details>
    </div>
  {/if}
</div>

<style>
  /* The map is sized from the viewport height: what is left once the sticky
     header, the round strip, the round title and the stepper have their
     room. That keeps a whole round on screen with nothing to scroll. */
  .round-review {
    --map-size: clamp(
      18rem,
      calc(100dvh - var(--header-height) - 15rem),
      44rem
    );
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  .round-picker {
    position: sticky;
    z-index: 10;
    top: var(--header-height);
    min-width: 0;
    margin: 0;
    border: 0;
    padding: var(--space-2) 0;
    background: var(--val-bg);
  }

  /* Won is a filled tile, lost an outlined one, and each carries a letter. */
  .rounds li.won label {
    border-color: var(--val-win-fill);
    color: var(--val-win);
    background: var(--val-win-fill);
  }

  .rounds li.lost label {
    border-color: var(--val-loss-line);
    color: var(--val-loss);
    background: transparent;
  }

  /* One row for the whole match, scrolling sideways when it runs long. The
     padding leaves room for the selection ring inside the scroller. Each run
     of rounds on one side grows by its round count, so tiles stay even. */
  .runs {
    display: flex;
    gap: var(--space-3);
    overflow-x: auto;
    margin: -5px;
    padding: 5px;
    list-style: none;
    scrollbar-width: thin;
  }

  /* The basis covers the run's inner gaps, so the space shared out by
     round count leaves every tile the same width. */
  .run {
    display: grid;
    flex: var(--count) 0 calc((var(--count) - 1) * var(--space-1));
    gap: var(--space-1);
  }

  /* The side sits above its run as a label with a rule out to the run's end. */
  .run-side {
    display: flex;
    min-height: 1rem;
    align-items: center;
    gap: var(--space-2);
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .run-side::after {
    height: 1px;
    flex: 1;
    background: var(--val-line-strong);
    content: '';
  }

  .rounds {
    display: flex;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rounds li {
    min-width: 2rem;
    flex: 1 0 0;
  }

  .rounds label {
    position: relative;
    display: grid;
    justify-items: center;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: var(--space-1) 2px;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
    cursor: pointer;
    transition: box-shadow 150ms ease;
  }

  .rounds label:hover {
    box-shadow: inset 0 0 0 1px var(--val-line-strong);
  }

  .rounds label:has(input:checked) {
    box-shadow: 0 0 0 2px var(--val-cream);
  }

  .rounds label:has(input:focus-visible) {
    outline: 2px solid var(--val-cream);
    outline-offset: 2px;
  }

  .rounds input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .round-number {
    color: var(--val-muted);
    font-size: var(--text-xs);
  }

  .round-result {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .round-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: var(--space-4) var(--space-5) var(--space-5);
    background: var(--val-panel);
  }

  .round-title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2) var(--space-5);
  }

  .round-title h3 {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .round-title p {
    margin: 0;
    color: var(--val-muted);
  }

  .won {
    color: var(--val-win);
  }

  .lost {
    color: var(--val-loss);
  }

  .buys {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    margin: 0 0 0 auto;
    font-size: var(--text-sm);
  }

  .buys div {
    display: flex;
    gap: var(--space-2);
  }

  .buys dt {
    color: var(--val-faint);
  }

  .buys dd {
    margin: 0;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .replay {
    display: grid;
    grid-template-columns:
      min(calc(50% - var(--space-5) / 2), var(--map-size))
      minmax(0, 1fr);
    gap: var(--space-5);
  }

  .replay.no-map {
    grid-template-columns: minmax(0, 1fr);
  }

  .map-column {
    display: grid;
    align-content: start;
    gap: var(--space-3);
  }

  /* Beside the map the timeline takes the map's height and scrolls inside
     it, so a long round never pushes the stepper off screen. */
  .timeline {
    display: flex;
    min-height: 0;
    flex-direction: column;
    contain: size;
  }

  .replay.no-map .timeline {
    contain: none;
  }

  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .stepper button {
    min-width: 6rem;
    min-height: 2.5rem;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: 0 var(--space-4);
    color: var(--val-cream);
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }

  .stepper button:hover:not(:disabled) {
    border-color: var(--val-line-strong);
  }

  .stepper button:disabled {
    color: var(--val-faint);
    cursor: default;
    opacity: 0.5;
  }

  .step-count {
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .note {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .sub-title {
    margin: 0 0 var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .footnotes {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-1) var(--space-5);
  }

  kbd {
    display: inline-block;
    min-width: 1.5rem;
    border: 1px solid var(--val-line-strong);
    border-radius: var(--radius-sm);
    padding: 0 var(--space-1);
    color: var(--val-muted);
    font: inherit;
    font-size: var(--text-xs);
    text-align: center;
  }

  /* Keyboard hints mean nothing on a touch screen. */
  @media (hover: none) {
    .keys {
      display: none;
    }
  }

  .events {
    display: grid;
    min-height: 0;
    align-content: start;
    gap: 2px;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
    scrollbar-width: thin;
  }

  /* The left edge carries team colour; the killer's side owns the row. */
  .event {
    --team: var(--val-loss);
    display: grid;
    width: 100%;
    grid-template-columns: 2.75rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    border: 0;
    border-left: 3px solid var(--team);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    color: var(--val-cream);
    background: transparent;
    font: inherit;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }

  .event.ally {
    --team: var(--val-win);
  }

  .event:hover {
    background: var(--val-panel-raised);
  }

  .event.current {
    background: color-mix(in srgb, var(--team) 14%, var(--val-panel));
  }

  .clock {
    color: var(--val-faint);
    font-variant-numeric: tabular-nums;
  }

  .feed {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-3);
    min-width: 0;
  }

  .person {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    color: var(--val-muted);
  }

  .person.me {
    color: var(--val-cream);
    font-weight: 600;
  }

  .person-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .weapon,
  .objective {
    color: var(--val-faint);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .objective {
    color: #f5b041;
  }

  .tags {
    display: flex;
    gap: var(--space-1);
  }

  .tag {
    border: 1px solid var(--val-line-strong);
    border-radius: var(--radius-sm);
    padding: 1px var(--space-2);
    color: var(--val-muted);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  /* Map markers. Team colour is repeated by a filled portrait (alive) or a
     cross (dead), so the state never depends on colour alone. */
  .marker {
    --team: var(--val-loss);
  }

  .marker.ally {
    --team: var(--val-win);
  }

  .ring {
    fill: var(--val-panel);
    stroke: var(--team);
    stroke-width: 4;
  }

  .marker.subject .ring {
    stroke: var(--val-gold);
    stroke-width: 6;
  }

  .marker.highlighted .ring {
    stroke-width: 8;
  }

  .cone {
    fill: var(--team);
    opacity: 0.35;
  }

  .cross {
    fill: none;
    stroke: var(--team);
    stroke-linecap: round;
    stroke-width: 6;
    opacity: 0.55;
  }

  .marker.highlighted .cross {
    stroke-width: 9;
    opacity: 1;
  }

  .shot {
    stroke: var(--val-cream);
    stroke-dasharray: 10 8;
    stroke-linecap: round;
    stroke-width: 4;
  }

  .spike {
    fill: #f5b041;
    stroke: var(--val-bg);
    stroke-width: 4;
  }

  .spike.defused {
    fill: var(--val-faint);
  }

  .loadouts summary {
    min-height: 2.5rem;
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .loadout-tables {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    margin-top: var(--space-3);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  caption {
    padding-bottom: var(--space-2);
    color: var(--val-muted);
    font-weight: 600;
    text-align: left;
  }

  th,
  td {
    border-bottom: 1px solid var(--val-line);
    padding: var(--space-2) var(--space-2) var(--space-2) 0;
    text-align: left;
    white-space: nowrap;
  }

  thead th {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  tbody th {
    font-weight: 400;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 900px) {
    .replay,
    .loadout-tables {
      grid-template-columns: minmax(0, 1fr);
    }

    .map-column {
      max-width: min(32rem, var(--map-size));
    }

    /* Stacked under the map, the timeline runs at its full length. */
    .timeline {
      contain: none;
    }
  }

  /* A short window has no room to spare for a pinned strip. */
  @media (max-height: 30rem) {
    .round-picker {
      position: static;
    }
  }

  @media (max-width: 560px) {
    .round-body {
      padding: var(--space-4);
    }

    .buys {
      margin-left: 0;
    }

    .stepper {
      gap: var(--space-2);
    }

    .stepper button {
      min-width: 0;
      padding: 0 var(--space-3);
    }

    .loadout-tables {
      overflow-x: auto;
    }
  }
</style>
