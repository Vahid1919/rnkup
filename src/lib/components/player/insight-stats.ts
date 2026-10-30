import type { StatKey } from '$lib/dashboard';

/** The stat each coaching insight is about, so its card can explain the stat. */
const INSIGHT_STATS: Partial<Record<string, StatKey>> = {
  'opening-duels': 'firstDuelBalance',
  'opening-wins': 'firstDuelBalance',
  'untraded-deaths': 'tradedDeathRate',
  'tradeable-deaths': 'tradedDeathRate',
  'low-kast': 'kast',
  'high-kast': 'kast',
  'negative-damage-delta': 'damageDeltaPerRound',
  'low-damage': 'averageDamagePerRound',
  'high-damage': 'averageDamagePerRound',
  'low-headshots': 'headshotPercentage',
  'high-headshots': 'headshotPercentage',
};

export function statForInsight(id: string): StatKey | null {
  return INSIGHT_STATS[id] ?? null;
}
