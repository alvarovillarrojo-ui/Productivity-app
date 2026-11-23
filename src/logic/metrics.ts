// ALL numbers the app shows are calculated here, in one place, so the
// definitions are consistent everywhere and covered by tests.
//
// EXECUTION %
//   (done + ½ × partial) / (done + partial + missed + "due" open tasks)
//   "partial" = only the minimum version was done: it counts half.
//   An open (todo) task is "due" when its planned date is before today, or
//   when its whole week has ended. Open tasks that are still in the future
//   (or due today) don't count yet — you still have time to do them.
//   Tasks without a tactic ("Other") are NOT counted.
//   If nothing counts yet (denominator 0), the result is null, shown as "–".
//
// HOURS
//   Sum of actual_hours per goal per week, compared with the goal's weekly
//   target and minimum.
import { MISS_CAUSES, type Cycle, type Goal, type ISODate, type MissCause, type Tactic, type Task } from '../data/types'
import { weekEnd } from './weeks'

/** The weekly execution score the method aims for. */
export const TARGET_EXECUTION = 0.85

/** Result of an execution calculation. */
export interface Execution {
  done: number
  /** Only the minimum version done: counts ½. */
  partial: number
  missed: number
  /** Open tasks whose date has passed or whose week has ended. */
  overdue: number
  /** Open tasks that are not due yet (not counted). */
  upcoming: number
  /** done + partial + missed + overdue. */
  counted: number
  /** (done + ½ partial) / counted, between 0 and 1, or null when counted = 0. */
  pct: number | null
}

/** Does this open task already count against you? */
export function isDue(task: Task, weekLastDay: ISODate, today: ISODate): boolean {
  if (today > weekLastDay) return true // the week is over
  return task.planned_date !== null && task.planned_date < today
}

/**
 * Execution for a list of tasks that all belong to the same week.
 * Tasks without a tactic are ignored.
 */
export function execution(tasks: Task[], weekLastDay: ISODate, today: ISODate): Execution {
  let done = 0
  let partial = 0
  let missed = 0
  let overdue = 0
  let upcoming = 0
  for (const t of tasks) {
    if (t.tactic_id === null) continue
    if (t.status === 'done') done++
    else if (t.status === 'partial') partial++
    else if (t.status === 'missed') missed++
    else if (isDue(t, weekLastDay, today)) overdue++
    else upcoming++
  }
  const counted = done + partial + missed + overdue
  return { done, partial, missed, overdue, upcoming, counted, pct: counted === 0 ? null : (done + partial / 2) / counted }
}

/** Adds several Execution results together (e.g. many weeks → whole cycle). */
export function sumExecution(list: Execution[]): Execution {
  const total = { done: 0, partial: 0, missed: 0, overdue: 0, upcoming: 0, counted: 0 }
  for (const e of list) {
    total.done += e.done
    total.partial += e.partial
    total.missed += e.missed
    total.overdue += e.overdue
    total.upcoming += e.upcoming
    total.counted += e.counted
  }
  return { ...total, pct: total.counted === 0 ? null : (total.done + total.partial / 2) / total.counted }
}

/** Map tactic id → goal id, to find which goal a task belongs to. */
export function tacticToGoal(tactics: Tactic[]): Map<string, string> {
  return new Map(tactics.map((t) => [t.id, t.goal_id]))
}

/** The goal a task belongs to, or null for "Other". */
export function goalOfTask(task: Task, tacticGoal: Map<string, string>): string | null {
  return task.tactic_id ? (tacticGoal.get(task.tactic_id) ?? null) : null
}

/** Execution for one week: overall and per goal. */
export interface WeekExecution {
  week: number
  overall: Execution
  /** Goal id → execution. Every goal is present, even with no tasks. */
  byGoal: Map<string, Execution>
}

export function weekExecution(
  cycle: Pick<Cycle, 'start_date' | 'length_weeks'>,
  week: number,
  weekTasks: Task[],
  goals: Goal[],
  tactics: Tactic[],
  today: ISODate,
): WeekExecution {
  const last = weekEnd(cycle, week)
  const tg = tacticToGoal(tactics)
  const byGoal = new Map<string, Execution>()
  for (const g of goals) {
    const goalTasks = weekTasks.filter((t) => goalOfTask(t, tg) === g.id)
    byGoal.set(g.id, execution(goalTasks, last, today))
  }
  // Only tasks linked to a known goal count towards the overall number.
  const linked = weekTasks.filter((t) => goalOfTask(t, tg) !== null)
  return { week, overall: execution(linked, last, today), byGoal }
}

/**
 * Execution for every week of a cycle (weeks that haven't started yet are
 * included; they simply have pct = null).
 */
export function cycleExecution(
  cycle: Pick<Cycle, 'start_date' | 'length_weeks'>,
  allTasks: Task[],
  goals: Goal[],
  tactics: Tactic[],
  today: ISODate,
): WeekExecution[] {
  const result: WeekExecution[] = []
  for (let w = 1; w <= cycle.length_weeks; w++) {
    const weekTasks = allTasks.filter((t) => t.week_number === w)
    result.push(weekExecution(cycle, w, weekTasks, goals, tactics, today))
  }
  return result
}

/**
 * Whole-cycle totals: overall and per goal.
 * Computed from all counted tasks together (not an average of weekly %),
 * so a busy week weighs more than a quiet one.
 */
export function cycleTotals(
  weeks: WeekExecution[],
  goals: Goal[],
): { overall: Execution; byGoal: Map<string, Execution> } {
  const byGoal = new Map<string, Execution>()
  for (const g of goals) {
    byGoal.set(g.id, sumExecution(weeks.map((w) => w.byGoal.get(g.id)!)))
  }
  return { overall: sumExecution(weeks.map((w) => w.overall)), byGoal }
}

/** Best and worst weeks by overall execution (weeks with no data skipped). */
export function bestAndWorstWeeks(
  weeks: WeekExecution[],
): { best: WeekExecution; worst: WeekExecution } | null {
  const scored = weeks.filter((w) => w.overall.pct !== null)
  if (scored.length === 0) return null
  let best = scored[0]
  let worst = scored[0]
  for (const w of scored) {
    if (w.overall.pct! > best.overall.pct!) best = w
    if (w.overall.pct! < worst.overall.pct!) worst = w
  }
  return { best, worst }
}

// ---------- hours ----------

export type HoursLevel = 'target' | 'minimum' | 'below'

export interface GoalHours {
  goalId: string
  actual: number
  target: number
  minimum: number | null
  /** 'target' = reached target, 'minimum' = reached minimum only, 'below' = neither. */
  level: HoursLevel
}

/** Sum of actual hours (empty = 0). */
export function sumActualHours(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0)
}

export function hoursLevel(actual: number, target: number, minimum: number | null): HoursLevel {
  if (actual >= target) return 'target'
  if (minimum !== null && actual >= minimum) return 'minimum'
  return 'below'
}

/** Hours per goal for one week's tasks, plus the hours logged under "Other". */
export function weekHours(
  weekTasks: Task[],
  goals: Goal[],
  tactics: Tactic[],
): { byGoal: GoalHours[]; other: number } {
  const tg = tacticToGoal(tactics)
  const byGoal = goals.map((g) => {
    const actual = sumActualHours(weekTasks.filter((t) => goalOfTask(t, tg) === g.id))
    return {
      goalId: g.id,
      actual,
      target: g.weekly_hours_target,
      minimum: g.weekly_hours_minimum,
      level: hoursLevel(actual, g.weekly_hours_target, g.weekly_hours_minimum),
    }
  })
  const other = sumActualHours(weekTasks.filter((t) => goalOfTask(t, tg) === null))
  return { byGoal, other }
}

// ---------- counts ----------

/** How many missed tasks had each cause, plus those with no cause given. */
export function missCauses(tasks: Task[]): Record<MissCause | 'none', number> {
  const counts: Record<MissCause | 'none', number> = { planning: 0, unforeseen: 0, energy: 0, meaning: 0, none: 0 }
  for (const t of tasks) {
    if (t.status !== 'missed') continue
    const cause = MISS_CAUSES.includes(t.miss_reason as MissCause) ? (t.miss_reason as MissCause) : 'none'
    counts[cause]++
  }
  return counts
}

/** The most frequent cause, or null when no missed task has a cause. */
export function topCause(counts: Record<MissCause | 'none', number>): MissCause | null {
  let best: MissCause | null = null
  for (const c of MISS_CAUSES) if (counts[c] > 0 && (best === null || counts[c] > counts[best])) best = c
  return best
}

/** Plain task counts (ALL tasks, including "Other"). */
export function taskCounts(tasks: Task[]): { done: number; partial: number; missed: number; open: number } {
  return {
    done: tasks.filter((t) => t.status === 'done').length,
    partial: tasks.filter((t) => t.status === 'partial').length,
    missed: tasks.filter((t) => t.status === 'missed').length,
    open: tasks.filter((t) => t.status === 'todo').length,
  }
}

// ---------- display ----------

/** Points scored: done + ½ partial, e.g. 4.5 (for "4.5 / 6"). */
export const executionPoints = (e: Pick<Execution, 'done' | 'partial'>): number => e.done + e.partial / 2

/** 0.857 → "86%", null → "–". */
export function formatPct(pct: number | null): string {
  return pct === null ? '–' : `${Math.round(pct * 100)}%`
}

/** 2.5 → "2.5 h", 2 → "2 h". */
export function formatHours(hours: number): string {
  return `${Math.round(hours * 10) / 10} h`
}
