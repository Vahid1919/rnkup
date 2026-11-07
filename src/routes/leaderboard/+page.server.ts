import { error, redirect } from '@sveltejs/kit';
import { type LeaderboardPage, parseLeaderboardQuery } from '$lib/leaderboard';
import {
  fetchLeaderboard,
  lookupErrorStatus,
  PlayerLookupError,
} from '$lib/server/valorant/henrik-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  let leaderboard: LeaderboardPage;
  try {
    leaderboard = await fetchLeaderboard(
      parseLeaderboardQuery(url.searchParams),
    );
  } catch (caughtError) {
    if (caughtError instanceof PlayerLookupError) {
      error(lookupErrorStatus(caughtError.kind), caughtError.message);
    }

    error(502, 'The leaderboard could not be retrieved.');
  }

  // A page past the end, e.g. after switching to the shorter Radiant view.
  if (leaderboard.page > leaderboard.pageCount) {
    const lastPage = new URLSearchParams(url.searchParams);
    lastPage.set('page', String(leaderboard.pageCount));
    redirect(307, `${url.pathname}?${lastPage}`);
  }

  return { leaderboard };
};
