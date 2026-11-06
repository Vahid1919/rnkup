import { json } from '@sveltejs/kit';
import {
  fetchPlayerProfile,
  lookupErrorStatus,
  PlayerLookupError,
} from '$lib/server/valorant/henrik-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const profile = await fetchPlayerProfile(params.name, params.tag);
    return json({ data: profile });
  } catch (error) {
    if (error instanceof PlayerLookupError) {
      return json(
        { error: error.message },
        { status: lookupErrorStatus(error.kind) },
      );
    }

    return json(
      { error: 'The player profile could not be retrieved.' },
      { status: 502 },
    );
  }
};
