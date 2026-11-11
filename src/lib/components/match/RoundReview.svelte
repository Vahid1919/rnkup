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
  // Starts each round at its first event; the stepper then overrides it.
  let step = $derived.by(() => {
    void round;
    return 0;
  });
  const snapshot = $derived(roundSnapshot(events, step));
  const showMap = $derived(minimapUrl(match.mapId) !== null);

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
    side: string | null;
    endType: string;
    firstKillForUs: boolean | null;
    subjectKills: number;
    subjectSurvived: boolean;
  };

  function summarize(entry: MatchRound): RoundSummary {
    const firstKill = entry.kills.find((kill) => kill.isFirstKill);
    const me = entry.players.find((player) => player.puuid === subjectPuuid);
    return {
      number: entry.number,
      won: entry.winningTeamId === allyTeamId,
      side:
        entry.teams.find((team) => team.teamId === allyTeamId)?.side ?? null,
      endType: entry.endType,
      firstKillForUs: firstKill ? isAlly(firstKill.killerPuuid) : null,
      subjectKills: me?.kills ?? 0,
      subjectSurvived: me?.survived ?? false,
    };
  }

  const summaries = $derived(match.rounds.map(summarize));
  const current = $derived(round ? summarize(round) : null);

  function roundLabel(summary: RoundSummary): string {
    return [
      `Round ${summary.number}: ${summary.won ? 'won' : 'lost'}`,
      summary.side ? `on ${summary.side}` : null,
      END_LABELS[summary.endType] ?? null,
      summary.firstKillForUs === null
        ? null
        : summary.firstKillForUs
          ? 'your team got the first kill'
          : 'enemy got the first kill',
      `you: ${summary.subjectKills} ${summary.subjectKills === 1 ? 'kill' : 'kills'}, ${summary.subjectSurvived ? 'survived' : 'died'}`,
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

<div class="round-review">
  <fieldset class="round-picker">
    <legend class="sr-only">Pick a round to review</legend>
    <p class="legend" aria-hidden="true">
      <span><span class="swatch won">W</span> Win</span>
      <span><span class="swatch lost">L</span> Loss</span>
      <span><span class="legend-kills">2K</span> Your kills</span>
      <span>{@render firstKillMark()} Your team got the first kill</span>
      <span>{@render deathMark()} You died</span>
    </p>
    <ol class="rounds">
      {#each summaries as summary (summary.number)}
        <li
          class:won={summary.won}
          class:lost={!summary.won}
          class:half={summary.number === 13 || summary.number === 25}
        >
          <label>
            <input
              type="radio"
              name="{uid}-round"
              value={summary.number}
              checked={summary.number === round?.number}
              onchange={() => (selectedRound = summary.number)}
            />
            <span class="sr-only">{roundLabel(summary)}</span>
            <span aria-hidden="true" class="round-head">
              <span class="round-number">{summary.number}</span>
              <span class="round-result">{summary.won ? 'W' : 'L'}</span>
            </span>
            <span aria-hidden="true" class="round-kills">
              {summary.subjectKills > 0 ? `${summary.subjectKills}K` : ''}
            </span>
            <span aria-hidden="true" class="round-marks">
              {#if summary.firstKillForUs}{@render firstKillMark()}{/if}
              {#if !summary.subjectSurvived}{@render deathMark()}{/if}
            </span>
          </label>
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

            {#if events.length > 0}
              <div class="stepper">
                <button
                  type="button"
                  disabled={step === 0}
                  onclick={() => (step -= 1)}
                >
                  <span aria-hidden="true">&larr;</span> Previous
                </button>
                <span class="step-count" aria-live="polite">
                  Event {step + 1} of {events.length}
                </span>
                <button
                  type="button"
                  disabled={step >= events.length - 1}
                  onclick={() => (step += 1)}
                >
                  Next <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            {/if}
            <p class="note">
              Positions are captured at each kill, plant and defuse, so the map
              shows still frames rather than movement.
            </p>
          </div>
        {/if}

        <div class="timeline">
          <h4 class="sub-title">Timeline</h4>
          {#if events.length === 0}
            <p class="note">No kills were recorded this round.</p>
          {:else}
            <ol class="events">
              {#each events as event, index (`${event.kind}-${index}`)}
                <li>
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
                    onclick={() => (step = index)}
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
  .round-review {
    display: grid;
    gap: var(--space-5);
  }

  .round-picker {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    border: 0;
    padding: 0;
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
  .rounds li.won label {
    border-color: var(--val-win-fill);
    color: var(--val-win);
    background: var(--val-win-fill);
  }

  .swatch.lost,
  .rounds li.lost label {
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

  .rounds li.half {
    grid-column-start: 1;
  }

  .rounds label {
    position: relative;
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-1);
    font-variant-numeric: tabular-nums;
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
    outline-offset: 3px;
  }

  .rounds input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
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

  .round-body {
    display: grid;
    gap: var(--space-5);
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    padding: var(--space-5);
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  .replay.no-map {
    grid-template-columns: minmax(0, 1fr);
  }

  .map-column {
    display: grid;
    gap: var(--space-3);
  }

  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .stepper button {
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

  .events {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
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
      max-width: 32rem;
    }
  }

  @media (max-width: 560px) {
    .round-body {
      padding: var(--space-4);
    }

    .buys {
      margin-left: 0;
    }

    .loadout-tables {
      overflow-x: auto;
    }
  }
</style>
