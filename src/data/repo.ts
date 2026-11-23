// Data-access layer: the ONLY place that reads or writes stored data.
//
// Screens call these functions and never touch the database directly. To move
// to a cloud database later, rewrite this file (and `useLive.ts`) and keep the
// same function names; the UI does not need to change.
import { db } from './db'
import { nameKey, type ImportPlan, type PlanTactic } from '../logic/exchange'
import { planRecurring, weeksToPrepare } from '../logic/taskActions'
import { DEFAULT_FOCUS_SETTINGS, finishPhase, focusMinutesDone, type FocusSettings, type FocusState } from '../logic/focus'
import { todayISO } from '../logic/weeks'
import type {
  AllData,
  CalendarEvent,
  Cycle,
  FocusSession,
  CycleStatus,
  Goal,
  Habit,
  HabitCheck,
  ISODate,
  PersistStatus,
  SettingKey,
  SettingValues,
  Tactic,
  Task,
  TaskStatus,
} from './types'

// ---------- helpers ----------

/** A new random id. */
export const newId = (): string => crypto.randomUUID()

/** Current time as an ISO timestamp. */
const now = (): string => new Date().toISOString()

/** Fields the repo fills in automatically when creating a record. */
type AutoFields = 'id' | 'created_at' | 'updated_at'

// ---------- cycles ----------

export async function listCycles(): Promise<Cycle[]> {
  const cycles = await db.cycles.toArray()
  // Newest first.
  return cycles.sort((a, b) => b.start_date.localeCompare(a.start_date))
}

export async function getCycle(id: string): Promise<Cycle | undefined> {
  return db.cycles.get(id)
}

/** The cycle currently being executed, if any (there is at most one). */
export async function getActiveCycle(): Promise<Cycle | undefined> {
  return db.cycles.where('status').equals('active').first()
}

export async function createCycle(
  data: Omit<Cycle, AutoFields | 'status'> & { status?: CycleStatus },
): Promise<Cycle> {
  const cycle: Cycle = {
    ...data,
    status: data.status ?? 'planning',
    id: newId(),
    created_at: now(),
    updated_at: now(),
  }
  if (cycle.status === 'active') await assertNoOtherActive(cycle.id)
  await db.cycles.add(cycle)
  return cycle
}

export async function updateCycle(
  id: string,
  changes: Partial<Omit<Cycle, AutoFields>>,
): Promise<void> {
  if (changes.status === 'active') await assertNoOtherActive(id)
  await db.cycles.update(id, { ...changes, updated_at: now() })
}

/** Only one cycle may be active at a time; close the old one first. */
async function assertNoOtherActive(id: string): Promise<void> {
  const active = await getActiveCycle()
  if (active && active.id !== id) {
    throw new Error(`Cycle "${active.name}" is still active. Close it before starting another.`)
  }
}

/** A complete new cycle as produced by the setup wizard. */
export interface NewCyclePlan {
  cycle: Omit<Cycle, AutoFields | 'status'>
  goals: Array<
    Omit<Goal, 'id' | 'cycle_id' | 'sort_order'> & {
      tactics: Array<Omit<Tactic, 'id' | 'goal_id' | 'sort_order' | 'active'>>
    }
  >
}

/**
 * "Start cycle" from the setup wizard: closes the currently active cycle (if
 * any) and creates the new active cycle with its goals and tactics.
 * One transaction: if anything fails, nothing changes.
 */
export async function startNewCycle(plan: NewCyclePlan): Promise<Cycle> {
  return db.transaction('rw', db.cycles, db.goals, db.tactics, async () => {
    await db.cycles
      .where('status')
      .equals('active')
      .modify({ status: 'closed', updated_at: now() })
    const cycle: Cycle = {
      ...plan.cycle,
      status: 'active',
      id: newId(),
      created_at: now(),
      updated_at: now(),
    }
    await db.cycles.add(cycle)
    for (const [gi, { tactics, ...g }] of plan.goals.entries()) {
      const goal: Goal = { ...g, id: newId(), cycle_id: cycle.id, sort_order: gi }
      await db.goals.add(goal)
      await db.tactics.bulkAdd(
        tactics.map((t, ti) => ({ ...t, id: newId(), goal_id: goal.id, sort_order: ti, active: true })),
      )
    }
    return cycle
  })
}

/** Deletes a cycle and everything inside it (goals, tactics, tasks). */
export async function deleteCycle(id: string): Promise<void> {
  await db.transaction('rw', db.cycles, db.goals, db.tactics, db.tasks, async () => {
    const goalIds = (await db.goals.where('cycle_id').equals(id).primaryKeys()) as string[]
    await db.tactics.where('goal_id').anyOf(goalIds).delete()
    await db.goals.where('cycle_id').equals(id).delete()
    await db.tasks.where('cycle_id').equals(id).delete()
    await db.cycles.delete(id)
  })
}

// ---------- goals ----------

/** Goals of a cycle, in display order. */
export async function listGoals(cycleId: string): Promise<Goal[]> {
  const goals = await db.goals.where('cycle_id').equals(cycleId).toArray()
  return goals.sort((a, b) => a.sort_order - b.sort_order)
}

export async function createGoal(
  data: Omit<Goal, 'id' | 'sort_order'> & { sort_order?: number },
): Promise<Goal> {
  const count = await db.goals.where('cycle_id').equals(data.cycle_id).count()
  const goal: Goal = { ...data, sort_order: data.sort_order ?? count, id: newId() }
  await db.goals.add(goal)
  return goal
}

export async function updateGoal(id: string, changes: Partial<Omit<Goal, 'id'>>): Promise<void> {
  await db.goals.update(id, changes)
}

/**
 * Deletes a goal and its tactics. Tasks that were linked to those tactics are
 * kept but become "Other" (tactic_id = null), so no history is lost.
 */
export async function deleteGoal(id: string): Promise<void> {
  await db.transaction('rw', db.goals, db.tactics, db.tasks, async () => {
    const tacticIds = (await db.tactics.where('goal_id').equals(id).primaryKeys()) as string[]
    await unlinkTasksFromTactics(tacticIds)
    await db.tactics.where('goal_id').equals(id).delete()
    await db.goals.delete(id)
  })
}

// ---------- tactics ----------

/** Tactics of one goal, in display order. */
export async function listTactics(goalId: string): Promise<Tactic[]> {
  const tactics = await db.tactics.where('goal_id').equals(goalId).toArray()
  return tactics.sort((a, b) => a.sort_order - b.sort_order)
}

/** All tactics of all goals in a cycle, in display order. */
export async function listTacticsForCycle(cycleId: string): Promise<Tactic[]> {
  const goals = await listGoals(cycleId)
  const goalOrder = new Map(goals.map((g) => [g.id, g.sort_order]))
  const tactics = await db.tactics.where('goal_id').anyOf([...goalOrder.keys()]).toArray()
  return tactics.sort(
    (a, b) =>
      goalOrder.get(a.goal_id)! - goalOrder.get(b.goal_id)! || a.sort_order - b.sort_order,
  )
}

export async function createTactic(
  data: Omit<Tactic, 'id' | 'sort_order' | 'active'> & { sort_order?: number; active?: boolean },
): Promise<Tactic> {
  const count = await db.tactics.where('goal_id').equals(data.goal_id).count()
  const tactic: Tactic = {
    ...data,
    active: data.active ?? true,
    sort_order: data.sort_order ?? count,
    id: newId(),
  }
  await db.tactics.add(tactic)
  return tactic
}

export async function updateTactic(
  id: string,
  changes: Partial<Omit<Tactic, 'id'>>,
): Promise<void> {
  await db.tactics.update(id, changes)
}

/** Deletes a tactic. Its tasks are kept and become "Other". */
export async function deleteTactic(id: string): Promise<void> {
  await db.transaction('rw', db.tactics, db.tasks, async () => {
    await unlinkTasksFromTactics([id])
    await db.tactics.delete(id)
  })
}

async function unlinkTasksFromTactics(tacticIds: string[]): Promise<void> {
  if (tacticIds.length === 0) return
  await db.tasks
    .where('tactic_id')
    .anyOf(tacticIds)
    .modify({ tactic_id: null, updated_at: now() })
}

// ---------- tasks ----------

/** Tasks of one week, sorted by date (undated last), then by creation. */
export async function listTasksForWeek(cycleId: string, week: number): Promise<Task[]> {
  const tasks = await db.tasks.where('[cycle_id+week_number]').equals([cycleId, week]).toArray()
  return sortTasks(tasks)
}

/** All tasks in a cycle. */
export async function listTasksForCycle(cycleId: string): Promise<Task[]> {
  return sortTasks(await db.tasks.where('cycle_id').equals(cycleId).toArray())
}

function sortTasks(tasks: Task[]): Task[] {
  return tasks.sort(
    (a, b) =>
      (a.planned_date ?? '9999').localeCompare(b.planned_date ?? '9999') ||
      a.created_at.localeCompare(b.created_at),
  )
}

/** What you need to give to create a task; everything else has defaults. */
export type NewTask = Pick<Task, 'cycle_id' | 'week_number' | 'title'> &
  Partial<Omit<Task, AutoFields | 'cycle_id' | 'week_number' | 'title'>>

function buildTask(data: NewTask, createdAt = now()): Task {
  return {
    tactic_id: null,
    planned_date: null,
    planned_hours: null,
    actual_hours: null,
    status: 'todo',
    miss_reason: null,
    notes: '',
    ...data,
    id: newId(),
    created_at: createdAt,
    updated_at: createdAt,
  }
}

export async function createTask(data: NewTask): Promise<Task> {
  const task = buildTask(data)
  await db.tasks.add(task)
  return task
}

/** Creates many tasks at once (all or nothing). */
export async function createTasks(list: NewTask[]): Promise<Task[]> {
  // Each task gets a creation time 1 ms after the previous one, so they keep
  // the given order when the list is sorted (e.g. "Run (1/3)", "(2/3)", "(3/3)").
  const start = Date.now()
  const tasks = list.map((t, i) => buildTask(t, new Date(start + i).toISOString()))
  await db.tasks.bulkAdd(tasks)
  return tasks
}

export async function updateTask(
  id: string,
  changes: Partial<Omit<Task, AutoFields>>,
): Promise<void> {
  await db.tasks.update(id, { ...changes, updated_at: now() })
}

/**
 * The one-click action from Home: mark a task done / missed / back to todo.
 *
 * To save typing at night: when a task is marked DONE and no actual hours are
 * filled in, the planned hours are copied over. If it is later moved away
 * from done, that automatic value is removed again.
 */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  let actual = task.actual_hours
  if (status === 'done' && actual === null) {
    actual = task.planned_hours
  } else if (status !== 'done' && task.status === 'done' && actual === task.planned_hours) {
    actual = null
  }
  await updateTask(id, { status, actual_hours: actual })
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}

// ---------- settings (device-specific, not in backups) ----------

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingValues[K] | undefined> {
  const row = await db.settings.get(key)
  return row?.value as SettingValues[K] | undefined
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValues[K],
): Promise<void> {
  await db.settings.put({ key, value })
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await db.settings.delete(key)
}

// ---------- habits (not tied to a cycle) ----------

export async function listHabits(): Promise<Habit[]> {
  const habits = await db.habits.toArray()
  return habits.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
}

export type NewHabit = Omit<Habit, AutoFields | 'sort_order' | 'active' | 'start_date'> &
  Partial<Pick<Habit, 'active' | 'start_date'>>

export async function createHabit(data: NewHabit, today: ISODate): Promise<Habit> {
  const habit: Habit = {
    active: true,
    start_date: today,
    ...data,
    sort_order: await db.habits.count(),
    id: newId(),
    created_at: now(),
    updated_at: now(),
  }
  await db.habits.add(habit)
  return habit
}

export async function updateHabit(id: string, changes: Partial<Omit<Habit, AutoFields>>): Promise<void> {
  await db.habits.update(id, { ...changes, updated_at: now() })
}

/** Deletes a habit and all its ticks. */
export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.habit_checks, async () => {
    await db.habit_checks.where('habit_id').equals(id).delete()
    await db.habits.delete(id)
  })
}

/** Ticks on or after `from` (all habits). */
export async function listHabitChecks(from: ISODate): Promise<HabitCheck[]> {
  return db.habit_checks.where('date').aboveOrEqual(from).toArray()
}

/** Ticks / unticks a habit for one day. Returns true when it is now done. */
export async function toggleHabitCheck(habitId: string, date: ISODate): Promise<boolean> {
  const id = `${habitId}|${date}`
  return db.transaction('rw', db.habit_checks, async () => {
    if (await db.habit_checks.get(id)) {
      await db.habit_checks.delete(id)
      return false
    }
    await db.habit_checks.add({ id, habit_id: habitId, date })
    return true
  })
}

// ---------- calendar events ----------

/** All events (there are few; repeats are expanded in logic/calendar.ts). */
export async function listEvents(): Promise<CalendarEvent[]> {
  return db.events.toArray()
}

export type NewEvent = Omit<CalendarEvent, AutoFields>

export async function createEvent(data: NewEvent): Promise<CalendarEvent> {
  const event: CalendarEvent = { ...data, id: newId(), created_at: now(), updated_at: now() }
  await db.events.add(event)
  return event
}

export async function updateEvent(id: string, changes: Partial<NewEvent>): Promise<void> {
  await db.events.update(id, { ...changes, updated_at: now() })
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id)
}

// ---------- focus (pomodoro) ----------

/** Focus sessions on or after `from`. */
export async function listFocusSessions(from: ISODate): Promise<FocusSession[]> {
  const list = await db.focus_sessions.where('date').aboveOrEqual(from).toArray()
  return list.sort((a, b) => a.started_at.localeCompare(b.started_at))
}

/**
 * Saves a focus session and adds its minutes to the task's actual hours.
 * Call inside a transaction on settings, focus_sessions and tasks.
 */
async function saveFocusInTx(taskId: string | null, minutes: number, startedAt: string, completed: boolean): Promise<void> {
  if (minutes < 1) return
  const task = taskId ? await db.tasks.get(taskId) : undefined
  await db.focus_sessions.add({
    id: newId(),
    task_id: task ? task.id : null,
    task_title: task?.title ?? '',
    date: todayISO(new Date(startedAt)),
    started_at: startedAt,
    minutes,
    completed,
  })
  if (task) {
    const hours = Math.round(((task.actual_hours ?? 0) + minutes / 60) * 100) / 100
    await db.tasks.update(task.id, { actual_hours: hours, updated_at: now() })
  }
}

export async function getFocusSettings(): Promise<FocusSettings> {
  return (await getSetting('focusSettings')) ?? DEFAULT_FOCUS_SETTINGS
}

export async function getFocusState(): Promise<FocusState | null> {
  return (await getSetting('focusTimer')) ?? null
}

export async function setFocusState(state: FocusState | null): Promise<void> {
  await setSetting('focusTimer', state)
}

/**
 * Called every second while the app is open: when the running phase has
 * ended, moves the timer on (focus → break → ready) and records a finished
 * focus round. It is one transaction, so a round is never recorded twice,
 * even with the app open in two tabs. Returns the phase that just ended.
 */
export async function focusTick(nowMs: number): Promise<FocusState['phase'] | null> {
  return db.transaction('rw', db.settings, db.focus_sessions, db.tasks, async () => {
    const state = await getFocusState()
    if (!state || state.endsAt === null || nowMs < state.endsAt) return null
    const settings = await getFocusSettings()
    const { state: next, record } = finishPhase(state, settings, state.endsAt)
    if (record !== null && state.startedAt) await saveFocusInTx(state.taskId, record, state.startedAt, true)
    await setFocusState(next)
    return state.phase
  })
}

/** Stop button: saves the whole minutes done in this focus round when `save`. */
export async function stopFocus(nowMs: number, save: boolean): Promise<number> {
  return db.transaction('rw', db.settings, db.focus_sessions, db.tasks, async () => {
    const state = await getFocusState()
    if (!state) return 0
    const minutes = save && state.startedAt ? focusMinutesDone(state, await getFocusSettings(), nowMs) : 0
    if (minutes > 0) await saveFocusInTx(state.taskId, minutes, state.startedAt!, false)
    await setFocusState(null)
    return minutes
  })
}

// ---------- whole database (backup / restore / import) ----------

/** The tables a backup contains, in the order they are restored. */
const DATA_TABLES = ['cycles', 'goals', 'tactics', 'tasks', 'habits', 'habit_checks', 'events', 'focus_sessions'] as const
const dataTables = () => DATA_TABLES.map((name) => db.table(name))

/** Everything the user created, for a full backup. */
export async function exportAll(): Promise<AllData> {
  const lists = await Promise.all(dataTables().map((t) => t.toArray()))
  return Object.fromEntries(DATA_TABLES.map((name, i) => [name, lists[i]])) as unknown as AllData
}

/**
 * RESTORE: deletes all current data (cycles, goals, tactics, tasks, habits)
 * and replaces it with `data`. Settings (backup folder etc.) are kept. Runs
 * as one transaction: if anything fails, nothing changes.
 */
export async function replaceAll(data: AllData): Promise<void> {
  await db.transaction('rw', dataTables(), async () => {
    await Promise.all(dataTables().map((t) => t.clear()))
    for (const name of DATA_TABLES) await db.table(name).bulkAdd(data[name])
  })
}

/**
 * IMPORT: adds new records without changing or deleting existing ones.
 * Runs as one transaction: either everything is added or nothing is.
 */
export async function addAll(data: AllData): Promise<void> {
  await db.transaction('rw', dataTables(), async () => {
    for (const c of data.cycles) if (c.status === 'active') await assertNoOtherActive(c.id)
    for (const name of DATA_TABLES) await db.table(name).bulkAdd(data[name])
  })
}

/**
 * AUTOMATIC RECURRING TASKS: creates this week's tasks from the active
 * cycle's tactics (and next week's, from Saturday). Safe to call as often as
 * you like: what was already created is remembered on the cycle, so nothing
 * is duplicated and deleted tasks don't come back. Returns how many tasks
 * were created.
 */
export async function ensureRecurringTasks(today: ISODate): Promise<number> {
  return db.transaction('rw', db.cycles, db.goals, db.tactics, db.tasks, async () => {
    const cycle = await getActiveCycle()
    if (!cycle) return 0
    const weeks = weeksToPrepare(cycle, today)
    if (weeks.length === 0) return 0
    const tactics = await listTacticsForCycle(cycle.id)
    let generated = cycle.recurring_generated ?? {}
    const toCreate: NewTask[] = []
    for (const week of weeks) {
      const weekTasks = await db.tasks.where('[cycle_id+week_number]').equals([cycle.id, week]).toArray()
      const plan = planRecurring(cycle.id, week, tactics, weekTasks, generated)
      toCreate.push(...plan.tasks)
      generated = plan.generated
    }
    if (JSON.stringify(generated) === JSON.stringify(cycle.recurring_generated ?? {})) return 0
    await db.cycles.update(cycle.id, { recurring_generated: generated })
    const start = Date.now()
    await db.tasks.bulkAdd(toCreate.map((t, i) => buildTask(t, new Date(start + i).toISOString())))
    return toCreate.length
  })
}

/**
 * IMPORT from a file (see logic/exchange.ts): adds the plan's new cycle (if
 * any), new goals, new tactics and tasks, resolving goal/tactic NAMES to ids.
 * Nothing existing is changed. One transaction: all or nothing.
 * Returns the id of the cycle the data went into.
 */
export async function applyImport(plan: ImportPlan): Promise<string> {
  return db.transaction('rw', db.cycles, db.goals, db.tactics, db.tasks, async () => {
    let cycleId: string
    if (plan.cycle.kind === 'new') {
      const active = await getActiveCycle()
      if (active) throw new Error(`Cycle "${active.name}" is still active.`)
      const cycle: Cycle = { ...plan.cycle.data, id: newId(), status: 'active', created_at: now(), updated_at: now() }
      await db.cycles.add(cycle)
      cycleId = cycle.id
    } else {
      cycleId = plan.cycle.id
    }

    const goals = await listGoals(cycleId)
    const goalByKey = new Map(goals.map((g) => [nameKey(g.name), g]))
    let goalOrder = goals.reduce((max, g) => Math.max(max, g.sort_order + 1), 0)
    const tacticIds = new Map<string, string>() // "goal|tactic" key → id
    const tacticKeyOf = (goal: string, tactic: string) => `${nameKey(goal)}\u0000${nameKey(tactic)}`
    for (const t of await listTacticsForCycle(cycleId)) {
      const g = goals.find((x) => x.id === t.goal_id)
      if (g) tacticIds.set(tacticKeyOf(g.name, t.name), t.id)
    }
    const addTactic = async (goal: Goal, t: PlanTactic) => {
      const order = await db.tactics.where('goal_id').equals(goal.id).count()
      const tactic: Tactic = { ...t, id: newId(), goal_id: goal.id, sort_order: order }
      await db.tactics.add(tactic)
      tacticIds.set(tacticKeyOf(goal.name, t.name), tactic.id)
    }

    for (const g of plan.newGoals) {
      const { tactics, ...fields } = g
      const goal: Goal = { ...fields, id: newId(), cycle_id: cycleId, sort_order: goalOrder++ }
      await db.goals.add(goal)
      goalByKey.set(nameKey(goal.name), goal)
      for (const t of tactics) await addTactic(goal, t)
    }
    for (const { goal, tactic } of plan.newTactics) {
      const g = goalByKey.get(nameKey(goal))
      if (g) await addTactic(g, tactic)
    }

    const start = Date.now()
    const tasks = plan.tasks.map((x, i) => {
      const { goal, tactic, ...fields } = x
      const tacticId = goal && tactic ? (tacticIds.get(tacticKeyOf(goal, tactic)) ?? null) : null
      return buildTask({ ...fields, cycle_id: cycleId, tactic_id: tacticId }, new Date(start + i).toISOString())
    })
    await db.tasks.bulkAdd(tasks)
    return cycleId
  })
}

/** True when nothing has been created yet (first run). */
export async function isEmpty(): Promise<boolean> {
  return (await db.cycles.count()) === 0
}

// ---------- persistent storage ----------

/**
 * Asks the browser to keep our data even when the disk is low ("persistent
 * storage"). Without it, the browser may delete the data of sites you
 * haven't visited in a while. Chrome/Edge decide automatically (it is more
 * likely to be granted once the app is installed), so we ask again on every
 * start until it is granted. The result is saved and shown in the app.
 */
export async function requestPersistentStorage(): Promise<PersistStatus> {
  let status: PersistStatus = 'unsupported'
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    const already = await navigator.storage.persisted()
    const granted = already || (await navigator.storage.persist())
    status = granted ? 'granted' : 'not-granted'
  }
  await setSetting('storagePersisted', status)
  return status
}
