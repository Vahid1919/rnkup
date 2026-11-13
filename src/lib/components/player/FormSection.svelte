<!-- The stats overview: rank, level, record and key stats from the analysed matches. -->
<script lang="ts">
  import HeadlineStat from '$lib/components/HeadlineStat.svelte';
  import RatingSummary from '$lib/components/player/RatingSummary.svelte';
  import {
    STAT_DEFINITIONS,
    type CompetitiveSummary,
    type Insight,
    type LobbyBenchmarks,
    type PlayerRating,
    type StatKey,
  } from '$lib/dashboard';
  import { formatStat, lobbyGap, type LobbyGap } from '$lib/format';

  type Props = {
    summary: CompetitiveSummary;
    benchmarks: LobbyBenchmarks | null;
    rating: PlayerRating | null;
    level: number | null;
    /** The first thing coaching says to work on, linked from the overview. */
    topFocus: Insight | null;
  };

  type Headline = {
    stat: StatKey;
    /** Null keeps the definition's label, e.g. "ACS" with its expansion. */
    label: string | null;
    value: number | null;
    lobby: number | null;
  };

  type SmallStat = {
    key: string;
    label: string;
    value: string;
    gap: LobbyGap | null;
  };

  const RING_RADIUS = 42;
  const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

  let { summary, benchmarks, rating, level, topFocus }: Props = $props();

  const numberFormat = new Intl.NumberFormat('en-US');

  function count(value: number): string {
    return numberFormat.format(value);
  }

  const playtime = $derived(
    summary.playtimeMs === null
      ? null
      : `${Math.round(summary.playtimeMs / 3_600_000)}h playtime`,
  );

  const ring = $derived.by(() => {
    const total = Math.max(summary.matchCount, 1);
    const win = (summary.wins / total) * RING_LENGTH;
    const loss = (summary.losses / total) * RING_LENGTH;
    return { win, loss };
  });

  const recordLabel = $derived(
    `Won ${formatStat(summary.winRate, STAT_DEFINITIONS.winRate)}: ${summary.wins} wins, ${summary.losses} losses${summary.draws > 0 ? `, ${summary.draws} draws` : ''}`,
  );

  // Most telling first: overall impact, then damage, consistency and trading kills.
  const headlines = $derived<Headline[]>([
    {
      stat: 'averageCombatScore',
      label: null,
      value: summary.averageCombatScore,
      lobby: benchmarks?.averageCombatScore ?? null,
    },
    {
      stat: 'averageDamagePerRound',
      label: 'Damage/Round',
      value: summary.averageDamagePerRound,
      lobby: benchmarks?.averageDamagePerRound ?? null,
    },
    {
      stat: 'kast',
      label: null,
      value: summary.kast,
      lobby: benchmarks?.kast ?? null,
    },
    {
      stat: 'killDeathRatio',
      label: 'K/D Ratio',
      value: summary.killDeathRatio,
      lobby: benchmarks?.killDeathRatio ?? null,
    },
  ]);

  /** Colours a stat that has no lobby average by which side of even it falls. */
  function versusEven(
    value: number,
    even: number,
    margin: number,
    text: string,
  ): LobbyGap {
    const tone =
      value >= even + margin ? 'good' : value <= even - margin ? 'bad' : 'even';
    return { text, tone };
  }

  // What wins and loses fights, in order of how much it explains.
  const smallStats = $derived.by((): SmallStat[] => {
    const { firstBloods, firstDeaths, damageDeltaPerRound, tradedDeathRate } =
      summary;
    const traded = STAT_DEFINITIONS.tradedDeathRate;
    const headshots = STAT_DEFINITIONS.headshotPercentage;
    const duelRatio =
      firstBloods === null || firstDeaths === null || firstDeaths === 0
        ? null
        : firstBloods / firstDeaths;

    return [
      {
        key: 'firstDuels',
        label: 'First kills per first death',
        value: duelRatio === null ? '—' : duelRatio.toFixed(2),
        gap:
          duelRatio === null || firstBloods === null || firstDeaths === null
            ? null
            : versusEven(
                duelRatio,
                1,
                0.05,
                `${firstBloods} kills, ${firstDeaths} deaths`,
              ),
      },
      {
        key: 'damageDelta',
        label: 'Damage delta per round',
        value:
          damageDeltaPerRound === null
            ? '—'
            : formatStat(
                damageDeltaPerRound,
                STAT_DEFINITIONS.damageDeltaPerRound,
              ),
        gap:
          damageDeltaPerRound === null
            ? null
            : versusEven(damageDeltaPerRound, 0, 5, 'Damage dealt minus taken'),
      },
      {
        key: 'traded',
        label: traded.label,
        value:
          tradedDeathRate === null ? '—' : formatStat(tradedDeathRate, traded),
        gap:
          tradedDeathRate !== null && benchmarks?.tradedDeathRate != null
            ? lobbyGap(tradedDeathRate, benchmarks.tradedDeathRate, traded)
            : null,
      },
      {
        key: 'headshots',
        label: 'Headshot %',
        value: formatStat(summary.headshotPercentage, headshots),
        gap:
          benchmarks === null
            ? null
            : lobbyGap(
                summary.headshotPercentage,
                benchmarks.headshotPercentage,
                headshots,
              ),
      },
    ];
  });
</script>

<div class="overview-column">
  <div class="overview-heading">
    <h3 class="column-title">Competitive overview</h3>
    <p class="overview-meta">
      {#if playtime}{playtime} <span aria-hidden="true">//</span>{/if}
      {summary.matchCount} matches
    </p>
  </div>

  <div class="overview panel">
    <div class="top-row">
      {#if level !== null}
        <p class="level">
          <span>Level</span>
          <strong class="display-number">{count(level)}</strong>
        </p>
      {/if}
      <div class="record-ring" role="img" aria-label={recordLabel}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="record-ring-track" cx="50" cy="50" r={RING_RADIUS} />
          <circle
            class="record-ring-loss"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            stroke-dasharray="{ring.loss} {RING_LENGTH}"
            stroke-dashoffset={-ring.win}
          />
          <circle
            class="record-ring-win"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            stroke-dasharray="{ring.win} {RING_LENGTH}"
          />
        </svg>
        <span class="record-ring-text" aria-hidden="true">
          <strong
            >{formatStat(summary.winRate, STAT_DEFINITIONS.winRate)}</strong
          >
          <span>{summary.wins}W {summary.losses}L</span>
        </span>
      </div>
      {#if rating}
        <div class="top-rating">
          <RatingSummary {rating} />
        </div>
      {/if}
    </div>

    <dl class="headline-grid">
      {#each headlines as headline (headline.stat)}
        <HeadlineStat
          stat={headline.stat}
          label={headline.label}
          value={headline.value}
          lobbyValue={headline.lobby}
        />
      {/each}
    </dl>

    <dl class="small-grid">
      {#each smallStats as stat (stat.key)}
        <div
          class="small-stat"
          class:has-bar={stat.gap !== null}
          class:tone-good={stat.gap?.tone === 'good'}
          class:tone-bad={stat.gap?.tone === 'bad'}
        >
          <dt>{stat.label}</dt>
          <dd>
            <span class="value">{stat.value}</span>
            {#if stat.gap}
              <small>{stat.gap.text}</small>
            {/if}
          </dd>
        </div>
      {/each}
    </dl>

    {#if topFocus}
      <a class="focus-link" href="#focus">
        <span class="focus-label">Top focus</span>
        <span class="focus-title">{topFocus.title}</span>
        <span class="focus-arrow" aria-hidden="true">→</span>
      </a>
    {/if}
  </div>
</div>

<style>
  p,
  dl,
  dd {
    margin: 0;
  }

  .column-title {
    margin: 0 0 var(--space-3);
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  /* Competitive overview */
  .overview-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--space-4);
  }

  .overview-meta {
    margin-bottom: var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .overview {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-5);
  }

  /* Level, record and rank share the row in even gaps. */
  .top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4) var(--space-6);
  }

  .level strong {
    font-size: var(--text-display-sm);
  }

  .level {
    display: grid;
    gap: var(--space-1);
  }

  .level span {
    color: var(--val-muted);
    font-size: var(--text-lg);
    font-weight: 500;
  }

  .record-ring {
    position: relative;
    width: 6rem;
    height: 6rem;
    flex-shrink: 0;
  }

  .record-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .record-ring circle {
    fill: none;
    stroke-width: 7;
  }

  .record-ring-track {
    stroke: var(--val-line-strong);
  }

  .record-ring-win {
    stroke: var(--val-win);
  }

  .record-ring-loss {
    stroke: var(--val-loss);
  }

  .record-ring-text {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 500;
    line-height: 1.15;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .record-ring-text strong {
    font-size: var(--text-xl);
    font-weight: 600;
  }

  .record-ring-text span {
    color: var(--val-faint);
    font-family: var(--font-body);
    font-size: var(--text-xs);
  }

  .headline-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .small-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-5) var(--space-3);
    padding: 0 var(--space-1);
  }

  .small-stat {
    --bar: var(--val-line-strong);
    position: relative;
    display: grid;
    align-content: start;
    gap: var(--space-1);
    padding-left: var(--space-4);
  }

  .small-stat.has-bar::before {
    position: absolute;
    top: 0.2rem;
    bottom: 0.2rem;
    left: 0;
    width: 3px;
    border-radius: 2px;
    background: var(--bar);
    content: '';
  }

  .small-stat.tone-good {
    --bar: var(--val-win);
  }

  .small-stat.tone-bad {
    --bar: var(--val-loss);
  }

  .small-stat dt {
    color: var(--val-muted);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .small-stat dd {
    display: grid;
    gap: var(--space-1);
  }

  .value {
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 500;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  small {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
  }

  .tone-good small {
    color: var(--val-win);
  }

  .tone-bad small {
    color: var(--val-loss);
  }

  /* Points down the page to the coaching section. */
  .focus-link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    border: 1px solid var(--val-loss-line);
    border-left: 3px solid var(--val-loss);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
    color: var(--val-cream);
    background: color-mix(in srgb, var(--val-loss) 7%, var(--val-panel));
    text-decoration: none;
    transition: background-color 150ms ease;
  }

  .focus-link:hover {
    background: color-mix(in srgb, var(--val-loss) 14%, var(--val-panel));
  }

  .focus-link:focus-visible {
    outline: 2px solid var(--val-cream);
    outline-offset: 2px;
  }

  .focus-label {
    flex-shrink: 0;
    color: var(--val-loss);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .focus-title {
    font-weight: 600;
  }

  .focus-arrow {
    margin-left: auto;
    color: var(--val-loss);
    transition: transform 150ms ease;
  }

  .focus-link:hover .focus-arrow {
    transform: translateX(3px);
  }

  @media (max-width: 760px) {
    .top-row {
      justify-content: flex-start;
    }

    .top-rating {
      flex-basis: 100%;
    }

    .headline-grid,
    .small-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .overview {
      padding: var(--space-4);
    }

    .level strong {
      font-size: var(--text-2xl);
    }
  }
</style>
