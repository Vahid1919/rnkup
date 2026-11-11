import { isHttpError } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDashboard } from '../src/lib/dashboard';
import {
  fetchPlayerDashboard,
  fetchPlayerProfile,
  getCachedPlayerDashboard,
  PlayerLookupError,
} from '../src/lib/server/valorant/henrik-client';
import { load } from '../src/routes/players/[name]/[tag]/+page.server';

vi.mock('../src/lib/server/valorant/henrik-client', async (importActual) => ({
  ...(await importActual<
    typeof import('../src/lib/server/valorant/henrik-client')
  >()),
  fetchPlayerDashboard: vi.fn(),
  fetchPlayerProfile: vi.fn(),
  getCachedPlayerDashboard: vi.fn(),
}));

const profile = {
  puuid: 'player-id',
  riotId: { name: 'Player Name', tag: 'EUW' },
  region: 'eu',
  accountLevel: 42,
  card: { id: 'card-id', small: '', large: '', wide: '' },
  lastUpdatedAt: '10 minutes ago',
};
const dashboard = { profile } as PlayerDashboard;

function loadPlayer() {
  return load({
    params: { name: 'Player Name', tag: 'EUW' },
  } as Parameters<typeof load>[0]);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCachedPlayerDashboard).mockReturnValue(null);
  vi.mocked(fetchPlayerProfile).mockResolvedValue(profile);
});

describe('player page load', () => {
  it('returns the profile without waiting for the match history', async () => {
    let finish: (value: PlayerDashboard) => void = () => {};
    vi.mocked(fetchPlayerDashboard).mockReturnValue(
      new Promise((resolve) => (finish = resolve)),
    );

    const data = await loadPlayer();

    expect(data?.profile).toBe(profile);
    finish(dashboard);
    await expect(data?.dashboard).resolves.toEqual({ ok: true, dashboard });
  });

  it('serves a cached dashboard without streaming or lookups', async () => {
    vi.mocked(getCachedPlayerDashboard).mockReturnValue(dashboard);

    const data = await loadPlayer();

    expect(data?.dashboard).toEqual({ ok: true, dashboard });
    expect(fetchPlayerProfile).not.toHaveBeenCalled();
  });

  it('streams a failed match history as a message', async () => {
    vi.mocked(fetchPlayerDashboard).mockRejectedValue(
      new PlayerLookupError('rate-limited', 'Try again in a minute.'),
    );

    const data = await loadPlayer();

    await expect(data?.dashboard).resolves.toEqual({
      ok: false,
      message: 'Try again in a minute.',
    });
  });

  it('still answers 404 for an unknown Riot ID', async () => {
    vi.mocked(fetchPlayerProfile).mockRejectedValue(
      new PlayerLookupError('not-found', 'No Valorant account matches.'),
    );

    const failure: unknown = await Promise.resolve(loadPlayer()).catch(
      (error: unknown) => error,
    );

    expect(isHttpError(failure, 404)).toBe(true);
    expect(fetchPlayerDashboard).not.toHaveBeenCalled();
  });
});
