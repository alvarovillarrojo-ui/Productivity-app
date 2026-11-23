// Calendar calculations: times, repeating events, side-by-side layout of
// overlapping blocks, and the month grid. Pure functions, all tested.
import type { CalendarEvent, ISODate, Task } from '../data/types'
import { addDays, daysBetween, mondayOf } from './weeks'

/** A task without planned hours takes this long in the calendar. */
export const DEFAULT_BLOCK_MINUTES = 60

/** Is this text a time "HH:MM" (00:00–23:59)? */
export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

/** "09:30" → 570 minutes after midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** 570 → "09:30" (clamped to the same day). */
export function fromMinutes(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** One thing on one day in the calendar. */
export interface CalendarItem {
  key: string
  kind: 'task' | 'event'
  date: ISODate
  /** Minutes after midnight; null = all day / no time. */
  start: number | null
  end: number | null
  task?: Task
  event?: CalendarEvent
}

/**
 * The days an event happens on between `from` and `to` (both included).
 * A weekly event happens on its first date and every 7 days after it.
 */
export function eventDates(event: CalendarEvent, from: ISODate, to: ISODate): ISODate[] {
  if (!event.repeat_weekly) return event.date >= from && event.date <= to ? [event.date] : []
  const last = event.repeat_until && event.repeat_until < to ? event.repeat_until : to
  // First occurrence on or after `from`.
  let date = event.date
  if (date < from) date = addDays(event.date, Math.ceil(daysBetween(event.date, from) / 7) * 7)
  const dates: ISODate[] = []
  for (; date <= last; date = addDays(date, 7)) dates.push(date)
  return dates
}

/** Events and dated tasks between two dates, as calendar items. */
export function calendarItems(events: CalendarEvent[], tasks: Task[], from: ISODate, to: ISODate): CalendarItem[] {
  const items: CalendarItem[] = []
  for (const event of events) {
    const start = event.start_time ? toMinutes(event.start_time) : null
    let end = event.end_time ? toMinutes(event.end_time) : null
    if (start !== null && (end === null || end <= start)) end = start + DEFAULT_BLOCK_MINUTES
    for (const date of eventDates(event, from, to)) {
      items.push({ key: `e:${event.id}:${date}`, kind: 'event', date, start, end, event })
    }
  }
  for (const task of tasks) {
    if (!task.planned_date || task.planned_date < from || task.planned_date > to) continue
    const start = task.start_time ? toMinutes(task.start_time) : null
    const minutes = task.planned_hours ? task.planned_hours * 60 : DEFAULT_BLOCK_MINUTES
    items.push({
      key: `t:${task.id}`,
      kind: 'task',
      date: task.planned_date,
      start,
      end: start === null ? null : Math.min(start + minutes, 24 * 60),
      task,
    })
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1))
}

/**
 * Side-by-side layout for one day's timed items: overlapping blocks share the
 * width. Returns, per item key, its column (lane) and the number of columns
 * of its group of overlapping blocks.
 */
export function layoutDay(items: { key: string; start: number; end: number }[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const result = new Map<string, { lane: number; lanes: number }>()
  let group: { key: string; lane: number }[] = []
  let laneEnds: number[] = []
  let groupEnd = -1
  const closeGroup = () => {
    for (const g of group) result.set(g.key, { lane: g.lane, lanes: laneEnds.length })
    group = []
    laneEnds = []
  }
  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = laneEnds.push(item.end) - 1
    else laneEnds[lane] = item.end
    group.push({ key: item.key, lane })
    groupEnd = Math.max(groupEnd, item.end)
  }
  closeGroup()
  return result
}

/** The 42 days (6 weeks, Monday first) shown for the month containing `date`. */
export function monthGrid(date: ISODate): ISODate[] {
  const first = `${date.slice(0, 7)}-01`
  const start = mondayOf(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** Same day of the month, `n` months later (clamped: 31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}
