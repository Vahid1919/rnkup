import type { StatDefinition } from './dashboard';

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const dayWithYearFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekdayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDay(value: string): string {
  return dayFormat.format(new Date(value));
}

export function formatDayWithYear(value: string): string {
  return dayWithYearFormat.format(new Date(value));
}

export function formatWeekday(value: string): string {
  return weekdayFormat.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatTime(value: string): string {
  return timeFormat.format(new Date(value));
}

/** A stable key for the calendar day of a timestamp in the viewer's zone. */
export function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** A signed number with a typographic minus, e.g. "+12" or "−0.4". */
export function formatSigned(value: number, decimals = 0): string {
  const text = Math.abs(value).toFixed(decimals);
  if (Number(text) === 0) return text;
  return value > 0 ? `+${text}` : `\u2212${text}`;
}

export type LobbyGap = {
  /** e.g. "0.06 above your lobby" or "4 pts below your lobby". */
  text: string;
  /** Whether the gap helps or hurts; gaps under MEANINGFUL_GAP are "even". */
  tone: 'good' | 'bad' | 'even';
};

/**
 * A lobby gap is coloured only when it is at least this share of the lobby
 * average, so every stat uses the same rule: 5% of the lobby's K/D, ADR or
 * KAST alike.
 */
export const MEANINGFUL_GAP = 0.05;

/** Percentages show as whole numbers everywhere; other stats keep theirs. */
function displayDecimals(definition: StatDefinition): number {
  return definition.unit === '%' ? 0 : definition.decimals;
}

export function lobbyGap(
  value: number,
  lobby: number,
  definition: StatDefinition,
): LobbyGap {
  const difference = value - lobby;
  // The size of the gap as it is displayed; "0.00" means there is none to show.
  const size = Math.abs(difference).toFixed(displayDecimals(definition));
  const isLevel = Number(size) === 0;
  const meaningful =
    !isLevel && Math.abs(difference) >= Math.abs(lobby) * MEANINGFUL_GAP;
  const tone = !meaningful
    ? 'even'
    : difference > 0 !== definition.lowerIsBetter
      ? 'good'
      : 'bad';
  return {
    text: isLevel
      ? 'Even with your lobby'
      : `${size}${definition.unit === '%' ? ' pts' : ''} ${difference > 0 ? 'above' : 'below'} your lobby`,
    tone,
  };
}

export function formatStat(value: number, definition: StatDefinition): string {
  const decimals = displayDecimals(definition);
  const text = definition.signed
    ? formatSigned(value, decimals)
    : value.toFixed(decimals);
  return `${text}${definition.unit}`;
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}m ${String(totalSeconds % 60).padStart(2, '0')}s`;
}

/** Time into a round as m:ss. */
export function formatRoundClock(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function ordinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

/** Placement by combat score among the players of a match. */
/** Turns the provider's season code, such as "e11a6", into a label. */
export function formatSeason(seasonShort: string | null): string {
  if (seasonShort === null) return 'Unknown act';

  const match = /^e(\d+)a(\d+)$/i.exec(seasonShort);
  return match
    ? `Episode ${match[1]} · Act ${match[2]}`
    : seasonShort.toUpperCase();
}

export function formatCredits(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
