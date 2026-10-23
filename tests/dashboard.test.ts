import { describe, expect, it } from 'vitest';
import {
  buildCompetitivePerformance,
  buildMatchTakeaways,
  STAT_DEFINITIONS,
  type CompetitiveMatchInput,
} from '../src/lib/dashboard';
import { lobbyGap } from '../src/lib/format';

type StatsInput = CompetitiveMatchInput['stats'];

function match(
  overrides: Partial<Omit<CompetitiveMatchInput, 'stats'>> & {
    stats?: Partial<StatsInput>;
  },
): CompetitiveMatchInput {
  const { stats, ...rest } = overrides;
  return {
    id: 'match',
    startedAt: '2026-09-28T10:00:00Z',
    mapName: 'Ascent',
    agentName: 'Jett',
    agentId: null,
    seasonShort: 'e11a5',
    rank: null,
    outcome: 'win',
    score: { won: 13, lost: 9 },
    placement: null,
    sides: null,
    lobby: null,
    ...rest,
    stats: {
      kills: 20,
      deaths: 15,
      assists: 5,
      averageCombatScore: 250,
      averageDamagePerRound: 150,
      damageDeltaPerRound: null,
      headshots: 25,
      bodyshots: 70,
      legshots: 5,
      totalHits: 100,
      headshotPercentage: 25,
      kast: null,
      firstBloods: null,
      firstDeaths: null,
      firstBloodRoundsWon: null,
      firstDeathRoundsWon: null,
      tradedDeaths: null,
      multiKills: null,
      ...stats,
    },
  };
}

const matches: CompetitiveMatchInput[] = [
  match({
    id: 'one',
    stats: { firstBloods: 4, firstDeaths: 2, kast: 80 },
  }),
  match({
    id: 'two',
    startedAt: '2026-09-27T10:00:00Z',
    outcome: 'loss',
    score: { won: 7, lost: 13 },
    stats: {
      kills: 10,
      deaths: 20,
      assists: 10,
      averageCombatScore: 180,
      averageDamagePerRound: 100,
      headshots: 15,
      bodyshots: 80,
      legshots: 5,
      headshotPercentage: 15,
    },
  }),
];

describe('buildCompetitivePerformance', () => {
  it('only counts round-level stats from matches that have round data', () => {
    expect(buildCompetitivePerformance(matches).summary).toMatchObject({
      firstBloods: 4,
      firstDeaths: 2,
      kast: 80,
    });
  });

  it('leaves round-level stats empty when no match has round data', () => {
    expect(buildCompetitivePerformance([matches[1]]).summary).toMatchObject({
      firstBloods: null,
      firstDeaths: null,
      kast: null,
    });
  });

  it('derives per-match KDA for dashboard callers', () => {
    expect(buildCompetitivePerformance(matches).matches).toMatchObject([
      {
        id: 'one',
        stats: {
          averageCombatScore: 250,
          averageDamagePerRound: 150,
          totalHits: 100,
          headshotPercentage: 25,
          killAssistDeathRatio: 1.67,
        },
      },
      {
        id: 'two',
        stats: {
          averageCombatScore: 180,
          averageDamagePerRound: 100,
          totalHits: 100,
          headshotPercentage: 15,
          killAssistDeathRatio: 1,
        },
      },
    ]);
  });

  it('uses one as the KDA denominator when a match has no deaths', () => {
    const undefeatedMatch: CompetitiveMatchInput = {
      ...matches[0],
      stats: { ...matches[0].stats, kills: 12, deaths: 0, assists: 8 },
    };

    expect(
      buildCompetitivePerformance([undefeatedMatch]).matches[0].stats
        .killAssistDeathRatio,
    ).toBe(20);
  });

  it('calculates weighted and per-match competitive metrics', () => {
    expect(buildCompetitivePerformance(matches).summary).toMatchObject({
      matchCount: 2,
      wins: 1,
      losses: 1,
      draws: 0,
      winRate: 50,
      killDeathRatio: 0.86,
      killAssistDeathRatio: 1.29,
      averageCombatScore: 217,
      averageDamagePerRound: 126,
      headshotPercentage: 20,
      averageKills: 15,
      averageDeaths: 17.5,
      averageAssists: 7.5,
      mostPlayedAgent: 'Jett',
      mostPlayedMap: 'Ascent',
    });
  });

  it('charts all-time averages up to each match', () => {
    const history = Array.from({ length: 12 }, (_, index) =>
      match({
        id: `m${index}`,
        startedAt: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
        outcome: index === 0 ? 'win' : 'loss',
      }),
    );

    const points = buildCompetitivePerformance(history).series.winRate;

    expect(points.map((point) => point.value).slice(0, 3)).toEqual([
      100, 50, 33.3,
    ]);
    // A ten-match window would have dropped the first win by now.
    expect(points.at(-1)).toMatchObject({ value: 8.3, windowMatchCount: 12 });
  });

  it('compares the newer half of all loaded matches with the older half', () => {
    const history = Array.from({ length: 100 }, (_, index) =>
      match({ id: `m${index}`, outcome: index < 50 ? 'win' : 'loss' }),
    );

    expect(
      buildCompetitivePerformance(history).trends.find(
        (trend) => trend.stat === 'winRate',
      ),
    ).toMatchObject({ windowSize: 50, recent: 100, previous: 0 });
  });

  it('returns zero metrics for an empty history', () => {
    expect(buildCompetitivePerformance([]).summary).toMatchObject({
      matchCount: 0,
      winRate: 0,
      mostPlayedAgent: null,
      mostPlayedMap: null,
    });
  });
});

describe('coaching insights', () => {
  const history = (count: number, stats: Partial<StatsInput>) =>
    Array.from({ length: count }, (_, index) =>
      match({
        id: `coach-${index}`,
        startedAt: `2026-09-${String(28 - index).padStart(2, '0')}T10:00:00Z`,
        outcome: index % 2 === 0 ? 'win' : 'loss',
        stats,
      }),
    );

  it('holds back coaching until there are enough matches', () => {
    expect(buildCompetitivePerformance(history(3, {})).insights).toMatchObject({
      focus: [],
      strengths: [],
    });
  });

  it('flags a player who keeps dying first', () => {
    const { insights } = buildCompetitivePerformance(
      history(10, { firstBloods: 1, firstDeaths: 5 }),
    );

    expect(insights.focus.map((insight) => insight.id)).toContain(
      'opening-duels',
    );
    expect(insights.strengths.map((insight) => insight.family)).not.toContain(
      'opening',
    );
  });

  it('only blames an agent with enough matches to be sure', () => {
    const pool = (jettLosses: number) =>
      buildCompetitivePerformance([
        ...Array.from({ length: 12 }, (_, index) =>
          match({
            id: `sova-${index}`,
            agentName: 'Sova',
            outcome: index < 8 ? 'win' : 'loss',
          }),
        ),
        ...Array.from({ length: jettLosses }, (_, index) =>
          match({ id: `jett-${index}`, agentName: 'Jett', outcome: 'loss' }),
        ),
      ]).insights.focus.map((insight) => insight.id);

    expect(pool(5)).not.toContain('agent-pool');
    expect(pool(8)).toContain('agent-pool');
  });

  it('only flags a side that is behind the other and losing most rounds', () => {
    const sideIds = (attackWon: number, defenseWon: number) =>
      buildCompetitivePerformance(
        history(10, {}).map((entry) => ({
          ...entry,
          sides: {
            attack: { roundsWon: attackWon, roundsPlayed: 10 },
            defense: { roundsWon: defenseWon, roundsPlayed: 10 },
          },
        })),
      ).insights.focus.map((insight) => insight.id);

    expect(sideIds(5, 6)).not.toContain('weak-attack');
    expect(sideIds(4, 6)).toContain('weak-attack');
  });
});

describe('match takeaways', () => {
  const firstDeathNote = (firstDeathRoundsWon: number) =>
    buildMatchTakeaways(
      match({ stats: { firstDeaths: 6, firstDeathRoundsWon } }),
      null,
    ).find((takeaway) => takeaway.text.startsWith('You died first'))?.text;

  it('mentions rounds won after a first death only when the team lost most', () => {
    expect(firstDeathNote(2)).toContain('your team won only 2 of them');
    expect(firstDeathNote(5)).not.toContain('won');
  });
});

describe('lobby gaps', () => {
  it('colours a gap only when it is at least 5% of the lobby average', () => {
    expect(lobbyGap(69, 70.9, STAT_DEFINITIONS.kast)).toEqual({
      text: '2 pts below your lobby',
      tone: 'even',
    });
    expect(lobbyGap(0.82, 1.02, STAT_DEFINITIONS.killDeathRatio).tone).toBe(
      'bad',
    );
    expect(lobbyGap(22.9, 19.8, STAT_DEFINITIONS.tradedDeathRate).tone).toBe(
      'good',
    );
  });
});
