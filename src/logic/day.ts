// Numbers for the daily opening and closing. Pure functions, all tested.
//
//   - FREE TIME: your waking hours (default 08:30–22:30) minus everything
//     already in the calendar that day (events and task blocks). Today, only
//     the time from now on counts.
//   - DEADLINES RADAR: one-off events (exams, deliverables, meetings) in the
//     next 3 weeks. Weekly events (classes) are left out: they aren't
//     deadlines.
//   - WHAT'S LAGGING: per goal, execution below the 85% target, or hours
//     behind the pace needed to reach the weekly target by Sunday.
import type { CalendarEvent, Goal, ISODate, Tactic, Task } from '../data/types'
import type { CalendarItem } from './calendar'
import { goalOfTask, sumActualHours, tacticToGoal, TARGET_EXECUTION, type Execution } from './metrics'
import { addDays, daysBetween, weekday } from './weeks'

/** Free gaps shorter than this are not shown. */
export const MIN_FREE_MINUTES = 15
export const RADAR_DAYS = 21

export interface Slot {
  start: number
  end: number
}

/**
 * Free time in a day: the window minus the busy items (minutes after
 * midnight). `from` = only count from this minute on (e.g. now, for today).
 */
export function freeSlots(busy: Slot[], window: Slot, from = 0): { slots: Slot[]; minutes: number } {
  const start = Math.max(window.start, from)
  const sorted = busy
    .map((b) => ({ start: Math.max(b.start, start), end: Math.min(b.end, window.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)
  const slots: Slot[] = []
  let cursor = start
  for (const b of sorted) {
    if (b.start > cursor) slots.push({ start: cursor, end: b.start })
    cursor = Math.max(cursor, b.end)
  }
  if (window.end > cursor) slots.push({ start: cursor, end: window.end })
  const kept = slots.filter((s) => s.end - s.start >= MIN_FREE_MINUTES)
  return { slots: kept, minutes: kept.reduce((sum, s) => sum + s.end - s.start, 0) }
}

/** The busy intervals of one day, from calendar items (timed ones only). */
export function busyOn(items: CalendarItem[], date: ISODate): Slot[] {
  return items
    .filter((i) => i.date === date && i.start !== null && i.end !== null)
    .map((i) => ({ start: i.start!, end: i.end! }))
}

export interface Deadline {
  event: CalendarEvent
  date: ISODate
  daysLeft: number
}

/** One-off events from today to `days` days ahead, soonest first. */
export function deadlinesRadar(events: CalendarEvent[], today: ISODate, days = RADAR_DAYS): Deadline[] {
  const last = addDays(today, days)
  return events
    .filter((e) => !e.repeat_weekly && e.date >= today && e.date <= last)
    .map((e) => ({ event: e, date: e.date, daysLeft: daysBetween(today, e.date) }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.event.start_time ?? '').localeCompare(b.event.start_time ?? ''))
}

export type Lag =
  | { kind: 'execution'; goal: Goal; pct: number }
  | { kind: 'hours'; goal: Goal; actual: number; expected: number; target: number }

/**
 * Goals that are behind this week:
 *  - execution % below the target (only once something counts);
 *  - hours below the pace needed: by the start of today you should have
 *    done (days already passed ÷ 7) of the weekly target. Half an hour of
 *    slack, so tiny differences aren't flagged.
 */
export function lagging(
  goals: Goal[],
  tactics: Tactic[],
  weekTasks: Task[],
  byGoal: Map<string, Execution>,
  today: ISODate,
): Lag[] {
  const tg = tacticToGoal(tactics)
  const daysPassed = weekday(today) - 1 // Monday morning: 0 days passed
  const lags: Lag[] = []
  for (const goal of goals) {
    const exec = byGoal.get(goal.id)
    if (exec && exec.pct !== null && exec.pct < TARGET_EXECUTION) lags.push({ kind: 'execution', goal, pct: exec.pct })
    const actual = sumActualHours(weekTasks.filter((t) => goalOfTask(t, tg) === goal.id))
    const expected = (goal.weekly_hours_target * daysPassed) / 7
    if (goal.weekly_hours_target > 0 && actual + 0.5 < expected) {
      lags.push({ kind: 'hours', goal, actual, expected: Math.round(expected * 10) / 10, target: goal.weekly_hours_target })
    }
  }
  return lags
}

/** "2 h 30 min" style for a number of minutes. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}
