import { error } from '@sveltejs/kit';
import { buildMatchTakeaways, summarizeMatchForPlayer } from '$lib/dashboard';
import {
  fetchPlayerMatch,
  getCachedPlayerDashboard,
  lookupErrorStatus,
  PlayerLookupError,
} from '$lib/server/valorant/henrik-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const { profile, match } = await fetchPlayerMatch(
      params.name,
      params.tag,
      params.matchId,
    );
    const playerMatch = summarizeMatchForPlayer(match, profile.puuid);
    if (!playerMatch) {
      error(404, 'This player did not play in that match.');
    }

    // Recent averages are only used when the dashboard is already cached, so
    // opening a match never triggers a full history lookup.
    const dashboard = getCachedPlayerDashboard(params.name, params.tag);
    const baseline = dashboard?.summary ?? null;
    const logEntry =
      dashboard?.matchLog.find((entry) => entry.id === match.id) ?? null;

    return {
      profile,
      match,
      playerMatch,
      baseline:
        baseline && baseline.matchCount > 0
          ? {
              matchCount: baseline.matchCount,
              averageCombatScore: baseline.averageCombatScore,
              averageDamagePerRound: baseline.averageDamagePerRound,
              killDeathRatio: baseline.killDeathRatio,
              kast: baseline.kast,
              headshotPercentage: baseline.headshotPercentage,
              damageDeltaPerRound: baseline.damageDeltaPerRound,
            }
          : null,
      ratingChange: logEntry?.ratingChange ?? null,
      takeaways: buildMatchTakeaways(playerMatch, baseline),
    };
  } catch (caughtError) {
    if (caughtError instanceof PlayerLookupError) {
      error(lookupErrorStatus(caughtError.kind), caughtError.message);
    }

    throw caughtError;
  }
};
