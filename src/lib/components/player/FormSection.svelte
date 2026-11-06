<!-- The stats overview: record, four headline stats against the lobby, then the rest. -->
<script lang="ts">
  import HeadlineStat from '$lib/components/HeadlineStat.svelte';
  import {
    STAT_DEFINITIONS,
    type CompetitiveSummary,
    type LobbyBenchmarks,
  } from '$lib/dashboard';
  import { formatStat, lobbyGap, type LobbyGap } from '$lib/format';

  type Props = {
    summary: CompetitiveSummary;
    benchmarks: LobbyBenchmarks | null;
    /** Every match the provider has stored, not just the analysed sample. */
    storedCount: number;
  };

  type LobbyStat =
    | 'kast'
    | 'killDeathRatio'
    | 'averageDamagePerRound'
    | 'averageCombatScore'
    | 'headshotPercentage';

  type SecondaryStat = {
    key: string;
    label: string;
    /** Expansion for abbreviated labels. */
    title: string | null;
    value: string;
    gap: LobbyGap | null;
    note: string | null;
  };

  const HEADLINE_STATS: LobbyStat[] = [
    'killDeathRatio',
    'averageDamagePerRound',
    'headshotPercentage',
    'kast',
  ];

  let { summary, benchmarks, storedCount }: Props = $props();

  const record = $derived(
    [
      { key: 'win', label: 'W', name: 'wins', count: summary.wins },
      { key: 'loss', label: 'L', name: 'losses', count: summary.losses },
      { key: 'draw', label: 'D', name: 'draws', count: summary.draws },
    ].filter((part) => part.count > 0),
  );
  const sampleLine = $derived(
    storedCount > summary.matchCount
      ? `From your last ${summary.matchCount} ranked matches (${storedCount} on record).`
      : `From your ${summary.matchCount} ranked matches on record.`,
  );

  function lobbyValue(stat: LobbyStat): number | null {
    return benchmarks?.[stat] ?? null;
  }

  function count(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  const secondaryStats = $derived.by((): SecondaryStat[] => {
    const acs = STAT_DEFINITIONS.averageCombatScore;
    const acsLobby = lobbyValue('averageCombatScore');
    const traded = STAT_DEFINITIONS.tradedDeathRate;
    const tradedLobby = benchmarks?.tradedDeathRate ?? null;

    return [
      {
        key: 'averageCombatScore',
        label: acs.label,
        title: acs.description,
        value: formatStat(summary.averageCombatScore, acs),
        gap:
          acsLobby === null
            ? null
            : lobbyGap(summary.averageCombatScore, acsLobby, acs),
        note: null,
      },
      {
        key: 'damageDeltaPerRound',
        label: STAT_DEFINITIONS.damageDeltaPerRound.label,
        title: null,
        value:
          summary.damageDeltaPerRound === null
            ? '—'
            : formatStat(
                summary.damageDeltaPerRound,
                STAT_DEFINITIONS.damageDeltaPerRound,
              ),
        gap: null,
        note: 'Dealt minus taken, per round',
      },
      {
        key: 'tradedDeathRate',
        label: traded.label,
        title: null,
        value:
          summary.tradedDeathRate === null
            ? '—'
            : formatStat(summary.tradedDeathRate, traded),
        gap:
          summary.tradedDeathRate !== null && tradedLobby !== null
            ? lobbyGap(summary.tradedDeathRate, tradedLobby, traded)
            : null,
        note: null,
      },
      {
        key: 'kda',
        label: 'K/D/A',
        title: 'Kills, deaths and assists',
        value: `${summary.averageKills} / ${summary.averageDeaths} / ${summary.averageAssists}`,
        gap: null,
        note: 'Average per match',
      },
      {
        key: 'firstKills',
        label: 'First kills',
        title: null,
        value: count(summary.firstBloods),
        gap: null,
        note:
          summary.firstBloodRoundWinRate === null
            ? null
            : `${summary.firstBloodRoundWinRate}% of those rounds won`,
      },
      {
        key: 'firstDeaths',
        label: 'First deaths',
        title: null,
        value: count(summary.firstDeaths),
        gap: null,
        note:
          summary.firstDeathRoundWinRate === null
            ? null
            : `${summary.firstDeathRoundWinRate}% of those rounds won`,
      },
      {
        key: 'multiKills',
        label: 'Multi-kill rounds',
        title: null,
        value: count(summary.multiKills),
        gap: null,
        note: 'Three or more kills',
      },
      {
        key: 'placement',
        label: 'Average placement',
        title: null,
        value:
          summary.averagePlacement === null
            ? '—'
            : summary.averagePlacement.toFixed(1),
        gap: null,
        note: 'Of 10, by ACS',
      },
    ];
  });
</script>

<div class="overview panel">
  <div class="record">
    <p class="win-rate">
      <span class="stat-label">{STAT_DEFINITIONS.winRate.label}</span>
      <strong class="display-number">
        {formatStat(summary.winRate, STAT_DEFINITIONS.winRate)}
      </strong>
    </p>
    <div class="split">
      <!-- The bar repeats the counts beside it, so it is hidden from readers. -->
      <div class="bar" aria-hidden="true">
        {#each record as part (part.key)}
          <span class={part.key} style:flex-grow={part.count}></span>
        {/each}
      </div>
      <ul class="counts">
        {#each record as part (part.key)}
          <li>
            <span class="dot {part.key}" aria-hidden="true"></span>
            {part.count}<abbr title={part.name}>{part.label}</abbr>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <dl class="headline-grid">
    {#each HEADLINE_STATS as stat (stat)}
      <HeadlineStat
        {stat}
        value={summary[stat]}
        lobbyValue={lobbyValue(stat)}
      />
    {/each}
  </dl>

  <dl class="secondary-grid">
    {#each secondaryStats as stat (stat.key)}
      <div>
        <dt class="stat-label">
          {#if stat.title}
            <abbr title={stat.title}>{stat.label}</abbr>
          {:else}
            {stat.label}
          {/if}
        </dt>
        <dd>
          <span class="value">{stat.value}</span>
          {#if stat.gap}
            <small
              class:tone-good={stat.gap.tone === 'good'}
              class:tone-bad={stat.gap.tone === 'bad'}>{stat.gap.text}</small
            >
          {:else if stat.note}
            <small>{stat.note}</small>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
</div>

<p class="hint">
  {sampleLine}
  {#if benchmarks}
    "Your lobby" is the average of the other nine players in those matches.
  {/if}
  KAST: {STAT_DEFINITIONS.kast.description}
</p>

<style>
  dl,
  dd {
    margin: 0;
  }

  .overview {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-5);
  }

  .record {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4) var(--space-6);
  }

  .win-rate {
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  .win-rate strong {
    font-size: var(--text-display-sm);
  }

  .split {
    display: grid;
    min-width: min(100%, 14rem);
    flex: 1;
    gap: var(--space-2);
  }

  /* Segments sized by count, with a gap of panel colour between them. */
  .bar {
    display: flex;
    height: 0.5rem;
    gap: 2px;
  }

  .bar span {
    min-width: 0.25rem;
    flex-basis: 0;
    border-radius: 2px;
  }

  .win {
    background: var(--val-win);
  }

  .loss {
    background: var(--val-loss);
  }

  .draw {
    background: var(--val-line-strong);
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    margin: 0;
    padding: 0;
    color: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    list-style: none;
  }

  .counts li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .counts abbr {
    margin-left: calc(-1 * var(--space-1));
    color: var(--val-faint);
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .headline-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .secondary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-5) var(--space-3);
    padding: 0 var(--space-4) var(--space-1);
  }

  .secondary-grid > div {
    display: grid;
    align-content: start;
    gap: var(--space-1);
  }

  .secondary-grid dd {
    display: grid;
    gap: var(--space-1);
  }

  .value {
    font-size: var(--text-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  small {
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  small.tone-good {
    color: var(--val-win);
  }

  small.tone-bad {
    color: var(--val-loss);
  }

  .hint {
    max-width: 48rem;
    margin: var(--space-3) 0 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  @media (max-width: 760px) {
    .headline-grid,
    .secondary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .overview {
      padding: var(--space-4);
    }

    .secondary-grid {
      padding-inline: var(--space-3);
    }
  }
</style>
