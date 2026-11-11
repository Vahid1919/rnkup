import { error } from '@sveltejs/kit';
import type { PlayerDashboard } from '$lib/dashboard';
import {
  fetchPlayerDashboard,
  fetchPlayerProfile,
  getCachedPlayerDashboard,
  lookupErrorStatus,
  PlayerLookupError,
} from '$lib/server/valorant/henrik-client';
import type { PageServerLoad } from './$types';

type DashboardResult =
  | { ok: true; dashboard: PlayerDashboard }
  | { ok: false; message: string };

/** Settles to a result so a failed stream reaches the page as a message. */
async function settleDashboard(
  dashboard: Promise<PlayerDashboard>,
): Promise<DashboardResult> {
  try {
    return { ok: true, dashboard: await dashboard };
  } catch (caughtError) {
    return {
      ok: false,
      message:
        caughtError instanceof PlayerLookupError
          ? caughtError.message
          : 'The player dashboard could not be retrieved.',
    };
  }
}

export const load: PageServerLoad = async ({ params }) => {
  const cached = getCachedPlayerDashboard(params.name, params.tag);
  if (cached) {
    const result: DashboardResult = { ok: true, dashboard: cached };
    return { profile: cached.profile, dashboard: result };
  }

  try {
    // Only the profile is awaited, so the header renders while the match
    // history streams in. Bad or unknown Riot IDs still get a real 400/404.
    const profile = await fetchPlayerProfile(params.name, params.tag);
    return {
      profile,
      // Reuses the profile cached by the call above.
      dashboard: settleDashboard(fetchPlayerDashboard(params.name, params.tag)),
    };
  } catch (caughtError) {
    if (caughtError instanceof PlayerLookupError) {
      error(lookupErrorStatus(caughtError.kind), caughtError.message);
    }

    error(502, 'The player profile could not be retrieved.');
  }
};
