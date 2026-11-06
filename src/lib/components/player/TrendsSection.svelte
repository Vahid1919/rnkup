<!-- Rank rating over time. Nothing renders when the provider has no rating history. -->
<script lang="ts">
  import TrendChart, {
    type TrendChartPoint,
  } from '$lib/components/TrendChart.svelte';
  import type { RatingPoint } from '$lib/dashboard';
  import { formatDayWithYear, formatSigned } from '$lib/format';
  import { formatRating, rankFromRating } from '$lib/ranks';

  type Props = {
    ratingHistory: RatingPoint[];
  };

  let { ratingHistory }: Props = $props();

  const monthFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const ratingPoints = $derived(
    ratingHistory.map(
      (point): TrendChartPoint => ({
        label: formatDayWithYear(point.date),
        value: point.rating,
        detail: `${formatSigned(point.change)} RR`,
      }),
    ),
  );

  const hasRatingChart = $derived(ratingPoints.length >= 2);
  const span = $derived.by(() => {
    if (ratingHistory.length === 0) return '';
    const first = monthFormat.format(new Date(ratingHistory[0].date));
    const last = monthFormat.format(
      new Date(ratingHistory[ratingHistory.length - 1].date),
    );
    return first === last ? first : `${first} – ${last}`;
  });
  const ratingTicks = $derived.by(() => {
    if (ratingHistory.length === 0) return null;
    const values = ratingHistory.map((point) => point.rating);
    const low = Math.floor(Math.min(...values) / 100) * 100;
    const high = Math.ceil(Math.max(...values) / 100) * 100;
    const step = (high - low) / 100 > 7 ? 300 : 100;
    const ticks: number[] = [];
    for (let tick = low; tick <= high; tick += step) ticks.push(tick);
    return ticks;
  });
</script>

{#if hasRatingChart}
  <div class="trends panel">
    <TrendChart
      title="Rank rating"
      description={span}
      points={ratingPoints}
      formatValue={formatRating}
      tickValues={ratingTicks}
      formatTick={(value) => rankFromRating(value).name}
      wideAxis
    />
  </div>
{/if}

<style>
  .trends {
    margin-top: var(--space-5);
    padding: var(--space-5);
  }

  @media (max-width: 560px) {
    .trends {
      padding: var(--space-4);
    }
  }
</style>
