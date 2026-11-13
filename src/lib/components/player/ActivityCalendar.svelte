<!-- A calendar of recent weeks: at a glance, how often the player plays and how those days went. -->
<script lang="ts">
  import {
    ACTIVITY_WEEKS,
    activityLegend,
    activityLevel,
    buildActivity,
    dayKillDeath,
    type ActivityDay,
    type ActivityMetric,
    type MatchLogEntry,
  } from '$lib/dashboard';

  type Props = {
    entries: MatchLogEntry[];
  };

  let { entries }: Props = $props();

  const tabs: { metric: ActivityMetric; label: string; legend: string }[] = [
    { metric: 'playtime', label: 'Playtime', legend: 'Matches played' },
    { metric: 'killDeath', label: 'K/D', legend: 'K/D' },
    { metric: 'winRate', label: 'Win Ratio', legend: 'Win rate' },
  ];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' });

  let metric = $state<ActivityMetric>('playtime');
  const tabButtons: HTMLButtonElement[] = [];

  // Calendar days follow the viewer's clock, like the match log's day groups.
  const report = $derived(buildActivity(entries, new Date()));
  const summary = $derived(
    `${report.activeDays} of ${report.dayCount} days played`,
  );
  const activeTab = $derived(
    tabs.find((tab) => tab.metric === metric) ?? tabs[0],
  );
  const legend = $derived(activityLegend(metric, report.busiestDay));

  const parseDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  /** A month name over the week holding its 1st, kept clear of its neighbour. */
  const monthLabels = $derived.by(() => {
    const labels = report.weeks.map((week) => {
      const first = week.find((day) => day.date.endsWith('-01'));
      return first ? monthFormat.format(parseDate(first.date)) : null;
    });
    const next = labels.findIndex((label) => label !== null);
    if (labels[0] === null && (next === -1 || next >= 3)) {
      labels[0] = monthFormat.format(parseDate(report.weeks[0][0].date));
    }
    return labels;
  });

  function tip(day: ActivityDay): string {
    const label = dateFormat.format(parseDate(day.date));
    if (day.matches === 0) return `${label}\nNo matches`;
    const count = `${day.matches} ${day.matches === 1 ? 'match' : 'matches'}`;
    const draws = day.draws > 0 ? ` ${day.draws}D` : '';
    return `${label}\n${count} · ${day.wins}W ${day.losses}L${draws}\nK/D ${dayKillDeath(day).toFixed(2)}`;
  }

  function onTabKey(event: KeyboardEvent, index: number) {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : step === 0
            ? null
            : (index + step + tabs.length) % tabs.length;
    if (target === null) return;
    event.preventDefault();
    metric = tabs[target].metric;
    tabButtons[target]?.focus();
  }
</script>

<figure
  class="activity"
  class:graded={metric !== 'playtime'}
  style:--weeks={report.weeks.length}
>
  <figcaption class="heading">
    <h3>Activity</h3>
    <p>Last {ACTIVITY_WEEKS} weeks · {summary}</p>
  </figcaption>

  <div class="tabs" role="tablist" aria-label="Shade days by">
    {#each tabs as tab, index (tab.metric)}
      <button
        bind:this={tabButtons[index]}
        type="button"
        role="tab"
        id="activity-tab-{tab.metric}"
        aria-selected={metric === tab.metric}
        aria-controls="activity-panel"
        tabindex={metric === tab.metric ? 0 : -1}
        onclick={() => (metric = tab.metric)}
        onkeydown={(event) => onTabKey(event, index)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div
    id="activity-panel"
    class="panel-body"
    role="tabpanel"
    aria-labelledby="activity-tab-{metric}"
  >
    <div
      class="calendar"
      role="img"
      aria-label={`Activity calendar by ${activeTab.label}: ${summary}`}
    >
      {#each monthLabels as label, week (week)}
        {#if label}
          <span class="month" style:grid-column={week + 2}>{label}</span>
        {/if}
      {/each}
      {#each weekdays as weekday, row (weekday)}
        <span class="weekday" style:grid-row={row + 2}>{weekday}</span>
      {/each}
      {#each report.weeks as days, week (days[0].date)}
        {#each days as day, row (day.date)}
          <span
            class="day level-{day.inRange
              ? activityLevel(day, metric, report.busiestDay)
              : day.future
                ? 'future'
                : 'none'}"
            class:edge-start={week < 3}
            class:edge-end={week >= report.weeks.length - 3}
            style:grid-column={week + 2}
            style:grid-row={row + 2}
            data-tip={day.inRange ? tip(day) : undefined}
          ></span>
        {/each}
      {/each}
    </div>

    <div class="legend" aria-hidden="true">
      <p>{activeTab.legend}</p>
      <ol>
        {#each legend as value, level (level)}
          <li><span class="day level-{level}"></span>{value}</li>
        {/each}
      </ol>
    </div>
  </div>

  <p class="tip">
    Aim for consistency rather than spamming games. A good rule of thumb: stop
    after 3 wins or 2 losses.
  </p>
</figure>

<style>
  .activity {
    --cell: 1.375rem;
    --cell-gap: 4px;
    --day-empty: color-mix(in srgb, var(--val-cream) 9%, var(--val-panel));

    display: grid;
    width: min-content;
    align-content: start;
    gap: var(--space-4);
    margin: 0;
  }

  .heading {
    display: grid;
    gap: var(--space-1);
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-md);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .heading p {
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tabs {
    display: flex;
    gap: var(--space-5);
    border-bottom: 1px solid var(--val-line);
  }

  .tabs button {
    margin-bottom: -1px;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0 0 var(--space-2);
    background: none;
    color: var(--val-muted);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }

  .tabs button:hover {
    color: var(--val-cream);
  }

  .tabs button[aria-selected='true'] {
    border-bottom-color: var(--val-red);
    color: var(--val-cream);
  }

  .tabs button:focus-visible {
    outline: 2px solid var(--val-red);
    outline-offset: 2px;
  }

  .panel-body {
    display: grid;
    gap: var(--space-4);
  }

  /* Weekday labels, then one column per week; month names ride on top. */
  .calendar {
    display: grid;
    grid-template-columns: auto repeat(var(--weeks), var(--cell));
    grid-template-rows: auto repeat(7, var(--cell));
    gap: var(--cell-gap);
  }

  .month,
  .weekday {
    color: var(--val-faint);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .month {
    grid-row: 1;
    width: 0;
    padding-bottom: var(--space-1);
  }

  .weekday {
    grid-column: 1;
    align-self: center;
    padding-right: var(--space-2);
  }

  .day {
    position: relative;
    border-radius: var(--radius-sm);
  }

  .calendar .day[data-tip]:hover {
    outline: 2px solid var(--val-cream);
    outline-offset: 1px;
  }

  /* Hover card: the day, its matches and how they went. */
  .calendar .day[data-tip]:hover::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    z-index: 5;
    transform: translateX(-50%);
    border: 1px solid var(--val-line-strong);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    background: var(--val-panel-raised);
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.45);
    color: var(--val-cream);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    line-height: 1.5;
    white-space: pre;
    pointer-events: none;
  }

  .calendar .day.edge-start[data-tip]:hover::after {
    left: 0;
    transform: none;
  }

  .calendar .day.edge-end[data-tip]:hover::after {
    right: 0;
    left: auto;
    transform: none;
  }

  .legend {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .legend p {
    color: var(--val-muted);
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
  }

  /* Equal columns, so a wide label like "<40%" does not push its swatch. */
  .legend ol {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--cell-gap);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .legend li {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    min-width: var(--cell);
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .legend .day {
    width: var(--cell);
    height: var(--cell);
  }

  .tip {
    color: var(--val-faint);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  .level-none {
    outline: 1px dashed var(--val-line);
    outline-offset: -1px;
  }

  .level-0 {
    background: var(--day-empty);
  }

  .level-1 {
    background: color-mix(in srgb, var(--val-red) 32%, var(--day-empty));
  }

  .level-2 {
    background: color-mix(in srgb, var(--val-red) 55%, var(--day-empty));
  }

  .level-3 {
    background: color-mix(in srgb, var(--val-red) 78%, var(--day-empty));
  }

  .level-4 {
    background: var(--val-red);
  }

  /* K/D and win rate run red to green: below even reads red, above reads green. */
  .graded .level-1 {
    background: color-mix(in srgb, var(--val-red) 75%, var(--day-empty));
  }

  .graded .level-2 {
    background: color-mix(in srgb, var(--val-red) 35%, var(--day-empty));
  }

  .graded .level-3 {
    background: color-mix(in srgb, var(--val-win) 50%, var(--day-empty));
  }

  .graded .level-4 {
    background: var(--val-win);
  }

  @media (max-width: 560px) {
    .activity {
      --cell: 1rem;
      --cell-gap: 3px;
    }
  }
</style>
