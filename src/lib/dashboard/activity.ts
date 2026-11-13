/**
 * When a player plays: a calendar of recent days, built from the match log.
 * Days are calendar days in the viewer's time zone, so callers pass `today`.
 * The match log is capped, so days before its oldest match count as unknown.
 */

import type {
  ActivityDay,
  ActivityMetric,
  ActivityReport,
  MatchLogEntry,
} from './types';

/** Thirteen calendar weeks (a quarter), Sunday first, ending this week. */
export const ACTIVITY_WEEKS = 13;

/** Where each K/D and win-rate shade starts, above the lowest. */
const KILL_DEATH_STEPS = [0.8, 1, 1.2];
const WIN_RATE_STEPS = [40, 50, 60];

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildActivity(
  entries: MatchLogEntry[],
  today: Date,
): ActivityReport {
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const firstDay = addDays(
    startOfToday,
    -startOfToday.getDay() - (ACTIVITY_WEEKS - 1) * 7,
  );
  const todayKey = localDate(startOfToday);

  const byDate = new Map<string, MatchLogEntry[]>();
  for (const entry of entries) {
    const key = localDate(new Date(entry.startedAt));
    const group = byDate.get(key) ?? [];
    group.push(entry);
    byDate.set(key, group);
  }
  // Before the oldest stored match there is no record either way, so those
  // days are left out rather than counted as days off.
  const firstKnownKey = [...byDate.keys()].sort()[0] ?? '';

  const weeks: ActivityDay[][] = [];
  let dayCount = 0;
  let activeDays = 0;
  let busiestDay = 0;

  for (let week = 0; week < ACTIVITY_WEEKS; week += 1) {
    const column: ActivityDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = localDate(addDays(firstDay, week * 7 + weekday));
      const inRange = date >= firstKnownKey && date <= todayKey;
      const played = inRange ? (byDate.get(date) ?? []) : [];
      const wins = played.filter((entry) => entry.outcome === 'win').length;
      const losses = played.filter((entry) => entry.outcome === 'loss').length;

      column.push({
        date,
        inRange,
        future: date > todayKey,
        matches: played.length,
        wins,
        losses,
        draws: played.length - wins - losses,
        kills: played.reduce((total, entry) => total + entry.kills, 0),
        deaths: played.reduce((total, entry) => total + entry.deaths, 0),
      });

      if (!inRange) continue;
      dayCount += 1;
      busiestDay = Math.max(busiestDay, played.length);
      if (played.length > 0) activeDays += 1;
    }
    weeks.push(column);
  }

  return { weeks, dayCount, activeDays, busiestDay };
}

/** K/D across one day's matches; a deathless day counts its kills. */
export function dayKillDeath(day: ActivityDay): number {
  return day.kills / Math.max(day.deaths, 1);
}

export function dayWinRate(day: ActivityDay): number {
  return day.matches === 0 ? 0 : (day.wins / day.matches) * 100;
}

function stepLevel(value: number, steps: number[]): number {
  return 1 + steps.filter((step) => value >= step).length;
}

/** How strongly to shade a day: 0 with no matches, otherwise 1 to 4. */
export function activityLevel(
  day: ActivityDay,
  metric: ActivityMetric,
  busiestDay: number,
): number {
  if (day.matches === 0) return 0;
  if (metric === 'killDeath')
    return stepLevel(dayKillDeath(day), KILL_DEATH_STEPS);
  if (metric === 'winRate') return stepLevel(dayWinRate(day), WIN_RATE_STEPS);
  return Math.max(1, Math.ceil((day.matches / Math.max(busiestDay, 1)) * 4));
}

/** "–" for no matches, then each shade's lower bound, e.g. "<0.8", "0.8", "1.0", "1.2+". */
function stepLegend(
  steps: number[],
  format: (step: number) => string,
): string[] {
  const labels = steps.map(format);
  return ['–', `<${labels[0]}`, ...labels.slice(0, -1), `${labels.at(-1)}+`];
}

/** The label under each of the five legend shades, lowest first. */
export function activityLegend(
  metric: ActivityMetric,
  busiestDay: number,
): string[] {
  if (metric === 'killDeath') {
    return stepLegend(KILL_DEATH_STEPS, (step) => step.toFixed(1));
  }
  if (metric === 'winRate') {
    return stepLegend(WIN_RATE_STEPS, (step) => `${step}%`);
  }
  const busiest = Math.max(busiestDay, 1);
  return [0, 1, 2, 3, 4].map((step) =>
    String(Math.round((busiest * step) / 4)),
  );
}
