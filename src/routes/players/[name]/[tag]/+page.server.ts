import { error } from '@sveltejs/kit';
import {
  fetchPlayerDashboard,
  lookupErrorStatus,
  PlayerLookupError,
} from '$lib/server/valorant/henrik-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    return { dashboard: await fetchPlayerDashboard(params.name, params.tag) };
  } catch (caughtError) {
    if (caughtError instanceof PlayerLookupError) {
      error(lookupErrorStatus(caughtError.kind), caughtError.message);
    }

    error(502, 'The player dashboard could not be retrieved.');
  }
};
