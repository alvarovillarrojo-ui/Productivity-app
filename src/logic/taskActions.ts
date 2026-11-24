// Task actions. These functions only CALCULATE which tasks to create; the
// caller saves them with repo.createTasks() (or inside repo.ts).
import type { NewTask } from '../data/repo'
import type { Cycle, ISODate, Tactic, Task } from '../data/types'
import { addDays, cyclePosition } from './weeks'

/** A tactic's schedule, or null when it has none (no days chosen). */
export function scheduleOf(tactic: Tactic): { days: number[]; time: string | null; hours: number | null } | null {
  const days = [...new Set(tactic.schedule_days ?? [])].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b)
  if (days.length === 0) return null
  return { days, time: tactic.schedule_time ?? null, hours: tactic.schedule_hours ?? null }
}

/** "Next week" is prepared this many days before it starts (Sat + Sun). */
export const PREPARE_NEXT_WEEK_DAYS = 2

/**
 * Which weeks should have their recurring tasks by now:
 * the current week, plus next week from Saturday on (so it can be planned on
 * the weekend). Before the cycle starts: week 1, from 2 days before.
 */
export function weeksToPrepare(cycle: Pick<Cycle, 'start_date' | 'length_weeks'>, today: ISODate): number[] {
  const pos = cyclePosition(cycle, today)
  if (pos.phase === 'after') return []
  if (pos.phase === 'before') return pos.daysUntilStart <= PREPARE_NEXT_WEEK_DAYS ? [1] : []
  const weeks = [pos.week]
  if (pos.daysLeftInWeek <= PREPARE_NEXT_WEEK_DAYS && pos.week < cycle.length_weeks) weeks.push(pos.week + 1)
  return weeks
}

/** Key under which the cycle remembers what it created: "week|tacticId". */
export const recurringKey = (week: number, tacticId: string) => `${week}|${tacticId}`

/**
 * AUTOMATIC RECURRING TASKS for one week.
 *
 * Every ACTIVE tactic with a weekly frequency gets that many tasks per week,
 * e.g. "Run" 3× → "Run (1/3)", "Run (2/3)", "Run (3/3)".
 *
 * `generated` remembers how many tasks were already created for each
 * week + tactic, so that:
 *  - a task you DELETE is not created again;
 *  - RAISING the frequency adds only the extra tasks (e.g. 3 → 4 adds "(4/4)");
 *  - lowering it or deactivating the tactic never deletes anything.
 * The first time a week + tactic is seen, tasks that already exist for the
 * tactic (e.g. added by hand) are counted, so nothing is duplicated.
 *
 * SCHEDULED tactics (with days): task i goes on the i-th chosen day, at the
 * chosen time and duration, so it appears in the calendar by itself. Days
 * that have already passed (`today`) are skipped, so a tactic added
 * mid-week doesn't start with overdue tasks.
 *
 * Returns the tasks to create and the updated `generated` record.
 */
export function planRecurring(
  cycleId: string,
  week: number,
  tactics: Tactic[],
  weekTasks: Task[],
  generated: Record<string, number>,
  /** Monday of that week and today; needed to place scheduled tasks. */
  dates?: { weekStart: ISODate; today: ISODate },
): { tasks: NewTask[]; generated: Record<string, number> } {
  const next = { ...generated }
  const tasks: NewTask[] = []
  for (const tactic of tactics) {
    const freq = tactic.weekly_frequency
    if (!tactic.active || freq === null || freq < 1) continue
    const key = recurringKey(week, tactic.id)
    const already = next[key] ?? weekTasks.filter((t) => t.tactic_id === tactic.id).length
    const schedule = scheduleOf(tactic)
    for (let i = already + 1; i <= freq; i++) {
      const task: NewTask = {
        cycle_id: cycleId,
        week_number: week,
        title: freq === 1 ? tactic.name : `${tactic.name} (${i}/${freq})`,
        tactic_id: tactic.id,
        kind: 'block',
      }
      const day = schedule?.days[i - 1]
      if (schedule && day && dates) {
        const date = addDays(dates.weekStart, day - 1)
        if (date < dates.today) continue // that day has passed
        Object.assign(task, { planned_date: date, start_time: schedule.time, planned_hours: schedule.hours })
      }
      tasks.push(task)
    }
    next[key] = Math.max(already, freq)
  }
  return { tasks, generated: next }
}

/** "Name (2/5)" → true for the tactic "Name". */
function isNumberedCopy(title: string, name: string): boolean {
  if (!title.startsWith(`${name} (`) || !title.endsWith(')')) return false
  const inside = title.slice(name.length + 2, -1) // "2/5"
  return /^\d+\/\d+$/.test(inside)
}

/**
 * Is this a BLOCK of the plan (created automatically from a tactic) rather
 * than a task you have to do? New items say so in `kind`. Older items (from
 * before blocks existed) are recognised by their title: the tactic's name,
 * or "Name (2/5)".
 */
export function isBlock(task: Task, tactics: Tactic[]): boolean {
  if (task.kind) return task.kind === 'block'
  const tactic = task.tactic_id ? tactics.find((t) => t.id === task.tactic_id) : undefined
  if (!tactic) return false
  return task.title === tactic.name || isNumberedCopy(task.title, tactic.name)
}

/**
 * "Copy unfinished tasks to next week": every open (todo) task is copied to
 * the next week, with its date moved 7 days later. The original stays where
 * it is (it still counts as not done in its own week, which is the honest
 * score). Tasks already present next week (same title and tactic) are skipped,
 * so pressing the button twice doesn't create duplicates. Blocks are not
 * copied: next week gets its own blocks automatically.
 */
export function unfinishedCopies(weekTasks: Task[], nextWeekTasks: Task[], tactics: Tactic[] = []): NewTask[] {
  const already = new Set(nextWeekTasks.map((t) => `${t.title}|${t.tactic_id}`))
  return weekTasks
    .filter((t) => t.status === 'todo' && !isBlock(t, tactics) && !already.has(`${t.title}|${t.tactic_id}`))
    .map((t) => ({
      cycle_id: t.cycle_id,
      week_number: t.week_number + 1,
      title: t.title,
      tactic_id: t.tactic_id,
      planned_date: t.planned_date ? addDays(t.planned_date, 7) : null,
      planned_hours: t.planned_hours,
      subject_id: t.subject_id ?? null,
      notes: t.notes,
      kind: 'todo' as const,
    }))
}
