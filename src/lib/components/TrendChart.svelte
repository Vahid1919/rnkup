<script lang="ts">
  import { area, line, scaleLinear } from 'd3';

  export type TrendChartPoint = {
    /** Short label for the x position, usually a date. */
    label: string;
    value: number;
    detail?: string;
  };

  type Props = {
    title: string;
    description: string;
    points: TrendChartPoint[];
    formatValue?: (value: number) => string;
    /** Fixed y-axis ticks; when omitted they are chosen from the data. */
    tickValues?: number[] | null;
    formatTick?: (value: number) => string;
    /** Extra room for long y-axis labels such as rank names. */
    wideAxis?: boolean;
    /** Plot height in pixels; the width follows the container. */
    height?: number;
  };

  let {
    title,
    description,
    points,
    formatValue = (value: number) => String(value),
    tickValues = null,
    formatTick,
    wideAxis = false,
    height = 220,
  }: Props = $props();

  // Drawn at the container's pixel width so axis text keeps its size on phones.
  let plotWidth = $state(720);
  const width = $derived(Math.max(plotWidth, 280));
  const padding = $derived({
    top: 12,
    right: 8,
    bottom: 28,
    left: wideAxis ? 92 : 44,
  });

  let hoveredIndex = $state<number | null>(null);
  let focused = $state(false);
  let keyboardIndex = $state<number | null>(null);
  let pinnedIndex = $state<number | null>(null);
  const gradientId = $props.id();

  const hasTrend = $derived(points.length >= 2);
  const lastIndex = $derived(points.length - 1);
  const activeIndex = $derived(
    hoveredIndex ??
      pinnedIndex ??
      (focused ? (keyboardIndex ?? lastIndex) : null),
  );
  const shownIndex = $derived(activeIndex ?? lastIndex);
  const shownPoint = $derived(points[shownIndex]);

  const yScale = $derived.by(() => {
    const values = points.map((point) => point.value);
    if (tickValues) values.push(...tickValues);

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const spread = maximum - minimum || Math.abs(maximum) || 1;
    const scale = scaleLinear()
      .domain([minimum - spread * 0.08, maximum + spread * 0.08])
      .range([height - padding.bottom, padding.top]);
    return tickValues ? scale : scale.nice(4);
  });
  const ticks = $derived(tickValues ?? yScale.ticks(4));
  const xOf = $derived((index: number): number =>
    lastIndex <= 0
      ? padding.left
      : padding.left +
        (index / lastIndex) * (width - padding.left - padding.right),
  );

  const linePath = $derived(
    line<TrendChartPoint>()
      .x((_point, index) => xOf(index))
      .y((point) => yScale(point.value))(points) ?? '',
  );
  const areaPath = $derived(
    area<TrendChartPoint>()
      .x((_point, index) => xOf(index))
      .y0(height - padding.bottom)
      .y1((point) => yScale(point.value))(points) ?? '',
  );
  const xLabels = $derived(
    [0, Math.floor(lastIndex / 2), lastIndex].filter(
      (index, position, indexes) =>
        index >= 0 && indexes.indexOf(index) === position,
    ),
  );

  const summary = $derived.by(() => {
    if (!hasTrend) return '';
    const values = points.map((point) => point.value);
    return `${title} across ${points.length} points. Starts at ${formatValue(values[0])}, ends at ${formatValue(values[lastIndex])}. Lowest ${formatValue(Math.min(...values))}, highest ${formatValue(Math.max(...values))}.`;
  });

  // The shown point carries its own label: the latest value at rest, or the
  // hovered, tapped or keyboard-selected point with its date. It sits beside
  // the point where it crosses the least of the line; when every spot there
  // is crowded, it moves to a clear corner of the plot.
  const pointLabel = $derived.by(() => {
    if (!shownPoint) return null;
    const x = xOf(shownIndex);
    const y = yScale(shownPoint.value);
    const toLeft = x > (padding.left + width - padding.right) / 2;
    const value = formatValue(shownPoint.value);
    const detail =
      activeIndex === null
        ? null
        : `${shownPoint.label}${shownPoint.detail ? ` · ${shownPoint.detail}` : ''}`;
    const labelWidth = Math.max(value.length, detail?.length ?? 0) * 7.5 + 10;
    const labelHeight = detail ? 34 : 16;
    const plotRight = width - padding.right;
    const plotBottom = height - padding.bottom;

    type Spot = { x: number; anchor: 'start' | 'end'; top: number };

    // Line segments, plus the marker itself, that a label box would cover.
    const crossings = ({ x: textX, anchor, top }: Spot): number => {
      const left = anchor === 'end' ? textX - labelWidth : textX;
      const right = anchor === 'end' ? textX : textX + labelWidth;
      const bottom = top + labelHeight;
      const segments = points.slice(1).filter((point, index) => {
        const startY = yScale(points[index].value);
        const endY = yScale(point.value);
        return (
          xOf(index + 1) >= left &&
          xOf(index) <= right &&
          Math.max(startY, endY) >= top &&
          Math.min(startY, endY) <= bottom
        );
      }).length;
      const coversMarker =
        x >= left - 6 && x <= right + 6 && y >= top - 6 && y <= bottom + 6;
      return segments + (coversMarker ? 10 : 0);
    };

    const fits = ({ x: textX, anchor, top }: Spot): boolean =>
      top >= 0 &&
      top + labelHeight <= plotBottom &&
      (anchor === 'end'
        ? textX - labelWidth >= padding.left
        : textX + labelWidth <= plotRight);

    const anchor = toLeft ? 'end' : 'start';
    const beside = [10, 40].flatMap((offset) =>
      [y - 6 - labelHeight, y + 8, y - 24 - labelHeight, y + 26].map(
        (top): Spot => ({ x: toLeft ? x - offset : x + offset, anchor, top }),
      ),
    );
    const corners: Spot[] = [
      { x: plotRight - 4, anchor: 'end', top: padding.top },
      { x: plotRight - 4, anchor: 'end', top: plotBottom - labelHeight - 4 },
      { x: padding.left + 4, anchor: 'start', top: padding.top },
      {
        x: padding.left + 4,
        anchor: 'start',
        top: plotBottom - labelHeight - 4,
      },
    ];
    const spots = [...beside, ...corners].filter(fits);
    const spot = spots.find((candidate) => crossings(candidate) === 0) ??
      spots.reduce<Spot | null>(
        (best, candidate) =>
          best === null || crossings(candidate) < crossings(best)
            ? candidate
            : best,
        null,
      ) ?? { x: toLeft ? x - 10 : x + 10, anchor, top: y - 6 - labelHeight };

    return {
      x: spot.x,
      y: spot.top + 12,
      anchor: spot.anchor,
      value,
      detail,
    };
  });

  function describe(point: TrendChartPoint): string {
    return `${point.label}: ${formatValue(point.value)}${point.detail ? `, ${point.detail}` : ''}`;
  }

  function indexAt(event: PointerEvent): number {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = (x - padding.left) / (width - padding.left - padding.right);
    return Math.min(Math.max(Math.round(ratio * lastIndex), 0), lastIndex);
  }

  // A mouse shows the point under it while hovering. A tap (or a sideways
  // drag) pins the point instead, so it stays after the finger lifts, until
  // the next tap or until the chart loses focus.
  function handlePointer(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      hoveredIndex = indexAt(event);
    } else if (event.type === 'pointerdown' || event.buttons > 0) {
      pinnedIndex = indexAt(event);
    }
  }

  function handlePointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') hoveredIndex = null;
  }

  function handleKey(event: KeyboardEvent): void {
    const current = keyboardIndex ?? lastIndex;
    const step = event.shiftKey ? 5 : 1;
    let next: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    hoveredIndex = null;
    pinnedIndex = null;
    keyboardIndex = Math.min(Math.max(next, 0), lastIndex);
  }
</script>

<figure class="chart-card">
  <div class="chart-heading">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>

  {#if hasTrend && shownPoint}
    <div
      class="plot"
      bind:clientWidth={plotWidth}
      role="slider"
      tabindex="0"
      aria-label={`${title}: step through points with the arrow keys`}
      aria-valuemin={1}
      aria-valuemax={points.length}
      aria-valuenow={shownIndex + 1}
      aria-valuetext={describe(shownPoint)}
      onpointerdown={handlePointer}
      onpointermove={handlePointer}
      onpointerleave={handlePointerLeave}
      onfocus={() => (focused = true)}
      onblur={() => {
        focused = false;
        keyboardIndex = null;
        pinnedIndex = null;
      }}
      onkeydown={handleKey}
    >
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {#each ticks as tick (tick)}
          <line
            class="grid"
            x1={padding.left}
            x2={width - padding.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
          <text
            class="axis"
            x={padding.left - 8}
            y={yScale(tick) + 4}
            text-anchor="end"
          >
            {formatTick ? formatTick(tick) : formatValue(tick)}
          </text>
        {/each}

        {#each xLabels as index (index)}
          <text
            class="axis x-axis"
            x={xOf(index)}
            y={height - 8}
            text-anchor={index === 0
              ? 'start'
              : index === lastIndex
                ? 'end'
                : 'middle'}
          >
            {points[index].label}
          </text>
        {/each}

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.16" />
            <stop offset="1" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="area" d={areaPath} fill={`url(#${gradientId})`} />

        <path class="trend" d={linePath} pathLength="1" />

        {#if activeIndex !== null}
          <line
            class="cursor"
            x1={xOf(activeIndex)}
            x2={xOf(activeIndex)}
            y1={padding.top}
            y2={height - padding.bottom}
          />
        {/if}
        <circle
          class="marker"
          class:ringed={shownIndex !== lastIndex}
          cx={xOf(shownIndex)}
          cy={yScale(shownPoint.value)}
          r={shownIndex === lastIndex ? 3.5 : 4.5}
        />
        {#if pointLabel}
          <text
            class="point-label"
            x={pointLabel.x}
            y={pointLabel.y}
            text-anchor={pointLabel.anchor}
          >
            {#if pointLabel.detail}
              <tspan class="point-detail">{pointLabel.detail}</tspan>
              <tspan x={pointLabel.x} dy="1.25em">{pointLabel.value}</tspan>
            {:else}
              {pointLabel.value}
            {/if}
          </text>
        {/if}
      </svg>
    </div>
    <figcaption class="sr-only">{summary}</figcaption>
  {:else}
    <p class="empty-chart">Not enough matches to draw a trend yet.</p>
  {/if}
</figure>

<style>
  .chart-card {
    min-width: 0;
    margin: 0;
  }

  .chart-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-1) var(--space-3);
  }

  h3 {
    margin: 0;
    color: var(--val-cream);
    font-size: var(--text-md);
    font-weight: 600;
  }

  .chart-heading p,
  .empty-chart {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .plot {
    margin-top: var(--space-4);
    cursor: crosshair;
    touch-action: pan-y;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    font-family: var(--font-body);
  }

  .grid {
    stroke: var(--val-line);
  }

  .axis {
    fill: var(--val-faint);
    font-size: var(--text-xs);
  }

  /* The gradient under the line takes its colour from here. */
  .area {
    color: var(--val-cream);
  }

  .trend {
    fill: none;
    stroke: var(--val-cream);
    stroke-width: 1.75;
    stroke-linejoin: round;
    animation: draw-line 800ms ease-out backwards;
  }

  .point-label {
    fill: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    paint-order: stroke;
    stroke: var(--val-panel);
    stroke-width: 4px;
    stroke-linejoin: round;
  }

  .point-detail {
    fill: var(--val-muted);
    font-size: var(--text-xs);
    font-weight: 400;
  }

  .cursor {
    stroke: var(--val-cream);
    stroke-width: 1;
    opacity: 0.35;
  }

  /* The end dot joins the line; mid-line dots need a ring to stand out. */
  .marker {
    fill: var(--val-cream);
  }

  .marker.ringed {
    stroke: var(--val-panel);
    stroke-width: 2;
  }

  .empty-chart {
    display: grid;
    min-height: 8rem;
    align-items: center;
  }

  /* The dash pattern exists only while drawing; left in place, it can stop a
     pixel or two short of the end marker. */
  @keyframes draw-line {
    from {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
    }

    to {
      stroke-dasharray: 1;
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .trend {
      animation: none;
    }
  }
</style>
