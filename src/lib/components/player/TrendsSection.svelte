<!-- How often the player plays, beside rank rating over a chosen time range. The chart is left out when the provider has no rating history. -->
<script lang="ts">
  import ActivityCalendar from '$lib/components/player/ActivityCalendar.svelte';
  import TrendChart, {
    type TrendChartPoint,
  } from '$lib/components/TrendChart.svelte';
  import {
    availableRatingRanges,
    DEFAULT_RATING_RANGE,
    ratingChange,
    ratingPointsInRange,
    type MatchLogEntry,
    type RatingPoint,
    type RatingRange,
  } from '$lib/dashboard';
  import { formatDay, formatDayWithYear, formatSigned } from '$lib/format';
  import { formatRating, rankFromRating } from '$lib/ranks';

  type Props = {
    ratingHistory: RatingPoint[];
    /** Every stored match, for the activity calendar. */
    matchLog: MatchLogEntry[];
  };

  let { ratingHistory, matchLog }: Props = $props();
  let selected = $state<RatingRange>(DEFAULT_RATING_RANGE);

  const ranges = $derived(availableRatingRanges(ratingHistory));
  // A short history has no 3-month button; it then shows everything.
  const range = $derived(
    ranges.find((option) => option.id === selected) ?? ranges.at(-1),
  );
  const shown = $derived(
    ratingPointsInRange(ratingHistory, range?.window ?? null),
  );

  const ratingPoints = $derived(
    shown.map(
      (point): TrendChartPoint => ({
        label: formatDayWithYear(point.date),
        value: point.rating,
        detail: `${formatSigned(point.change)} RR`,
      }),
    ),
  );

  const hasRatingChart = $derived(ratingHistory.length >= 2);

  /** e.g. "Aug 5 – Nov 3, 2026 · 38 games · +45 RR". */
  const description = $derived.by(() => {
    const first = shown.at(0);
    const last = shown.at(-1);
    if (!first || !last) return '';
    const sameYear =
      new Date(first.date).getFullYear() === new Date(last.date).getFullYear();
    const start = sameYear
      ? formatDay(first.date)
      : formatDayWithYear(first.date);
    const games = `${shown.length} ${shown.length === 1 ? 'game' : 'games'}`;
    return `${start} – ${formatDayWithYear(last.date)} · ${games} · ${formatSigned(ratingChange(shown))} RR`;
  });

  // One tick per division (100 points), or per rank (300) over a wide spread.
  const ratingTicks = $derived.by(() => {
    if (shown.length === 0) return null;
    const values = shown.map((point) => point.rating);
    const low = Math.floor(Math.min(...values) / 100) * 100;
    const high = Math.max(
      Math.ceil(Math.max(...values) / 100) * 100,
      low + 100,
    );
    const step = (high - low) / 100 > 7 ? 300 : 100;
    const ticks: number[] = [];
    for (let tick = low; tick <= high; tick += step) ticks.push(tick);
    return ticks;
  });
</script>

{#snippet rangePicker()}
  {#if ranges.length > 1}
    <fieldset class="ranges">
      <legend class="sr-only">Time range</legend>
      {#each ranges as option (option.id)}
        <label title={option.title}>
          <input
            type="radio"
            name="rating-range"
            value={option.id}
            checked={option.id === range?.id}
            onchange={() => (selected = option.id)}
          />
          <span aria-hidden="true">{option.label}</span>
          <span class="sr-only">{option.title}</span>
        </label>
      {/each}
    </fieldset>
  {/if}
{/snippet}

<section
  class="trends panel page-section"
  class:has-chart={hasRatingChart}
  aria-label="Activity and rank rating"
>
  <ActivityCalendar entries={matchLog} />
  {#if hasRatingChart}
    <div class="chart">
      <TrendChart
        title="Rank rating"
        {description}
        points={ratingPoints}
        formatValue={formatRating}
        tickValues={ratingTicks}
        formatTick={(value) => rankFromRating(value).name}
        wideAxis
        actions={rangePicker}
        emptyMessage={`Only ${shown.length} rated game in the last ${range?.title ?? 'range'}. Pick a longer range to see a trend.`}
      />
    </div>
  {/if}
</section>

<style>
  .trends {
    padding: var(--space-5);
  }

  /* Activity on the left, the chart filling the rest behind a divider. */
  .trends.has-chart {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-6);
  }

  .chart {
    min-width: 0;
    border-left: 1px solid var(--val-line);
    padding-left: var(--space-6);
  }

  /* A segmented control built from radio buttons, so arrow keys move
     between ranges the way they do in any radio group. */
  .ranges {
    display: flex;
    gap: 2px;
    margin: 0;
    border: 0;
    border-radius: var(--radius);
    padding: 2px;
    background: var(--val-bg);
  }

  label {
    position: relative;
    display: grid;
    min-width: 2.5rem;
    min-height: 2rem;
    place-items: center;
    border-radius: calc(var(--radius) - 2px);
    padding: 0 var(--space-2);
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }

  label:hover {
    color: var(--val-cream);
  }

  label:has(input:checked) {
    color: var(--val-cream);
    background: var(--val-panel-raised);
  }

  label:has(input:focus-visible) {
    outline: 2px solid var(--val-cream);
    outline-offset: 1px;
  }

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  @media (max-width: 860px) {
    .trends.has-chart {
      grid-template-columns: minmax(0, 1fr);
    }

    .chart {
      border-top: 1px solid var(--val-line);
      border-left: 0;
      padding-top: var(--space-5);
      padding-left: 0;
    }
  }

  @media (max-width: 560px) {
    .trends {
      padding: var(--space-4);
    }

    .ranges {
      width: 100%;
    }

    label {
      flex: 1;
    }
  }
</style>
