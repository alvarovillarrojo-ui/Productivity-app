// Habit numbers, kept SEPARATE from the 12-week execution %.
//
// A habit is "planned" on the weekdays you chose, from its start date on.
//   - Streak: how many planned days in a row you did it, counting back from
//     today (today only counts once it's ticked, so an unticked today doesn't
//     break the streak yet). Days that aren't planned are skipped.
//   - Consistency %: ticked planned days ÷ planned days, up to today.
//   - "Never miss twice" (Atomic Habits): if you missed the last planned day,
//     today matters extra. Missing once is an accident; twice starts a pattern.
import type { Habit, HabitCheck, ISODate } from '../data/types'
import { addDays, weekday } from './weeks'

/** Is the habit planned on this date? */
export function isPlanned(habit: Pick<Habit, 'days' | 'start_date'>, date: ISODate): boolean {
  return date >= habit.start_date && habit.days.includes(weekday(date))
}

/** Set of "habitId|date" keys, for fast lookups. */
export const checkSet = (checks: HabitCheck[]): Set<string> => new Set(checks.map((c) => `${c.habit_id}|${c.date}`))

const isDone = (done: Set<string>, habitId: string, date: ISODate) => done.has(`${habitId}|${date}`)

/** Days in a row (planned days only) the habit was done, up to today. */
export function streak(habit: Habit, done: Set<string>, today: ISODate): number {
  let count = 0
  let date = today
  // An unticked today doesn't break the streak (the day isn't over).
  if (!isDone(done, habit.id, today)) date = addDays(today, -1)
  // Safety limit: about 3 years back.
  for (let i = 0; i < 1100 && date >= habit.start_date; i++, date = addDays(date, -1)) {
    if (!isPlanned(habit, date)) continue
    if (!isDone(done, habit.id, date)) break
    count++
  }
  return count
}

/** The last planned day before today, or null if there was none. */
export function lastPlannedBefore(habit: Habit, today: ISODate): ISODate | null {
  for (let i = 1, date = addDays(today, -1); i <= 7 && date >= habit.start_date; i++, date = addDays(date, -1)) {
    if (isPlanned(habit, date)) return date
  }
  return null
}

/** True when the last planned day was missed: "never miss twice" today. */
export function missedLastTime(habit: Habit, done: Set<string>, today: ISODate): boolean {
  const last = lastPlannedBefore(habit, today)
  return last !== null && !isDone(done, habit.id, last)
}

export interface Consistency {
  done: number
  planned: number
  /** done ÷ planned, 0–1, or null when nothing was planned yet. */
  pct: number | null
}

/**
 * Consistency of some habits between two dates (both included), counting only
 * days up to `today`. Today counts only if it's already ticked.
 */
export function consistency(habits: Habit[], done: Set<string>, from: ISODate, to: ISODate, today: ISODate): Consistency {
  let planned = 0
  let ticked = 0
  for (const habit of habits) {
    for (let date = from; date <= to && date <= today; date = addDays(date, 1)) {
      if (!isPlanned(habit, date)) continue
      const isDoneNow = isDone(done, habit.id, date)
      if (date === today && !isDoneNow) continue // today isn't over yet
      planned++
      if (isDoneNow) ticked++
    }
  }
  return { done: ticked, planned, pct: planned === 0 ? null : ticked / planned }
}
