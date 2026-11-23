// Files that go in and out of the app: week reports, imports and backups.
// Everything here is pure (no database, no browser), so it is easy to test.
//
// FORMATS (all JSON, schema_version "1.0"; full description in docs/import_schema.md)
//
// 1. Import file — goals, tactics and tasks referenced by NAME, not by id:
//      { schema_version, cycle?, goals?: [{ name, …, tactics: [{ name, … }] }],
//        tasks?: [{ week_number, title, goal, tactic, status, … }] }
//    Importing only ADDS: into the active cycle if there is one (goals and
//    tactics with the same name are reused, case-insensitive), otherwise into
//    a new cycle described by `cycle`. Tasks that already exist are skipped.
//
// 2. Week report — an import file for one week plus a read-only summary.
//    Because it has the same shape, a week report can be imported again.
//    The private vision is only included when the user ticks "include vision".
//
// 3. Backup — every record with its id, restored as-is (replaces everything).
import type { Dict } from '../i18n/en'
import { HABIT_CATEGORIES, type AllData, type Cycle, type Goal, type HabitCategory, type ISODate, type Tactic, type Task, type TaskStatus } from '../data/types'
import {
  formatHours,
  formatPct,
  goalOfTask,
  tacticToGoal,
  weekExecution,
  weekHours,
  type Execution,
  type HoursLevel,
} from './metrics'
import { isMonday, isValidDate, weekEnd, weekStart } from './weeks'
import { isValidTime } from './calendar'

export const SCHEMA_VERSION = '1.0'
const APP_ID = 'twelve-week-tracker'
const STATUSES: TaskStatus[] = ['todo', 'done', 'missed']
export const MAX_FREQUENCY = 14
export const MAX_WEEKS = 52

// ---------- problems found in a file ----------

export type DataIssueCode =
  | 'invalidJson' // not valid JSON at all
  | 'notObject' // JSON, but not an { … } object
  | 'version' // missing or unknown schema_version
  | 'nothing' // no cycle, goals or tasks in the file
  | 'missingCycle' // no active cycle in the app and none in the file
  | 'list' // should be a list [ … ]
  | 'required' // required text is missing or empty
  | 'text' // should be text
  | 'number' // should be a number ≥ 0
  | 'boolean' // should be true / false
  | 'frequency' // whole number 1–14
  | 'days' // list of weekdays 1–7
  | 'time' // "HH:MM"
  | 'length' // whole number 1–52
  | 'date' // not a valid YYYY-MM-DD date
  | 'monday' // must be a Monday
  | 'week' // week_number outside the cycle
  | 'dateOutsideWeek' // planned_date not inside its week
  | 'status' // not todo / done / missed
  | 'minAboveTarget'
  | 'duplicateName' // two goals (or tactics in one goal) with the same name
  | 'tacticNeedsGoal' // a task names a tactic but not its goal
  | 'unknownTactic' // the goal/tactic named by a task doesn't exist
  | 'notBackup' // restore: this is not a backup file
  | 'record' // restore: a record is broken
  | 'link' // restore: a record points to something that isn't there
  | 'duplicateId' // restore: two records share an id
  | 'manyActive' // restore: more than one active cycle

export interface DataIssue {
  code: DataIssueCode
  /** Where in the file, e.g. "tasks[3].week_number". */
  path?: string
  /** Extra detail (e.g. the value or the name that wasn't found). */
  detail?: string
}

/** Stop listing problems after this many: the file is clearly wrong. */
const MAX_ISSUES = 30

// ---------- normalised shapes (names, no ids) ----------

export interface PlanCycle {
  name: string
  start_date: ISODate
  length_weeks: number
  vision: string | null
  notes: string
}
export interface PlanTactic {
  name: string
  description: string
  active: boolean
  weekly_frequency: number | null
  /** Optional schedule; in files: "days", "time", "hours". */
  schedule_days?: number[] | null
  schedule_time?: string | null
  schedule_hours?: number | null
}
export interface PlanGoal {
  name: string
  description: string
  weekly_hours_target: number
  weekly_hours_minimum: number | null
  tactics: PlanTactic[]
}
export interface PlanTask {
  week_number: number
  title: string
  /** Goal name, or null for "Other". */
  goal: string | null
  /** Tactic name, or null for "Other". */
  tactic: string | null
  planned_date: ISODate | null
  planned_hours: number | null
  actual_hours: number | null
  status: TaskStatus
  notes: string
}

/** What an import will do, shown in the preview and then applied. */
export interface ImportPlan {
  cycle: { kind: 'existing'; id: string; name: string } | { kind: 'new'; data: PlanCycle }
  /** Goals that don't exist yet (with all their tactics). */
  newGoals: PlanGoal[]
  /** New tactics for goals that already exist. */
  newTactics: { goal: string; tactic: PlanTactic }[]
  tasks: PlanTask[]
  /** Tasks skipped because the same task already exists. */
  duplicates: number
  /** The file describes a cycle, but the tasks go into the active one. */
  cycleIgnored: boolean
}

/** The app's current active cycle and its contents (import target). */
export interface ImportTarget {
  cycle: Cycle
  goals: Goal[]
  tactics: Tactic[]
  tasks: Task[]
}

/** Names are compared ignoring case and surrounding spaces. */
export const nameKey = (name: string): string => name.trim().toLowerCase()
const tacticKey = (goal: string, tactic: string) => `${nameKey(goal)}\u0000${nameKey(tactic)}`
const taskKey = (week: number, title: string, goal: string | null, tactic: string | null) =>
  `${week}\u0000${nameKey(title)}\u0000${goal && tactic ? tacticKey(goal, tactic) : ''}`

// ---------- small readers that collect problems ----------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

class Reader {
  issues: DataIssue[] = []
  add(code: DataIssueCode, path?: string, detail?: string) {
    if (this.issues.length < MAX_ISSUES) this.issues.push({ code, path, detail })
  }
  /** Required, non-empty text (trimmed). */
  name(o: Obj, key: string, path: string): string {
    const v = o[key]
    if (typeof v !== 'string' || v.trim() === '') {
      this.add('required', `${path}.${key}`)
      return ''
    }
    return v.trim()
  }
  /** Optional text; missing → fallback. */
  text(o: Obj, key: string, path: string, fallback = ''): string {
    const v = o[key]
    if (v === undefined || v === null) return fallback
    if (typeof v !== 'string') {
      this.add('text', `${path}.${key}`)
      return fallback
    }
    return v
  }
  /** Optional text that may be null. */
  textOrNull(o: Obj, key: string, path: string): string | null {
    const v = o[key]
    if (v === undefined || v === null || v === '') return null
    if (typeof v !== 'string') {
      this.add('text', `${path}.${key}`)
      return null
    }
    return v
  }
  /** Number ≥ 0; missing/null allowed unless required. */
  hours(o: Obj, key: string, path: string, required = false): number | null {
    const v = o[key]
    if (v === undefined || v === null) {
      if (required) this.add('number', `${path}.${key}`)
      return null
    }
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      this.add('number', `${path}.${key}`, String(v))
      return null
    }
    return v
  }
  /** Whole number in [min, max]; missing/null allowed unless required. */
  whole(o: Obj, key: string, path: string, min: number, max: number, code: DataIssueCode, required: boolean) {
    const v = o[key]
    if (v === undefined || v === null) {
      if (required) this.add(code, `${path}.${key}`)
      return null
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      this.add(code, `${path}.${key}`, String(v))
      return null
    }
    return v
  }
  bool(o: Obj, key: string, path: string, fallback: boolean): boolean {
    const v = o[key]
    if (v === undefined || v === null) return fallback
    if (typeof v !== 'boolean') {
      this.add('boolean', `${path}.${key}`)
      return fallback
    }
    return v
  }
  date(o: Obj, key: string, path: string, required: boolean): ISODate | null {
    const v = o[key]
    if (v === undefined || v === null || v === '') {
      if (required) this.add('required', `${path}.${key}`)
      return null
    }
    if (typeof v !== 'string' || !isValidDate(v)) {
      this.add('date', `${path}.${key}`, String(v))
      return null
    }
    return v
  }
  list(o: Obj, key: string, path: string): unknown[] {
    const v = o[key]
    if (v === undefined || v === null) return []
    if (!Array.isArray(v)) {
      this.add('list', path ? `${path}.${key}` : key)
      return []
    }
    return v
  }
}

/** JSON.parse that reports a problem instead of throwing. */
export function parseJson(text: string): { value: unknown; issues: DataIssue[] } {
  try {
    return { value: JSON.parse(text), issues: [] }
  } catch (e) {
    return { value: null, issues: [{ code: 'invalidJson', detail: (e as Error).message }] }
  }
}

// ---------- IMPORT ----------

function readCycle(r: Reader, o: unknown): PlanCycle | null {
  if (!isObj(o)) {
    r.add('notObject', 'cycle')
    return null
  }
  const name = r.name(o, 'name', 'cycle')
  const start = r.date(o, 'start_date', 'cycle', true)
  if (start && !isMonday(start)) r.add('monday', 'cycle.start_date', start)
  const length = r.whole(o, 'length_weeks', 'cycle', 1, MAX_WEEKS, 'length', false) ?? 12
  return {
    name,
    start_date: start ?? '',
    length_weeks: length,
    vision: r.textOrNull(o, 'vision', 'cycle'),
    notes: r.text(o, 'notes', 'cycle'),
  }
}

/** Optional tactic schedule in a file: "days" [1–7], "time" "HH:MM", "hours". */
function readSchedule(r: Reader, o: Obj, path: string) {
  if (o.days === undefined || o.days === null) return null
  const days = o.days
  if (!Array.isArray(days) || days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    r.add('days', `${path}.days`)
    return null
  }
  let time: string | null = null
  if (o.time !== undefined && o.time !== null) {
    if (typeof o.time !== 'string' || !isValidTime(o.time)) r.add('time', `${path}.time`, String(o.time))
    else time = o.time
  }
  const hours = r.hours(o, 'hours', path)
  return { schedule_days: [...new Set(days as number[])].sort((a, b) => a - b), schedule_time: time, schedule_hours: hours }
}

function readGoal(r: Reader, o: unknown, path: string): PlanGoal | null {
  if (!isObj(o)) {
    r.add('notObject', path)
    return null
  }
  const target = r.hours(o, 'weekly_hours_target', path, true) ?? 0
  const minimum = r.hours(o, 'weekly_hours_minimum', path)
  if (minimum !== null && minimum > target) r.add('minAboveTarget', path)
  const seen = new Set<string>()
  const tactics: PlanTactic[] = []
  r.list(o, 'tactics', path).forEach((t, i) => {
    const tp = `${path}.tactics[${i}]`
    if (!isObj(t)) return r.add('notObject', tp)
    const name = r.name(t, 'name', tp)
    if (name && seen.has(nameKey(name))) r.add('duplicateName', `${tp}.name`, name)
    seen.add(nameKey(name))
    const tactic: PlanTactic = {
      name,
      description: r.text(t, 'description', tp),
      active: r.bool(t, 'active', tp, true),
      weekly_frequency: r.whole(t, 'weekly_frequency', tp, 1, MAX_FREQUENCY, 'frequency', false),
    }
    const sched = readSchedule(r, t, tp)
    if (sched) Object.assign(tactic, sched, { weekly_frequency: sched.schedule_days.length })
    tactics.push(tactic)
  })
  return {
    name: r.name(o, 'name', path),
    description: r.text(o, 'description', path),
    weekly_hours_target: target,
    weekly_hours_minimum: minimum,
    tactics,
  }
}

function readTask(r: Reader, o: unknown, path: string, weeks: number): PlanTask | null {
  if (!isObj(o)) {
    r.add('notObject', path)
    return null
  }
  const status = o.status ?? 'todo'
  if (!STATUSES.includes(status as TaskStatus)) r.add('status', `${path}.status`, String(status))
  return {
    title: r.name(o, 'title', path),
    week_number: r.whole(o, 'week_number', path, 1, weeks, 'week', true) ?? 0,
    goal: r.textOrNull(o, 'goal', path),
    tactic: r.textOrNull(o, 'tactic', path),
    planned_date: r.date(o, 'planned_date', path, false),
    planned_hours: r.hours(o, 'planned_hours', path),
    actual_hours: r.hours(o, 'actual_hours', path),
    status: STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : 'todo',
    notes: r.text(o, 'notes', path),
  }
}

/**
 * Checks an import file and works out what importing it would do.
 * `target` = the active cycle and its contents, or null if there is none.
 * Returns the problems found; `plan` is null when there is any problem.
 */
export function parseImport(
  input: unknown,
  target: ImportTarget | null,
): { issues: DataIssue[]; plan: ImportPlan | null } {
  const r = new Reader()
  if (!isObj(input)) return { issues: [{ code: 'notObject' }], plan: null }
  if (input.schema_version !== SCHEMA_VERSION) {
    return { issues: [{ code: 'version', detail: String(input.schema_version ?? '') }], plan: null }
  }

  const fileCycle = input.cycle === undefined || input.cycle === null ? null : readCycle(r, input.cycle)
  if (!target && !fileCycle) r.add('missingCycle')
  const cycleDates = target ? target.cycle : fileCycle
  const weeks = cycleDates?.length_weeks ?? MAX_WEEKS

  // Goals (and their tactics) from the file.
  const fileGoals: PlanGoal[] = []
  const goalNames = new Set<string>()
  r.list(input, 'goals', '').forEach((g, i) => {
    const goal = readGoal(r, g, `goals[${i}]`)
    if (!goal) return
    if (goal.name && goalNames.has(nameKey(goal.name))) r.add('duplicateName', `goals[${i}].name`, goal.name)
    goalNames.add(nameKey(goal.name))
    fileGoals.push(goal)
  })

  const fileTasks: { task: PlanTask; path: string }[] = []
  r.list(input, 'tasks', '').forEach((t, i) => {
    const path = `tasks[${i}]`
    const task = readTask(r, t, path, weeks)
    if (task) fileTasks.push({ task, path })
  })

  if (!fileCycle && fileGoals.length === 0 && fileTasks.length === 0) r.add('nothing')

  // ---- compare with what already exists ----
  const existingGoals = target?.goals ?? []
  const existingTactics = target?.tactics ?? []
  const goalById = new Map(existingGoals.map((g) => [g.id, g]))
  const existingGoalByKey = new Map(existingGoals.map((g) => [nameKey(g.name), g]))
  const knownTactics = new Map<string, string>() // key → tactic name (as stored)
  for (const t of existingTactics) {
    const g = goalById.get(t.goal_id)
    if (g) knownTactics.set(tacticKey(g.name, t.name), t.name)
  }

  const newGoals: PlanGoal[] = []
  const newTactics: { goal: string; tactic: PlanTactic }[] = []
  for (const g of fileGoals) {
    const existing = existingGoalByKey.get(nameKey(g.name))
    if (!existing) {
      newGoals.push(g)
      for (const t of g.tactics) knownTactics.set(tacticKey(g.name, t.name), t.name)
      continue
    }
    for (const t of g.tactics) {
      const key = tacticKey(existing.name, t.name)
      if (knownTactics.has(key)) continue
      newTactics.push({ goal: existing.name, tactic: t })
      knownTactics.set(key, t.name)
    }
  }

  // How many copies of each task the target cycle already has. A file task is
  // skipped only while there are existing copies left to match it, so a file
  // may hold the same task twice (e.g. "Run 5 km" on Monday and Wednesday),
  // and importing the same file again still adds nothing.
  const tg = tacticToGoal(existingTactics)
  const tacticById = new Map(existingTactics.map((t) => [t.id, t]))
  const existingCopies = new Map<string, number>()
  for (const t of target?.tasks ?? []) {
    const goalId = goalOfTask(t, tg)
    const goal = goalId ? (goalById.get(goalId)?.name ?? null) : null
    const tactic = t.tactic_id ? (tacticById.get(t.tactic_id)?.name ?? null) : null
    const key = taskKey(t.week_number, t.title, goal, tactic)
    existingCopies.set(key, (existingCopies.get(key) ?? 0) + 1)
  }

  const tasks: PlanTask[] = []
  let duplicates = 0
  for (const { task, path } of fileTasks) {
    if (task.tactic && !task.goal) {
      r.add('tacticNeedsGoal', path, task.tactic)
      continue
    }
    if (task.tactic && task.goal && !knownTactics.has(tacticKey(task.goal, task.tactic))) {
      r.add('unknownTactic', path, `${task.goal} → ${task.tactic}`)
      continue
    }
    // A goal without a tactic means "Other" (not counted).
    const goal = task.tactic ? task.goal : null
    if (cycleDates && task.planned_date && task.week_number >= 1 && cycleDates.start_date) {
      const first = weekStart(cycleDates, task.week_number)
      const last = weekEnd(cycleDates, task.week_number)
      if (task.planned_date < first || task.planned_date > last) {
        r.add('dateOutsideWeek', `${path}.planned_date`, task.planned_date)
      }
    }
    const key = taskKey(task.week_number, task.title, goal, task.tactic)
    const left = existingCopies.get(key) ?? 0
    if (left > 0) {
      existingCopies.set(key, left - 1)
      duplicates++
      continue
    }
    tasks.push({ ...task, goal })
  }

  if (r.issues.length > 0) return { issues: r.issues, plan: null }
  return {
    issues: [],
    plan: {
      cycle: target
        ? { kind: 'existing', id: target.cycle.id, name: target.cycle.name }
        : { kind: 'new', data: fileCycle! },
      newGoals,
      newTactics,
      tasks,
      duplicates,
      cycleIgnored: target !== null && fileCycle !== null,
    },
  }
}

// ---------- WEEK REPORT ----------

export interface ExecutionSummary {
  /** 0–100, or null when nothing counts yet. */
  pct: number | null
  done: number
  missed: number
  overdue: number
  upcoming: number
}

export interface WeekReport {
  schema_version: string
  kind: 'week_report'
  exported_at: string
  week: number
  week_start: ISODate
  week_end: ISODate
  cycle: { name: string; start_date: ISODate; length_weeks: number; vision?: string | null }
  goals: (Omit<PlanGoal, 'tactics'> & { tactics: (PlanTactic | (Omit<PlanTactic, 'schedule_days' | 'schedule_time' | 'schedule_hours'> & { days: number[]; time: string | null; hours: number | null }))[] })[]
  tasks: PlanTask[]
  summary: {
    execution: { overall: ExecutionSummary; by_goal: (ExecutionSummary & { goal: string })[] }
    hours: { goal: string; actual: number; target: number; minimum: number | null; level: HoursLevel }[]
    other_hours: number
  }
}

const summarise = (e: Execution): ExecutionSummary => ({
  pct: e.pct === null ? null : Math.round(e.pct * 1000) / 10,
  done: e.done,
  missed: e.missed,
  overdue: e.overdue,
  upcoming: e.upcoming,
})

export function buildWeekReport(input: {
  cycle: Cycle
  week: number
  goals: Goal[]
  tactics: Tactic[]
  /** All tasks of that week. */
  weekTasks: Task[]
  today: ISODate
  includeVision: boolean
  exportedAt: string
}): WeekReport {
  const { cycle, week, goals, tactics, weekTasks, today } = input
  const goalById = new Map(goals.map((g) => [g.id, g]))
  const tacticById = new Map(tactics.map((t) => [t.id, t]))
  const exec = weekExecution(cycle, week, weekTasks, goals, tactics, today)
  const hours = weekHours(weekTasks, goals, tactics)

  const report: WeekReport = {
    schema_version: SCHEMA_VERSION,
    kind: 'week_report',
    exported_at: input.exportedAt,
    week,
    week_start: weekStart(cycle, week),
    week_end: weekEnd(cycle, week),
    cycle: { name: cycle.name, start_date: cycle.start_date, length_weeks: cycle.length_weeks },
    goals: goals.map((g) => ({
      name: g.name,
      description: g.description,
      weekly_hours_target: g.weekly_hours_target,
      weekly_hours_minimum: g.weekly_hours_minimum,
      tactics: tactics
        .filter((t) => t.goal_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({
          name: t.name,
          description: t.description,
          active: t.active,
          weekly_frequency: t.weekly_frequency,
          ...(t.schedule_days?.length
            ? { days: t.schedule_days, time: t.schedule_time ?? null, hours: t.schedule_hours ?? null }
            : {}),
        })),
    })),
    tasks: weekTasks.map((t) => {
      const tactic = t.tactic_id ? tacticById.get(t.tactic_id) : undefined
      const goal = tactic ? goalById.get(tactic.goal_id) : undefined
      return {
        week_number: t.week_number,
        title: t.title,
        goal: goal && tactic ? goal.name : null,
        tactic: goal && tactic ? tactic.name : null,
        planned_date: t.planned_date,
        planned_hours: t.planned_hours,
        actual_hours: t.actual_hours,
        status: t.status,
        notes: t.notes,
      }
    }),
    summary: {
      execution: {
        overall: summarise(exec.overall),
        by_goal: goals.map((g) => ({ goal: g.name, ...summarise(exec.byGoal.get(g.id)!) })),
      },
      hours: hours.byGoal.map((h) => ({
        goal: goalById.get(h.goalId)!.name,
        actual: h.actual,
        target: h.target,
        minimum: h.minimum,
        level: h.level,
      })),
      other_hours: hours.other,
    },
  }
  // The vision is private: only included when explicitly asked.
  if (input.includeVision) report.cycle.vision = cycle.vision
  return report
}

/** The same week report as a readable Markdown document, in the app's language. */
export function weekReportMarkdown(report: WeekReport, t: Dict, formatDate: (d: ISODate) => string): string {
  const m = t.report
  const pct = (e: ExecutionSummary) => formatPct(e.pct === null ? null : e.pct / 100)
  const counted = (e: ExecutionSummary) => e.done + e.missed + e.overdue
  const lines: string[] = []
  lines.push(`# ${report.cycle.name} — ${m.weekOf(report.week, report.cycle.length_weeks)}`)
  lines.push('')
  lines.push(`${formatDate(report.week_start)} – ${formatDate(report.week_end)} · ${m.exported(report.exported_at.slice(0, 10))}`)
  lines.push('')

  lines.push(`## ${m.execution}`)
  lines.push('')
  lines.push(`| ${m.goal} | ${m.done} | ${m.counted} | ${m.execution} |`)
  lines.push('| --- | ---: | ---: | ---: |')
  const ex = report.summary.execution
  lines.push(`| **${m.overall}** | ${ex.overall.done} | ${counted(ex.overall)} | **${pct(ex.overall)}** |`)
  for (const g of ex.by_goal) lines.push(`| ${g.goal} | ${g.done} | ${counted(g)} | ${pct(g)} |`)
  lines.push('')
  lines.push(m.targetNote)
  lines.push('')

  lines.push(`## ${m.hours}`)
  lines.push('')
  lines.push(`| ${m.goal} | ${m.actual} | ${m.target} | ${m.minimum} | |`)
  lines.push('| --- | ---: | ---: | ---: | --- |')
  for (const h of report.summary.hours) {
    const min = h.minimum === null ? '–' : formatHours(h.minimum)
    lines.push(`| ${h.goal} | ${formatHours(h.actual)} | ${formatHours(h.target)} | ${min} | ${m.level[h.level]} |`)
  }
  if (report.summary.other_hours > 0) lines.push(`| ${m.other} | ${formatHours(report.summary.other_hours)} | | | |`)
  lines.push('')

  lines.push(`## ${m.tasks}`)
  const mark = { done: '[x]', missed: '[✗]', todo: '[ ]' } as const
  const groups: { title: string; tasks: PlanTask[] }[] = report.goals.map((g) => ({
    title: g.name,
    tasks: report.tasks.filter((x) => x.goal !== null && nameKey(x.goal) === nameKey(g.name)),
  }))
  groups.push({ title: m.other, tasks: report.tasks.filter((x) => x.goal === null) })
  for (const g of groups) {
    if (g.tasks.length === 0) continue
    lines.push('')
    lines.push(`### ${g.title}`)
    lines.push('')
    for (const x of g.tasks) {
      const meta = [
        x.tactic,
        x.planned_date ? formatDate(x.planned_date) : null,
        x.actual_hours !== null ? formatHours(x.actual_hours) : x.planned_hours !== null ? `${formatHours(x.planned_hours)} ${m.planned}` : null,
      ].filter(Boolean)
      lines.push(`- ${mark[x.status]} ${x.title}${meta.length ? ` _(${meta.join(' · ')})_` : ''}`)
      if (x.notes) lines.push(`  - ${x.notes.replace(/\n/g, ' ')}`)
    }
  }
  if (report.tasks.length === 0) {
    lines.push('')
    lines.push(m.noTasks)
  }

  if (report.cycle.vision) {
    lines.push('')
    lines.push(`## ${m.vision}`)
    lines.push('')
    lines.push(report.cycle.vision)
  }
  lines.push('')
  return lines.join('\n')
}

// ---------- BACKUP ----------

export interface BackupFile {
  schema_version: string
  kind: 'backup'
  app: string
  exported_at: string
  data: AllData
}

export function buildBackup(data: AllData, exportedAt: string): BackupFile {
  return { schema_version: SCHEMA_VERSION, kind: 'backup', app: APP_ID, exported_at: exportedAt, data }
}

type FieldKind = 'id' | 'text' | 'textNull' | 'date' | 'dateNull' | 'int' | 'num' | 'numNull' | 'bool' | 'status' | 'cycleStatus' | 'countsOptional' | 'category' | 'weekdays' | 'time' | 'timeNull' | 'timeOptional' | 'weekdaysOptional' | 'numOptional'

const FIELDS: Record<keyof AllData, Record<string, FieldKind>> = {
  cycles: {
    id: 'id', name: 'text', start_date: 'date', length_weeks: 'int', status: 'cycleStatus',
    vision: 'textNull', notes: 'text', recurring_generated: 'countsOptional', created_at: 'text', updated_at: 'text',
  },
  goals: {
    id: 'id', cycle_id: 'id', name: 'text', description: 'text', weekly_hours_target: 'num',
    weekly_hours_minimum: 'numNull', sort_order: 'num',
  },
  tactics: {
    id: 'id', goal_id: 'id', name: 'text', description: 'text', active: 'bool',
    weekly_frequency: 'numNull', sort_order: 'num',
    schedule_days: 'weekdaysOptional', schedule_time: 'timeOptional', schedule_hours: 'numOptional',
  },
  tasks: {
    id: 'id', cycle_id: 'id', week_number: 'int', title: 'text', tactic_id: 'textNull',
    planned_date: 'dateNull', planned_hours: 'numNull', actual_hours: 'numNull', status: 'status',
    miss_reason: 'textNull', notes: 'text', start_time: 'timeOptional', created_at: 'text', updated_at: 'text',
  },
  // Added in v0.2. Backups from v0.1 don't have these lists (= no habits).
  habits: {
    id: 'id', name: 'text', category: 'category', identity: 'text', intention: 'text', stack: 'text',
    attractive: 'text', two_minute: 'text', reward: 'text', days: 'weekdays', active: 'bool',
    start_date: 'date', sort_order: 'num', created_at: 'text', updated_at: 'text',
  },
  habit_checks: { id: 'id', habit_id: 'id', date: 'date' },
  focus_sessions: {
    id: 'id', task_id: 'textNull', task_title: 'text', date: 'date', started_at: 'text', minutes: 'num', completed: 'bool',
  },
  events: {
    id: 'id', title: 'text', date: 'date', start_time: 'timeNull', end_time: 'timeNull',
    repeat_weekly: 'bool', repeat_until: 'dateNull', notes: 'text', created_at: 'text', updated_at: 'text',
  },
}

/** Lists that older backups may not have yet. */
const OPTIONAL_TABLES: (keyof AllData)[] = ['habits', 'habit_checks', 'events', 'focus_sessions']

function fieldOk(kind: FieldKind, v: unknown): boolean {
  switch (kind) {
    case 'id': return typeof v === 'string' && v !== ''
    case 'text': return typeof v === 'string'
    case 'textNull': return v === null || typeof v === 'string'
    case 'date': return typeof v === 'string' && isValidDate(v)
    case 'dateNull': return v === null || (typeof v === 'string' && isValidDate(v))
    case 'int': return typeof v === 'number' && Number.isInteger(v) && v >= 1
    case 'num': return typeof v === 'number' && Number.isFinite(v)
    case 'numNull': return v === null || (typeof v === 'number' && Number.isFinite(v))
    case 'bool': return typeof v === 'boolean'
    case 'status': return STATUSES.includes(v as TaskStatus)
    case 'cycleStatus': return v === 'planning' || v === 'active' || v === 'closed'
    // Optional (added in v0.2): { "week|tacticId": number }
    case 'countsOptional':
      return v === undefined || (isObj(v) && Object.values(v).every((n) => typeof n === 'number'))
    case 'time': return typeof v === 'string' && isValidTime(v)
    case 'timeNull': return v === null || (typeof v === 'string' && isValidTime(v))
    case 'timeOptional': return v === undefined || v === null || (typeof v === 'string' && isValidTime(v))
    case 'weekdaysOptional':
      return v === undefined || v === null || (Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 1 && d <= 7))
    case 'numOptional': return v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v))
    case 'category': return HABIT_CATEGORIES.includes(v as HabitCategory)
    case 'weekdays':
      return Array.isArray(v) && v.length > 0 && v.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)
  }
}

/**
 * Checks a backup file before restoring it. Every record must be complete and
 * every link (goal → cycle, tactic → goal, task → cycle/tactic) must point to
 * a record that is in the file.
 */
export function parseBackup(input: unknown): { issues: DataIssue[]; data: AllData | null; exportedAt: string | null } {
  const fail = (issues: DataIssue[]) => ({ issues, data: null, exportedAt: null })
  if (!isObj(input)) return fail([{ code: 'notObject' }])
  if (input.kind !== 'backup' || !isObj(input.data)) return fail([{ code: 'notBackup' }])
  if (input.schema_version !== SCHEMA_VERSION) return fail([{ code: 'version', detail: String(input.schema_version ?? '') }])

  const r = new Reader()
  const raw = input.data
  const data = {} as AllData
  const ids = new Set<string>()
  for (const table of Object.keys(FIELDS) as (keyof AllData)[]) {
    const list = raw[table] === undefined && OPTIONAL_TABLES.includes(table) ? [] : raw[table]
    if (!Array.isArray(list)) {
      r.add('list', `data.${table}`)
      continue
    }
    list.forEach((rec, i) => {
      const path = `data.${table}[${i}]`
      if (!isObj(rec)) return r.add('record', path)
      for (const [field, kind] of Object.entries(FIELDS[table])) {
        if (!fieldOk(kind, rec[field])) r.add('record', `${path}.${field}`)
      }
      if (typeof rec.id === 'string') {
        if (ids.has(rec.id)) r.add('duplicateId', path, rec.id)
        ids.add(rec.id)
      }
    })
    ;(data as unknown as Record<string, unknown[]>)[table] = list
  }
  if (r.issues.length > 0) return fail(r.issues)

  // Links between records.
  const cycleIds = new Set(data.cycles.map((c) => c.id))
  const goalIds = new Set(data.goals.map((g) => g.id))
  const tacticIds = new Set(data.tactics.map((t) => t.id))
  data.goals.forEach((g, i) => cycleIds.has(g.cycle_id) || r.add('link', `data.goals[${i}].cycle_id`))
  data.tactics.forEach((t, i) => goalIds.has(t.goal_id) || r.add('link', `data.tactics[${i}].goal_id`))
  data.tasks.forEach((t, i) => {
    if (!cycleIds.has(t.cycle_id)) r.add('link', `data.tasks[${i}].cycle_id`)
    if (t.tactic_id !== null && !tacticIds.has(t.tactic_id)) r.add('link', `data.tasks[${i}].tactic_id`)
  })
  const habitIds = new Set(data.habits.map((h) => h.id))
  data.habit_checks.forEach((c, i) => habitIds.has(c.habit_id) || r.add('link', `data.habit_checks[${i}].habit_id`))
  if (data.cycles.filter((c) => c.status === 'active').length > 1) r.add('manyActive')
  if (r.issues.length > 0) return fail(r.issues)

  // Keep only the known fields (drops anything unexpected).
  const pick = <T,>(rec: T, table: keyof AllData): T =>
    Object.fromEntries(
      Object.keys(FIELDS[table])
        .filter((f) => (rec as Obj)[f] !== undefined)
        .map((f) => [f, (rec as Obj)[f]]),
    ) as T
  return {
    issues: [],
    data: {
      cycles: data.cycles.map((x) => pick(x, 'cycles')),
      goals: data.goals.map((x) => pick(x, 'goals')),
      tactics: data.tactics.map((x) => pick(x, 'tactics')),
      tasks: data.tasks.map((x) => pick(x, 'tasks')),
      habits: data.habits.map((x) => pick(x, 'habits')),
      habit_checks: data.habit_checks.map((x) => pick(x, 'habit_checks')),
      events: data.events.map((x) => pick(x, 'events')),
      focus_sessions: data.focus_sessions.map((x) => pick(x, 'focus_sessions')),
    },
    exportedAt: typeof input.exported_at === 'string' ? input.exported_at : null,
  }
}

// ---------- file names ----------

/** "week_03_report.json" / "week_03_report.md" (ignored by git). */
export const weekReportFileName = (week: number, ext: 'json' | 'md') =>
  `week_${String(week).padStart(2, '0')}_report.${ext}`

/** "12wt-backup-2026-11-23.json" (ignored by git). */
export const backupFileName = (date: ISODate) => `12wt-backup-${date}.json`
