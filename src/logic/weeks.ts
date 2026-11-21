// Date and week calculations.
//
// All dates are "YYYY-MM-DD" text in local time. Internally we convert them to
// UTC midnight so that day differences are always whole numbers (no daylight
// saving surprises in March/October).
import type { ISODate } from '../data/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** "2026-11-09" → milliseconds at UTC midnight of that day. */
function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Milliseconds at UTC midnight → "YYYY-MM-DD". */
function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Today's date on this computer, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Is this text a real calendar date in "YYYY-MM-DD" form? */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return fromUTC(toUTC(date)) === date
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS)
}

/** Whole days from `a` to `b` (positive if b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
}

/** Day of week, Monday = 1 … Sunday = 7. */
export function weekday(date: ISODate): number {
  const d = new Date(toUTC(date)).getUTCDay() // Sunday = 0
  return d === 0 ? 7 : d
}

export function isMonday(date: ISODate): boolean {
  return weekday(date) === 1
}

/** The Monday of the week containing `date`. */
export function mondayOf(date: ISODate): ISODate {
  return addDays(date, 1 - weekday(date))
}

/**
 * Default start date for a new cycle: today if today is Monday, otherwise
 * the coming Monday (e.g. at a Sunday review, that's tomorrow).
 */
export function nextMonday(today: ISODate): ISODate {
  return isMonday(today) ? today : addDays(mondayOf(today), 7)
}

// ---------- cycle weeks ----------

/** What a week calculation needs from a cycle. */
export interface CycleDates {
  start_date: ISODate
  length_weeks: number
}

/** First day (Monday) of week `week` of the cycle. */
export function weekStart(cycle: CycleDates, week: number): ISODate {
  return addDays(cycle.start_date, (week - 1) * 7)
}

/** Last day (Sunday) of week `week` of the cycle. */
export function weekEnd(cycle: CycleDates, week: number): ISODate {
  return addDays(cycle.start_date, (week - 1) * 7 + 6)
}

/** Last day of the whole cycle. */
export function cycleEnd(cycle: CycleDates): ISODate {
  return weekEnd(cycle, cycle.length_weeks)
}

/**
 * Which week of the cycle a date falls in. Can be 0 or negative (before the
 * cycle) or larger than length_weeks (after it).
 */
export function weekNumberOf(cycle: CycleDates, date: ISODate): number {
  return Math.floor(daysBetween(cycle.start_date, date) / 7) + 1
}

/** Where today sits relative to the cycle. */
export type CyclePosition =
  | { phase: 'before'; daysUntilStart: number }
  | { phase: 'during'; week: number; daysLeftInWeek: number }
  | { phase: 'after' }

export function cyclePosition(cycle: CycleDates, today: ISODate): CyclePosition {
  const week = weekNumberOf(cycle, today)
  if (week < 1) return { phase: 'before', daysUntilStart: daysBetween(today, cycle.start_date) }
  if (week > cycle.length_weeks) return { phase: 'after' }
  // Days left INCLUDING today: Monday = 7, Sunday = 1.
  return { phase: 'during', week, daysLeftInWeek: 8 - weekday(today) }
}

/**
 * The week the app should show by default: the current week, or week 1
 * before the cycle starts, or the last week after it ends.
 */
export function defaultWeek(cycle: CycleDates, today: ISODate): number {
  const week = weekNumberOf(cycle, today)
  return Math.min(Math.max(week, 1), cycle.length_weeks)
}

/**
 * The most recent week that has fully ended, or null if none has yet.
 * Used as the default week for the weekly export/review.
 */
export function lastCompletedWeek(cycle: CycleDates, today: ISODate): number | null {
  const week = Math.min(weekNumberOf(cycle, today) - 1, cycle.length_weeks)
  return week >= 1 ? week : null
}

/** Short readable date, e.g. "Mon 9 Nov" (en-GB) or "lun 9 nov" (es-ES). */
export function formatShortDate(date: ISODate, locale = 'en-GB'): string {
  return new Date(toUTC(date)).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
