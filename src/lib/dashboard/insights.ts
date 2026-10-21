import type { AgentRole } from '../agents';
import { RELIABLE_SAMPLE_MATCHES } from './breakdowns';
import type {
  BreakdownRow,
  CompetitiveMatchInput,
  CompetitiveSummary,
  FormTrend,
  LobbyBenchmarks,
  SessionSplit,
  SideSplit,
  StatKey,
  WinDriver,
} from './types';

/**
 * Rule-based coaching. Every insight is derived from the player's own
 * matches: what the number is, why it matters for their results, and what to
 * change next game. Rules are deliberately conservative about sample size.
 */

export type InsightFamily =
  | 'opening'
  | 'trading'
  | 'impact'
  | 'firepower'
  | 'aim'
  | 'side'
  | 'map'
  | 'agent'
  | 'stamina'
  | 'form';

export type Insight = {
  id: string;
  family: InsightFamily;
  tone: 'focus' | 'strength';
  title: string;
  metricLabel: string;
  metricValue: string;
  comparison: string | null;
  why: string;
  /** How the player's own win rate moves with this stat, when measurable. */
  evidence: string | null;
  actions: string[];
  priority: number;
};

export type InsightReport = {
  focus: Insight[];
  strengths: Insight[];
  /** Explains why coaching is limited, or null when the sample is enough. */
  sampleNote: string | null;
};

export type InsightContext = {
  summary: CompetitiveSummary;
  benchmarks: LobbyBenchmarks | null;
  trends: FormTrend[];
  breakdowns: { agents: BreakdownRow[]; maps: BreakdownRow[] };
  sides: SideSplit | null;
  sessions: SessionSplit | null;
  drivers: WinDriver[];
};

export const MINIMUM_COACHING_MATCHES = 8;
const MAXIMUM_FOCUS = 3;
const MAXIMUM_STRENGTHS = 3;
const MINIMUM_EVIDENCE_GAP = 15;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function whole(value: number): string {
  return String(Math.round(value));
}

function signed(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return rounded < 0 ? `\u2212${-rounded}` : '0';
}

/** A plain gap to the lobby average, e.g. "4 pts below your lobby". */
function versusLobby(value: number, lobby: number, unit: '%' | ''): string {
  const gap = Math.round(value - lobby);
  if (gap === 0) return 'Even with your lobby';
  return `${Math.abs(gap)}${unit === '%' ? ' pts' : ''} ${gap > 0 ? 'above' : 'below'} your lobby`;
}

function driverFor(drivers: WinDriver[], stat: StatKey): WinDriver | null {
  return drivers.find((driver) => driver.stat === stat) ?? null;
}

function driverGap(drivers: WinDriver[], stat: StatKey): number {
  return Math.max(driverFor(drivers, stat)?.gap ?? 0, 0);
}

function evidenceFor(
  drivers: WinDriver[],
  stat: StatKey,
  describeGood: (threshold: number) => string,
): string | null {
  const driver = driverFor(drivers, stat);
  if (!driver || driver.gap < MINIMUM_EVIDENCE_GAP) return null;

  return `You win ${driver.goodWinRate}% of your games ${describeGood(driver.threshold)} and ${driver.badWinRate}% of the rest.`;
}

function priorityOf(base: number, severity: number, gap: number): number {
  return Math.round(base + clamp(severity) * 40 + Math.min(gap, 60) * 0.5);
}

const OPENING_ACTIONS: Record<AgentRole | 'default', string[]> = {
  Duelist: [
    'Stop dry peeking. Go in behind a flash, a smoke or your dash, every time.',
    'Call your entry before you go, so a teammate is already set up to trade you.',
    'On defense, take one early fight from an off-angle, then get out.',
  ],
  Initiator: [
    'Flash or recon before anyone peeks. That includes you.',
    'Your duelist takes first contact. You are the second player through.',
    'On defense, get early information with utility, not with your body.',
  ],
  Controller: [
    'Smoke first, then let a teammate take first contact. You go second.',
    'You are worth more alive. Your smokes win the late round.',
    'On defense, hold from a spot you can leave after the first shot.',
  ],
  Sentinel: [
    'Your utility takes first contact. Your body does not.',
    'Hold an off-angle with a way out, not the default spot everyone clears.',
    'After the first fight, fall back to your setup. Do not re-peek.',
  ],
  default: [
    'Never take the first fight alone and dry. Use utility or bring a teammate.',
    'Call where you are peeking, so the trade is ready before you swing.',
    'On defense, play spots you can escape from after first contact.',
  ],
};

function openingInsight(context: InsightContext): Insight | null {
  const { summary, drivers } = context;
  const { firstBloods, firstDeaths } = summary;
  if (
    firstBloods === null ||
    firstDeaths === null ||
    summary.roundCount === 0
  ) {
    return null;
  }
  if (
    firstDeaths < 10 ||
    firstDeaths < firstBloods + Math.max(4, firstBloods * 0.15)
  ) {
    return null;
  }

  const firstDeathShare = whole((firstDeaths / summary.roundCount) * 100);
  const firstKillShare = whole((firstBloods / summary.roundCount) * 100);
  const impact =
    summary.firstBloodRoundWinRate !== null &&
    summary.firstDeathRoundWinRate !== null
      ? `Your team wins ${summary.firstBloodRoundWinRate}% of rounds when you get the first kill and ${summary.firstDeathRoundWinRate}% when you die first.`
      : 'Dying first puts your team in a 4v5 before the round has started.';
  const advice =
    summary.mostPlayedRole === 'Duelist'
      ? 'You are the entry, so you will die first sometimes. Make sure it happens behind utility, with a teammate ready to trade.'
      : 'Turn a few of these into first kills, or into deaths your team can trade, and you win more rounds.';
  const why = `${impact} ${advice}`;

  // Lead with the ratio, which reads the same however many rounds were
  // played; 1.0 is an even opening record.
  const metric =
    firstBloods === 0
      ? {
          metricLabel: 'First kills',
          metricValue: '0',
          comparison: `You die first in ${firstDeathShare}% of rounds and never get the first kill.`,
        }
      : {
          metricLabel: 'First deaths per first kill',
          metricValue: (firstDeaths / firstBloods).toFixed(1),
          comparison: `You die first in ${firstDeathShare}% of rounds and get the first kill in ${firstKillShare}%. Even is 1.0.`,
        };

  return {
    id: 'opening-duels',
    family: 'opening',
    tone: 'focus',
    title: 'You die first too often',
    ...metric,
    why,
    evidence: evidenceFor(
      drivers,
      'firstDuelBalance',
      () => 'where you get more first kills than first deaths',
    ),
    actions: OPENING_ACTIONS[summary.mostPlayedRole ?? 'default'],
    priority: priorityOf(
      34,
      (firstDeaths - firstBloods) / firstDeaths / 0.4,
      driverGap(drivers, 'firstDuelBalance'),
    ),
  };
}

function tradingInsight(context: InsightContext): Insight | null {
  const { summary, benchmarks, drivers } = context;
  const rate = summary.tradedDeathRate;
  if (rate === null || summary.matchCount === 0) return null;

  const lobbyRate = benchmarks?.tradedDeathRate ?? null;
  const belowLobby = lobbyRate !== null && rate <= lobbyRate - 4;
  if (!belowLobby && rate >= 20) return null;

  return {
    id: 'untraded-deaths',
    family: 'trading',
    tone: 'focus',
    title: 'You are dying where nobody can trade you',
    metricLabel: 'Traded deaths',
    metricValue: `${whole(rate)}%`,
    comparison: lobbyRate === null ? null : versusLobby(rate, lobbyRate, '%'),
    why: 'An untraded death leaves your team a player down for the rest of the round. This is a positioning problem, not an aim problem. You are fighting a step too far from your nearest teammate.',
    evidence: evidenceFor(
      drivers,
      'tradedDeathRate',
      (threshold) =>
        `where more than ${whole(threshold)}% of your deaths are traded`,
    ),
    actions: [
      'Fight close enough to a teammate that they can swing the moment you die.',
      'Call the angle before you peek it, so someone can follow up.',
      'When you are alone, take information and fall back. Do not commit.',
    ],
    priority: priorityOf(
      30,
      lobbyRate === null ? (20 - rate) / 10 : (lobbyRate - rate) / 12,
      driverGap(drivers, 'tradedDeathRate'),
    ),
  };
}

function impactInsight(context: InsightContext): Insight | null {
  const { summary, benchmarks, drivers } = context;
  const candidates: Insight[] = [];

  if (summary.kast !== null) {
    const lobbyKast = benchmarks?.kast ?? null;
    const belowLobby = lobbyKast !== null && summary.kast <= lobbyKast - 2;
    if (belowLobby || summary.kast < 68) {
      candidates.push({
        id: 'low-kast',
        family: 'impact',
        tone: 'focus',
        title: 'You are missing from too many rounds',
        metricLabel: 'KAST',
        metricValue: `${whole(summary.kast)}%`,
        comparison:
          lobbyKast === null ? null : versusLobby(summary.kast, lobbyKast, '%'),
        why: 'KAST counts the rounds where you got a kill, got an assist, survived or were traded. You do not need more kills to raise it. Utility that sets up a teammate counts, and so does saving when the round is lost.',
        evidence: evidenceFor(
          drivers,
          'kast',
          (threshold) => `where your KAST is above ${whole(threshold)}%`,
        ),
        actions: [
          'If the fight looks bad, skip it and use your utility for a teammate. The assist counts.',
          'After a kill, move. Do not re-peek the same angle.',
          'When the round is lost, save. You keep your gun for the next one.',
        ],
        priority: priorityOf(
          30,
          lobbyKast === null
            ? (68 - summary.kast) / 10
            : (lobbyKast - summary.kast) / 8,
          driverGap(drivers, 'kast'),
        ),
      });
    }
  }

  if (
    summary.damageDeltaPerRound !== null &&
    summary.damageDeltaPerRound <= -10
  ) {
    candidates.push({
      id: 'negative-damage-delta',
      family: 'impact',
      tone: 'focus',
      title: 'You take more damage than you deal',
      metricLabel: 'Damage delta',
      metricValue: signed(summary.damageDeltaPerRound),
      comparison: `You take ${whole(-summary.damageDeltaPerRound)} more damage than you deal every round. Even is 0.`,
      why: 'You lose more exchanges than you win. That usually comes from the fights you pick, not your aim. You peek players who are already set, or you fight with no support.',
      evidence: evidenceFor(
        drivers,
        'damageDeltaPerRound',
        (threshold) => `where your damage delta is above ${signed(threshold)}`,
      ),
      actions: [
        'Only take fights where you have an edge. That means an off-angle, a teammate next to you, or utility on the enemy.',
        'Stop re-peeking players who already know where you are.',
        'When you get tagged, break line of sight and reset before you fight again.',
      ],
      priority: priorityOf(
        28,
        -summary.damageDeltaPerRound / 40,
        driverGap(drivers, 'damageDeltaPerRound'),
      ),
    });
  }

  return (
    candidates.sort((first, second) => second.priority - first.priority)[0] ??
    null
  );
}

function firepowerInsight(context: InsightContext): Insight | null {
  const { summary, benchmarks, drivers } = context;
  if (!benchmarks || benchmarks.averageDamagePerRound === 0) return null;

  const ratio =
    summary.averageDamagePerRound / benchmarks.averageDamagePerRound;
  if (ratio >= 0.9) return null;

  return {
    id: 'low-damage',
    family: 'firepower',
    tone: 'focus',
    title: 'You deal less damage than your lobby',
    metricLabel: 'ADR',
    metricValue: whole(summary.averageDamagePerRound),
    comparison: versusLobby(
      summary.averageDamagePerRound,
      benchmarks.averageDamagePerRound,
      '',
    ),
    why: 'Damage matters even when you do not get the kill, because the next fight is against a weaker player. Right now your teammates are fighting enemies at full health.',
    evidence: evidenceFor(
      drivers,
      'averageDamagePerRound',
      (threshold) =>
        `where you deal more than ${whole(threshold)} damage per round`,
    ),
    actions: [
      'Throw your damage utility at the common spots on every execute and every retake.',
      'Commit to the fights you start. Do not back off after one bullet.',
      'Play a short deathmatch before ranked, so your first rounds are not your warmup.',
    ],
    priority: priorityOf(
      22,
      (1 - ratio) / 0.25,
      driverGap(drivers, 'averageDamagePerRound'),
    ),
  };
}

function aimInsight(context: InsightContext): Insight | null {
  const { summary, benchmarks, drivers } = context;
  if (!benchmarks) return null;

  const deficit = benchmarks.headshotPercentage - summary.headshotPercentage;
  if (deficit < 4) return null;

  const gap = driverGap(drivers, 'headshotPercentage');
  return {
    id: 'low-headshots',
    family: 'aim',
    tone: 'focus',
    title: 'Your headshot rate is behind your lobby',
    metricLabel: 'HS%',
    metricValue: `${whole(summary.headshotPercentage)}%`,
    comparison: versusLobby(
      summary.headshotPercentage,
      benchmarks.headshotPercentage,
      '%',
    ),
    why: 'Players in your lobby land more headshots than you. That is usually crosshair placement, which means where your crosshair sits before the fight starts.',
    evidence:
      evidenceFor(
        drivers,
        'headshotPercentage',
        (threshold) => `where your headshot rate is above ${whole(threshold)}%`,
      ) ??
      'Your win rate barely moves with this stat, so build it slowly and fix the other things first.',
    actions: [
      'Keep your crosshair at head height on the next angle while you move. You should never have to flick up.',
      'Tap or burst at range. Do not spray.',
      'Warm up with first-bullet accuracy only. One tap, reset, repeat.',
    ],
    priority: priorityOf(12, deficit / 10, gap),
  };
}

const SIDE_ACTIONS = {
  attack: [
    'Spend the first 20 to 30 seconds taking map control. Pick a site once you know something.',
    'Hit the site together behind one piece of utility. Do not trickle in.',
    'After the plant, hold a crossfire on the spike. Stop hunting for kills.',
  ],
  defense: [
    'Do not die early for free. Hold with a teammate, or from an angle you can back out of.',
    'When a site is lost, fall back and retake together. Do not fight it alone.',
    'Use utility to delay the push. Every second you buy lets a rotation arrive.',
  ],
} as const;

const SIDE_GAP_POINTS = 6;
const SIDE_LOSING_RATE = 47;

function sideInsight(context: InsightContext): Insight | null {
  const { sides } = context;
  if (
    !sides ||
    sides.attack.roundsPlayed < 60 ||
    sides.defense.roundsPlayed < 60
  ) {
    return null;
  }

  const gap = Math.abs(sides.attack.winRate - sides.defense.winRate);
  const weaker =
    sides.attack.winRate < sides.defense.winRate ? 'attack' : 'defense';
  const stronger = weaker === 'attack' ? 'defense' : 'attack';
  // A few points between sides is normal. Only flag a side that is both
  // clearly behind the other and clearly losing more rounds than it wins.
  if (gap < SIDE_GAP_POINTS || sides[weaker].winRate > SIDE_LOSING_RATE) {
    return null;
  }

  const weakerLabel = weaker === 'attack' ? 'Attack' : 'Defense';

  return {
    id: `weak-${weaker}`,
    family: 'side',
    tone: 'focus',
    title:
      gap >= 12
        ? `Your ${weaker} side is losing you games`
        : `Your ${weaker} is weaker than your ${stronger}`,
    metricLabel: `${weakerLabel} rounds won`,
    metricValue: `${whole(sides[weaker].winRate)}%`,
    comparison: `${whole(sides[stronger].winRate)}% on ${stronger}`,
    why: `You win ${whole(sides[weaker].winRate)}% of ${weaker} rounds and ${whole(sides[stronger].winRate)}% on ${stronger}. Some gap between sides is normal. This one is big enough that closing part of it adds rounds every game.`,
    evidence: null,
    actions: [...SIDE_ACTIONS[weaker]],
    priority: priorityOf(30, gap / 14, 0),
  };
}

function mapInsight(context: InsightContext): Insight | null {
  const { summary, breakdowns } = context;
  const sampled = breakdowns.maps.filter(
    (row) => row.matches >= RELIABLE_SAMPLE_MATCHES,
  );
  if (sampled.length < 2) return null;

  const worst = [...sampled].sort(
    (first, second) => first.winRate - second.winRate,
  )[0];
  const best = [...sampled].sort(
    (first, second) => second.winRate - first.winRate,
  )[0];
  const deficit = summary.winRate - worst.winRate;
  if (deficit < 12) return null;

  return {
    id: 'weak-map',
    family: 'map',
    tone: 'focus',
    title: `${worst.name} is your worst map`,
    metricLabel: `Win rate on ${worst.name}`,
    metricValue: `${whole(worst.winRate)}%`,
    comparison: `${worst.wins} wins in ${worst.matches} games · ${whole(summary.winRate)}% overall`,
    why: `It is your weakest map with enough games to judge, and it is ${whole((worst.matches / summary.matchCount) * 100)}% of your matches. A plan for this one map is worth more than general practice.`,
    evidence: null,
    actions: [
      `VOD one ${worst.name} loss and write down why you died each time.`,
      `Learn one default setup and one retake plan per site for your main agent on ${worst.name}.`,
      `Your best map is ${best.name} (${whole(best.winRate)}%). Work out what you do differently there.`,
    ],
    priority: priorityOf(26, deficit / 30, 0),
  };
}

function agentInsight(context: InsightContext): Insight | null {
  const { summary, breakdowns } = context;
  const best = [...breakdowns.agents]
    .filter((row) => row.matches >= RELIABLE_SAMPLE_MATCHES)
    .sort((first, second) => second.winRate - first.winRate)[0];
  const weak = breakdowns.agents
    .filter(
      (row) =>
        row.matches >= RELIABLE_SAMPLE_MATCHES &&
        row.name !== best?.name &&
        (row.winRate <= 30 || row.winRate <= summary.winRate - 20),
    )
    .sort((first, second) => first.winRate - second.winRate);
  if (!best || weak.length === 0 || best.winRate < summary.winRate) {
    return null;
  }

  const worst = weak[0];
  const winCount = (wins: number): string =>
    `${wins} ${wins === 1 ? 'win' : 'wins'}`;
  const weakNames = weak
    .slice(0, 2)
    .map((row) => `${row.name} ${whole(row.winRate)}% over ${row.matches}`)
    .join(', ');

  return {
    id: 'agent-pool',
    family: 'agent',
    tone: 'focus',
    title: 'Your agent pool is costing you games',
    metricLabel: worst.name,
    metricValue: `${winCount(worst.wins)} in ${worst.matches}`,
    comparison: `${best.name} wins ${whole(best.winRate)}%`,
    why: `Your results change with the agent you lock. ${best.name} wins ${whole(best.winRate)}% over ${best.matches} matches. Compare that with ${weakNames}. Playing what already works gets you more consistent ranked games.`,
    evidence: null,
    actions: [
      `Lock ${best.name} whenever the comp allows it.`,
      `Play ${worst.name} in unrated before you bring it back to ranked.`,
      'Stick to two or three agents, so you run the same setups every game.',
    ],
    priority: priorityOf(28, (best.winRate - worst.winRate) / 60, 0),
  };
}

function staminaInsight(context: InsightContext): Insight | null {
  const { sessions } = context;
  if (!sessions || sessions.early.matches < 8 || sessions.late.matches < 8) {
    return null;
  }

  const drop = sessions.early.winRate - sessions.late.winRate;
  if (drop < 12) return null;

  return {
    id: 'long-sessions',
    family: 'stamina',
    tone: 'focus',
    title: 'You play worse the longer you queue',
    metricLabel: 'Win rate from the third game of a session',
    metricValue: `${whole(sessions.late.winRate)}%`,
    comparison: `${whole(sessions.early.winRate)}% in your first two games`,
    why: 'You win less from the third game of a session onwards. Tilt and fatigue build up, so decide when you stop before you start. That protects the RR your first games earned.',
    evidence: null,
    actions: [
      'Set a stop rule before you queue. Three games, or two losses in a row, then you are done.',
      'Take ten minutes away from the screen between games.',
      'If you want to keep playing, switch to unrated or deathmatch.',
    ],
    priority: priorityOf(24, drop / 30, 0),
  };
}

function strengthInsights(context: InsightContext): Insight[] {
  const { summary, benchmarks, breakdowns, trends } = context;
  const strengths: Insight[] = [];
  const strength = (
    insight: Omit<Insight, 'tone' | 'evidence' | 'actions'> & {
      keep: string | null;
    },
  ): void => {
    const { keep, ...rest } = insight;
    strengths.push({
      ...rest,
      tone: 'strength',
      evidence: null,
      actions: keep === null ? [] : [keep],
    });
  };

  if (
    summary.firstBloods !== null &&
    summary.firstDeaths !== null &&
    summary.firstBloods >= 10 &&
    summary.firstBloods >= summary.firstDeaths * 1.15
  ) {
    strength({
      id: 'opening-wins',
      family: 'opening',
      title: 'You win the opening duel',
      metricLabel: 'First kills',
      metricValue: String(summary.firstBloods),
      comparison: `vs ${summary.firstDeaths} first deaths`,
      why: 'You start more rounds a player up than a player down.',
      keep: 'Keep taking the first fight, and call it so your team can follow.',
      priority: 60,
    });
  }

  if (benchmarks) {
    if (summary.kast !== null && benchmarks.kast !== null) {
      const lead = summary.kast - benchmarks.kast;
      if (lead >= 2) {
        strength({
          id: 'high-kast',
          family: 'impact',
          title: 'You show up in most rounds',
          metricLabel: 'KAST',
          metricValue: `${whole(summary.kast)}%`,
          comparison: versusLobby(summary.kast, benchmarks.kast, '%'),
          why: 'You are involved in more rounds than the players around you.',
          keep: 'Keep playing for the round, not the highlight.',
          priority: 50 + lead * 2,
        });
      }
    }

    if (
      summary.tradedDeathRate !== null &&
      benchmarks.tradedDeathRate !== null &&
      summary.tradedDeathRate >= benchmarks.tradedDeathRate + 4
    ) {
      strength({
        id: 'tradeable-deaths',
        family: 'trading',
        title: 'Your deaths get traded',
        metricLabel: 'Traded deaths',
        metricValue: `${whole(summary.tradedDeathRate)}%`,
        comparison: versusLobby(
          summary.tradedDeathRate,
          benchmarks.tradedDeathRate,
          '%',
        ),
        why: 'You die close to teammates, so your team rarely falls a player behind.',
        keep: 'Keep fighting within reach of a teammate.',
        priority: 46,
      });
    }

    if (
      benchmarks.averageDamagePerRound > 0 &&
      summary.averageDamagePerRound >= benchmarks.averageDamagePerRound * 1.08
    ) {
      strength({
        id: 'high-damage',
        family: 'firepower',
        title: 'You out-damage your lobby',
        metricLabel: 'ADR',
        metricValue: whole(summary.averageDamagePerRound),
        comparison: versusLobby(
          summary.averageDamagePerRound,
          benchmarks.averageDamagePerRound,
          '',
        ),
        why: 'You do more damage than the average player in your matches.',
        keep: 'Make that damage count. Play near someone who can finish the kill.',
        priority: 48,
      });
    }

    if (summary.headshotPercentage >= benchmarks.headshotPercentage + 4) {
      strength({
        id: 'high-headshots',
        family: 'aim',
        title: 'You out-aim your lobby',
        metricLabel: 'HS%',
        metricValue: `${whole(summary.headshotPercentage)}%`,
        comparison: versusLobby(
          summary.headshotPercentage,
          benchmarks.headshotPercentage,
          '%',
        ),
        why: 'Your crosshair placement wins fights faster than your opponents can.',
        keep: 'Aim is not what holds you back. Your decisions are where the RR is.',
        priority: 40,
      });
    }
  }

  const bestAgent = [...breakdowns.agents]
    .filter(
      (row) =>
        row.matches >= RELIABLE_SAMPLE_MATCHES &&
        row.winRate >= summary.winRate + 10,
    )
    .sort((first, second) => second.winRate - first.winRate)[0];
  if (bestAgent) {
    strength({
      id: 'best-agent',
      family: 'agent',
      title: `${bestAgent.name} is your best pick`,
      metricLabel: `Win rate on ${bestAgent.name}`,
      metricValue: `${whole(bestAgent.winRate)}%`,
      comparison: `${bestAgent.wins} wins in ${bestAgent.matches} games · ${whole(summary.winRate)}% overall`,
      why: `You win clearly more often on ${bestAgent.name} than on your other agents.`,
      keep: `Lock ${bestAgent.name} when the game matters.`,
      priority: 55,
    });
  }

  const bestMap = [...breakdowns.maps]
    .filter(
      (row) =>
        row.matches >= RELIABLE_SAMPLE_MATCHES &&
        row.winRate >= summary.winRate + 10,
    )
    .sort((first, second) => second.winRate - first.winRate)[0];
  if (bestMap) {
    strength({
      id: 'best-map',
      family: 'map',
      title: `${bestMap.name} is your map`,
      metricLabel: `Win rate on ${bestMap.name}`,
      metricValue: `${whole(bestMap.winRate)}%`,
      comparison: `${bestMap.wins} wins in ${bestMap.matches} games`,
      why: 'Your setups and habits on this map are working.',
      keep: 'Take the same defaults and timings to your weaker maps.',
      priority: 42,
    });
  }

  const winTrend = trends.find((trend) => trend.stat === 'winRate');
  if (winTrend && winTrend.direction === 'improving' && winTrend.delta >= 10) {
    strength({
      id: 'improving-form',
      family: 'form',
      title: 'You are winning more than you were',
      metricLabel: `Win rate, last ${winTrend.windowSize} matches`,
      metricValue: `${whole(winTrend.recent)}%`,
      comparison: `${whole(winTrend.previous)}% in the ${winTrend.windowSize} before`,
      why: 'You win more often now than in your earlier matches.',
      keep: null,
      priority: 52,
    });
  }

  return strengths
    .sort((first, second) => second.priority - first.priority)
    .slice(0, MAXIMUM_STRENGTHS);
}

export function buildInsights(context: InsightContext): InsightReport {
  if (context.summary.matchCount < MINIMUM_COACHING_MATCHES) {
    return {
      focus: [],
      strengths: [],
      sampleNote:
        context.summary.matchCount === 0
          ? null
          : `Not enough games to coach from yet. We need ${MINIMUM_COACHING_MATCHES} ranked matches and this account has ${context.summary.matchCount}.`,
    };
  }

  const candidates = [
    openingInsight(context),
    tradingInsight(context),
    impactInsight(context),
    firepowerInsight(context),
    aimInsight(context),
    sideInsight(context),
    mapInsight(context),
    agentInsight(context),
    staminaInsight(context),
  ]
    .filter((insight): insight is Insight => insight !== null)
    .sort((first, second) => second.priority - first.priority);

  const strengths = strengthInsights(context);
  const focus = candidates.slice(0, MAXIMUM_FOCUS);
  const focusFamilies = new Set(focus.map((insight) => insight.family));

  return {
    focus,
    // A strength in the same area as a focus item would contradict it.
    strengths: strengths.filter(
      (insight) => !focusFamilies.has(insight.family),
    ),
    sampleNote: null,
  };
}

export type MatchTakeaway = {
  tone: 'good' | 'bad' | 'neutral';
  text: string;
};

const ORDINALS = ['', '1st', '2nd', '3rd'];

function ordinal(value: number): string {
  return ORDINALS[value] ?? `${value}th`;
}

/**
 * Plain-language notes on one match for one player, compared with their
 * recent averages when those are known.
 */
export function buildMatchTakeaways(
  match: CompetitiveMatchInput,
  baseline: CompetitiveSummary | null,
): MatchTakeaway[] {
  const takeaways: (MatchTakeaway & { weight: number })[] = [];
  const { stats } = match;
  const rounds = match.score.won + match.score.lost;

  if (match.placement === 1) {
    takeaways.push({
      tone: 'good',
      text: 'Match MVP. You had the highest combat score of all ten players.',
      weight: 90,
    });
  } else if (match.placement !== null && match.placement >= 9) {
    takeaways.push({
      tone: 'bad',
      text: `You finished ${ordinal(match.placement)} of 10 by combat score. You were not a factor in this one.`,
      weight: 60,
    });
  }

  if (stats.firstDeaths !== null && stats.firstDeaths >= 4) {
    const won = stats.firstDeathRoundsWon;
    // Only mention the rescue rate when it makes the point, not when the team
    // bailed the player out of most of those rounds.
    const lostMost = won !== null && won < stats.firstDeaths / 2;
    takeaways.push({
      tone: 'bad',
      text: `You died first in ${stats.firstDeaths} of ${rounds} rounds${lostMost ? `, and your team won only ${won} of them` : ''}. VOD those rounds. It is usually the same mistake every time.`,
      weight: 70 + stats.firstDeaths,
    });
  }

  if (stats.firstBloods !== null && stats.firstBloods >= 4) {
    const won = stats.firstBloodRoundsWon;
    takeaways.push({
      tone: 'good',
      text: `You got the first kill in ${stats.firstBloods} rounds${won === null ? '' : `, and your team converted ${won} of them`}.`,
      weight: 60 + stats.firstBloods,
    });
  }

  if (stats.kast !== null) {
    const average = baseline?.kast ?? null;
    if (average !== null && Math.abs(stats.kast - average) >= 8) {
      const above = stats.kast > average;
      takeaways.push({
        tone: above ? 'good' : 'bad',
        text: `KAST ${whole(stats.kast)}%, ${whole(Math.abs(stats.kast - average))} points ${above ? 'above' : 'below'} your recent average of ${whole(average)}%.`,
        weight: 50 + Math.abs(stats.kast - average),
      });
    } else if (average === null && stats.kast < 60) {
      takeaways.push({
        tone: 'bad',
        text: `KAST ${whole(stats.kast)}%. You had no kill, assist, survival or trade in ${whole(rounds * (1 - stats.kast / 100))} rounds.`,
        weight: 55,
      });
    }
  }

  if (stats.tradedDeaths !== null && stats.deaths >= 10) {
    const rate = (stats.tradedDeaths / stats.deaths) * 100;
    if (rate < 15) {
      takeaways.push({
        tone: 'bad',
        text: `Only ${stats.tradedDeaths} of your ${stats.deaths} deaths were traded. You were dying where nobody could help you.`,
        weight: 58,
      });
    } else if (rate >= 40) {
      takeaways.push({
        tone: 'good',
        text: `${stats.tradedDeaths} of your ${stats.deaths} deaths were traded, so your team rarely fell behind when you went down.`,
        weight: 40,
      });
    }
  }

  if (stats.damageDeltaPerRound !== null) {
    // Spell out both sides of the delta: next to a low ADR, a large negative
    // delta alone reads like a mistake.
    const dealt = Math.round(stats.averageDamagePerRound);
    const taken = Math.round(
      stats.averageDamagePerRound - stats.damageDeltaPerRound,
    );
    if (stats.damageDeltaPerRound <= -40) {
      takeaways.push({
        tone: 'bad',
        text: `You dealt ${dealt} damage a round and took ${taken}. You lost most of your fights.`,
        weight: 45 - stats.damageDeltaPerRound / 4,
      });
    } else if (stats.damageDeltaPerRound >= 40) {
      takeaways.push({
        tone: 'good',
        text: `You dealt ${dealt} damage a round and took ${taken}. You won your fights comfortably.`,
        weight: 45 + stats.damageDeltaPerRound / 4,
      });
    }
  }

  if (stats.multiKills !== null && stats.multiKills >= 3) {
    takeaways.push({
      tone: 'good',
      text: `${stats.multiKills} rounds with three or more kills.`,
      weight: 50,
    });
  }

  if (match.sides) {
    const { attack, defense } = match.sides;
    if (attack.roundsPlayed >= 4 && defense.roundsPlayed >= 4) {
      const attackRate = attack.roundsWon / attack.roundsPlayed;
      const defenseRate = defense.roundsWon / defense.roundsPlayed;
      if (Math.abs(attackRate - defenseRate) >= 0.35) {
        const weaker = attackRate < defenseRate ? 'attack' : 'defense';
        const weak = weaker === 'attack' ? attack : defense;
        const strong = weaker === 'attack' ? defense : attack;
        takeaways.push({
          tone: 'neutral',
          text: `Your ${weaker} half was the weak one. You won ${weak.roundsWon} of ${weak.roundsPlayed} rounds there and ${strong.roundsWon} of ${strong.roundsPlayed} on the other side.`,
          weight: 48,
        });
      }
    }
  }

  return takeaways
    .sort((first, second) => second.weight - first.weight)
    .slice(0, 4)
    .map(({ tone, text }) => ({ tone, text }));
}
