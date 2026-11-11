<script lang="ts">
  import { formatCredits } from '$lib/format';
  import {
    BUY_TYPE_LABELS,
    buyRecords,
    economySwings,
    type MatchDetail,
  } from '$lib/match-detail';

  type Props = {
    match: MatchDetail;
    allyTeamId: string;
    /** Opens the round replay at the given round. */
    onSelectRound: (round: number) => void;
  };

  let { match, allyTeamId, onSelectRound }: Props = $props();

  const columns = $derived(
    match.rounds.map((round) => {
      const ally = round.teams.find((team) => team.teamId === allyTeamId);
      const enemy = round.teams.find((team) => team.teamId !== allyTeamId);
      return {
        number: round.number,
        won: round.winningTeamId === allyTeamId,
        ally: ally?.loadoutValue ?? null,
        allyBuy: ally?.buyType ?? null,
        enemy: enemy?.loadoutValue ?? null,
        enemyBuy: enemy?.buyType ?? null,
      };
    }),
  );

  const scale = $derived(
    Math.max(
      5000,
      Math.ceil(
        Math.max(
          ...columns.flatMap((column) => [column.ally ?? 0, column.enemy ?? 0]),
        ) / 5000,
      ) * 5000,
    ),
  );

  const records = $derived(buyRecords(match, allyTeamId));
  const swings = $derived(economySwings(match, allyTeamId));
  const pistols = $derived(
    match.rounds.filter((round) => round.number === 1 || round.number === 13),
  );
  const pistolsWon = $derived(
    pistols.filter((round) => round.winningTeamId === allyTeamId).length,
  );

  const height = (value: number | null): string =>
    `${value === null ? 0 : Math.max(2, (value / scale) * 100)}%`;

  function columnLabel(column: (typeof columns)[number]): string {
    const describe = (value: number | null, buy: typeof column.allyBuy) =>
      value === null || buy === null
        ? 'unknown'
        : `${BUY_TYPE_LABELS[buy]}, ${formatCredits(value)}`;
    return `Round ${column.number}, ${column.won ? 'won' : 'lost'}. Your team: ${describe(column.ally, column.allyBuy)}. Enemy: ${describe(column.enemy, column.enemyBuy)}. Open the replay.`;
  }

  const roundList = (rounds: number[]): string =>
    `${rounds.length === 1 ? 'Round' : 'Rounds'} ${rounds.join(', ')}`;
</script>

<div class="economy">
  <div class="chart-block">
    <p class="legend" aria-hidden="true">
      <span><span class="key ally"></span> Your team's loadout</span>
      <span><span class="key enemy"></span> Enemy loadout</span>
      <span>Scale up to {formatCredits(scale)}</span>
    </p>
    <ol class="chart">
      {#each columns as column (column.number)}
        <li class:half={column.number === 13}>
          <button
            type="button"
            class="column"
            aria-label={columnLabel(column)}
            title={columnLabel(column)}
            onclick={() => onSelectRound(column.number)}
          >
            <span class="bars" aria-hidden="true">
              <span class="bar ally" style:height={height(column.ally)}></span>
              <span class="bar enemy" style:height={height(column.enemy)}
              ></span>
            </span>
            <span
              class="result"
              class:won={column.won}
              class:lost={!column.won}
              aria-hidden="true"
            >
              {column.won ? 'W' : 'L'}
            </span>
            <span class="number" aria-hidden="true">{column.number}</span>
          </button>
        </li>
      {/each}
    </ol>
  </div>

  <div class="facts">
    <table>
      <caption>Your team's buys</caption>
      <thead>
        <tr>
          <th scope="col">Buy</th>
          <th scope="col" class="num">Rounds</th>
          <th scope="col" class="num">Won</th>
        </tr>
      </thead>
      <tbody>
        {#each records as record (record.buyType)}
          <tr>
            <th scope="row">{BUY_TYPE_LABELS[record.buyType]}</th>
            <td class="num">{record.played}</td>
            <td class="num">
              {record.won}
              <small>{Math.round((record.won / record.played) * 100)}%</small>
            </td>
          </tr>
        {/each}
        {#if pistols.length > 0}
          <tr>
            <th scope="row">Pistol rounds</th>
            <td class="num">{pistols.length}</td>
            <td class="num">
              {pistolsWon}
              <small>{Math.round((pistolsWon / pistols.length) * 100)}%</small>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>

    <dl class="swings">
      <div>
        <dt>Lost with the better buy</dt>
        <dd>
          <span class="count">{swings.lostWithBetterBuy.length}</span>
          {#if swings.lostWithBetterBuy.length > 0}
            <small>{roundList(swings.lostWithBetterBuy)}</small>
          {/if}
        </dd>
      </div>
      <div>
        <dt>Won with the worse buy</dt>
        <dd>
          <span class="count">{swings.wonWithWorseBuy.length}</span>
          {#if swings.wonWithWorseBuy.length > 0}
            <small>{roundList(swings.wonWithWorseBuy)}</small>
          {/if}
        </dd>
      </div>
    </dl>
    <p class="note">
      A better buy means two tiers above the other team, such as a full buy
      against an eco. Losing those rounds costs the most.
    </p>
  </div>
</div>

<style>
  .economy {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
    gap: var(--space-6);
    align-items: start;
  }

  .chart-block {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
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

  .key {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 2px;
  }

  .chart {
    display: grid;
    grid-auto-columns: minmax(1.25rem, 1fr);
    grid-auto-flow: column;
    gap: 2px;
    margin: 0;
    overflow-x: auto;
    padding: 0 0 var(--space-1);
    list-style: none;
  }

  /* A thin gap marks halftime, when the teams swap sides. */
  .chart li.half {
    margin-left: var(--space-3);
  }

  .column {
    display: grid;
    width: 100%;
    gap: var(--space-1);
    justify-items: center;
    border: 0;
    border-radius: var(--radius-sm);
    padding: var(--space-1) 0;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }

  .column:hover {
    background: var(--val-panel-raised);
  }

  .bars {
    display: flex;
    height: 10rem;
    align-items: flex-end;
    gap: 1px;
  }

  .bar {
    width: 0.4rem;
    border-radius: 2px 2px 0 0;
  }

  .ally {
    background: var(--val-cream);
  }

  .enemy {
    background: var(--val-line-strong);
  }

  .result {
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .won {
    color: var(--val-win);
  }

  .lost {
    color: var(--val-loss);
  }

  .number {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
  }

  .facts {
    display: grid;
    gap: var(--space-5);
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
    padding: var(--space-2) var(--space-3) var(--space-2) 0;
    text-align: left;
  }

  thead th {
    color: var(--val-faint);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  tbody th {
    font-weight: 500;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  small {
    margin-left: var(--space-1);
    color: var(--val-faint);
    font-size: var(--text-xs);
  }

  .swings {
    display: grid;
    gap: var(--space-3);
    margin: 0;
  }

  .swings div {
    display: grid;
    gap: var(--space-1);
  }

  .swings dt {
    color: var(--val-faint);
    font-size: var(--text-sm);
  }

  .swings dd {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0;
  }

  .count {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 600;
  }

  .note {
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
    line-height: 1.55;
  }

  @media (max-width: 900px) {
    .economy {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
