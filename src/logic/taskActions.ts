// Bulk task actions on the Tasks screen. These functions only CALCULATE which
// tasks to create; the screen then saves them with repo.createTasks().
import type { NewTask } from '../data/repo'
import type { Tactic, Task } from '../data/types'
import { addDays } from './weeks'

/**
 * "Generate recurring tasks": for every ACTIVE tactic with a weekly frequency,
 * create the tasks that are still missing this week.
 *
 * Example: "Run" is 3× per week and the week already has 1 Run task
 * → 2 new tasks are created: "Run (2/3)" and "Run (3/3)".
 * Any task linked to the tactic counts as existing, whatever its title.
 */
export function recurringTasks(
  cycleId: string,
  week: number,
  tactics: Tactic[],
  weekTasks: Task[],
): NewTask[] {
  const result: NewTask[] = []
  for (const tactic of tactics) {
    const freq = tactic.weekly_frequency
    if (!tactic.active || freq === null || freq < 1) continue
    const existing = weekTasks.filter((t) => t.tactic_id === tactic.id).length
    for (let i = existing + 1; i <= freq; i++) {
      result.push({
        cycle_id: cycleId,
        week_number: week,
        title: freq === 1 ? tactic.name : `${tactic.name} (${i}/${freq})`,
        tactic_id: tactic.id,
      })
    }
  }
  return result
}

/**
 * "Copy unfinished tasks to next week": every open (todo) task is copied to
 * the next week, with its date moved 7 days later. The original stays where
 * it is (it still counts as not done in its own week, which is the honest
 * score). Tasks already present next week (same title and tactic) are skipped,
 * so pressing the button twice doesn't create duplicates.
 */
export function unfinishedCopies(weekTasks: Task[], nextWeekTasks: Task[]): NewTask[] {
  const already = new Set(nextWeekTasks.map((t) => `${t.title}|${t.tactic_id}`))
  return weekTasks
    .filter((t) => t.status === 'todo' && !already.has(`${t.title}|${t.tactic_id}`))
    .map((t) => ({
      cycle_id: t.cycle_id,
      week_number: t.week_number + 1,
      title: t.title,
      tactic_id: t.tactic_id,
      planned_date: t.planned_date ? addDays(t.planned_date, 7) : null,
      planned_hours: t.planned_hours,
      notes: t.notes,
    }))
}
