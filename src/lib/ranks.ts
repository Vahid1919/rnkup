export type Rank = {
  id: number;
  name: string;
};

const DIVISIONS = [
  { name: 'Iron', color: '#9a9d9a' },
  { name: 'Bronze', color: '#b8956a' },
  { name: 'Silver', color: '#c5cccc' },
  { name: 'Gold', color: '#eccf56' },
  { name: 'Platinum', color: '#59c0cf' },
  { name: 'Diamond', color: '#c79bd8' },
  { name: 'Ascendant', color: '#6ae2af' },
  { name: 'Immortal', color: '#e0597f' },
] as const;

const FIRST_RANKED_TIER = 3;
const RADIANT_TIER = 27;
const UNRANKED_COLOR = '#a9b6c2';
const RADIANT_COLOR = '#ffffaa';

/** Tier artwork set published by valorant-api.com for the current ladder. */
const TIER_ICON_SET = '03621f52-342b-cf4e-4f86-9350a49c6d04';

function divisionIndex(tierId: number): number | null {
  if (
    !Number.isInteger(tierId) ||
    tierId < FIRST_RANKED_TIER ||
    tierId >= RADIANT_TIER
  ) {
    return null;
  }

  return Math.floor((tierId - FIRST_RANKED_TIER) / 3);
}

export function rankName(tierId: number): string {
  if (tierId === RADIANT_TIER) return 'Radiant';

  const index = divisionIndex(tierId);
  if (index === null) return 'Unranked';

  return `${DIVISIONS[index].name} ${((tierId - FIRST_RANKED_TIER) % 3) + 1}`;
}

export function rankColor(tierId: number): string {
  if (tierId === RADIANT_TIER) return RADIANT_COLOR;

  const index = divisionIndex(tierId);
  return index === null ? UNRANKED_COLOR : DIVISIONS[index].color;
}

export function rankIconUrl(tierId: number): string | null {
  if (tierId !== RADIANT_TIER && divisionIndex(tierId) === null) return null;

  return `https://media.valorant-api.com/competitivetiers/${TIER_ICON_SET}/${tierId}/smallicon.png`;
}

export function toRank(tierId: number): Rank {
  return { id: tierId, name: rankName(tierId) };
}

/**
 * Below Immortal every tier spans 100 rating points, so the provider's
 * cumulative rating maps directly onto a tier.
 */
export function rankFromRating(rating: number): Rank {
  const tierId = Math.min(
    Math.max(Math.floor(rating / 100) + FIRST_RANKED_TIER, FIRST_RANKED_TIER),
    RADIANT_TIER - 3,
  );
  return toRank(tierId);
}

/** Average rank of the ranked players in a lobby, or null when none are. */
export function averageRank(ranks: (Rank | null)[]): Rank | null {
  const ranked = ranks.filter(
    (rank): rank is Rank => rank !== null && rank.id >= FIRST_RANKED_TIER,
  );
  if (ranked.length === 0) return null;

  const average = Math.round(
    ranked.reduce((total, rank) => total + rank.id, 0) / ranked.length,
  );
  return toRank(average);
}

const IMMORTAL_RATING = 2100;

/** Describes a cumulative rating as a rank and its rank rating. */
export function formatRating(rating: number): string {
  const rounded = Math.round(rating);
  return rounded >= IMMORTAL_RATING
    ? `Immortal+ · ${rounded - IMMORTAL_RATING} RR`
    : `${rankFromRating(rounded).name} · ${rounded % 100} RR`;
}
