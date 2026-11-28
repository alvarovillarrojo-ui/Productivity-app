// Data-access layer: the ONLY place that reads or writes stored data.
//
// Screens call these functions and never touch the database directly. To move
// to a cloud database later, rewrite this file (and `useLive.ts`) and keep the
// same function names; the UI does not need to change.
import { AREA_DEFAULT_COLORS, missingFixedAreas } from '../logic/areas'
import { sortProjects, stepWeek } from '../logic/projects'
import { db } from './db'
import { nameKey, type ImportPlan, type PlanTactic } from '../logic/exchange'
import { planRecurring, planRoutines, scheduleOf, weeksToPrepare } from '../logic/taskActions'
import type { IcsEvent } from '../logic/ics'
import type { FileExam, FileTopic, SubjectsPlan } from '../logic/subjectsImport'
import { DEFAULT_FOCUS_SETTINGS, finishPhase, focusMinutesDone, type FocusSettings, type FocusState } from '../logic/focus'
import { addDays, todayISO, weekStart } from '../logic/weeks'
import type {
  AllData,
  CalendarEvent,
  Cycle,
  DayEntry,
  EventCategory,
  StudyLog,
  Exam,
  FixedArea,
  FocusSession,
  Subject,
  Topic,
  CycleStatus,
  Goal,
  Habit,
  HabitCheck,
  InboxItem,
  Project,
  Routine,
  ISODate,
  MissCause,
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

/** All cycles (newest first) with how many goals and tasks each has. */
export async function listCyclesWithCounts(): Promise<{ cycle: Cycle; goals: number; tasks: number }[]> {
  const cycles = await listCycles()
  return Promise.all(
    cycles.map(async (cycle) => ({
      cycle,
      goals: await db.goals.where('cycle_id').equals(cycle.id).count(),
      tasks: await db.tasks.where('cycle_id').equals(cycle.id).count(),
    })),
  )
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
    // Anything created by hand or imported is a task to do; recurring
    // generation passes kind 'block' itself.
    kind: 'todo',
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
 * from done, that automatic value is removed again. A ½ (minimum version)
 * copies nothing: fill in its real hours if you want them counted.
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
  // The cause only makes sense for a missed task.
  await updateTask(id, { status, actual_hours: actual, ...(status !== 'missed' ? { miss_reason: null } : {}) })
}

/** Why a missed task failed (or null to clear it). */
export async function setMissReason(id: string, cause: MissCause | null): Promise<void> {
  await updateTask(id, { miss_reason: cause })
}

/** Deletes a task. Tasks that were inside it (if it was a block) are kept, unlinked. */
export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.filter((t) => t.block_id === id).modify({ block_id: null })
    await db.tasks.delete(id)
  })
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

/** Hides a calendar group, or shows it again (one locked step, so quick taps all count). */
export async function toggleCalendarGroup(group: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get('calendarHidden')
    const current = (row?.value as string[] | undefined) ?? []
    await db.settings.put({ key: 'calendarHidden', value: current.includes(group) ? current.filter((x) => x !== group) : [...current, group] })
  })
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

/**
 * Saves events read from an .ics file. An event already imported before (same
 * calendar id) is updated instead of added again. One transaction.
 */
export async function importIcsEvents(events: IcsEvent[], kind: 'class' | 'deadline' | 'other' = 'other'): Promise<{ added: number; updated: number }> {
  return db.transaction('rw', db.events, async () => {
    const existing = new Map((await db.events.toArray()).filter((e) => e.ics_uid).map((e) => [e.ics_uid!, e]))
    let added = 0
    let updated = 0
    for (const raw of events) {
      const e = { ...raw, kind: raw.kind ?? kind }
      const old = existing.get(e.ics_uid)
      if (old) {
        await db.events.update(old.id, { ...e, updated_at: now() })
        updated++
      } else {
        await db.events.add({ ...e, id: newId(), created_at: now(), updated_at: now() })
        added++
      }
    }
    return { added, updated }
  })
}

// ---------- event colour categories ----------

export async function listCategories(): Promise<EventCategory[]> {
  return (await db.categories.toArray()).sort((a, b) => a.sort_order - b.sort_order)
}

export async function createCategory(name: string, color: string): Promise<EventCategory> {
  const category: EventCategory = { id: newId(), name, color, sort_order: await db.categories.count() }
  await db.categories.add(category)
  return category
}

export async function updateCategory(id: string, changes: Partial<Omit<EventCategory, 'id'>>): Promise<void> {
  await db.categories.update(id, changes)
}

/**
 * Makes sure the fixed areas exist (Uni, Day to day, Travel, Exams, Deadlines).
 * A category you already called e.g. "Uni" becomes the fixed one (it keeps its colour).
 * `names`: their names in your language, used only when one is created.
 */
export async function ensureFixedAreas(names: Record<FixedArea, string>): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const all = await db.categories.toArray()
    for (const area of missingFixedAreas(all)) {
      const same = all.find((c) => !c.fixed && nameKey(c.name) === nameKey(names[area]))
      if (same) {
        await db.categories.update(same.id, { fixed: area })
        same.fixed = area
        continue
      }
      const created: EventCategory = { id: newId(), name: names[area], color: AREA_DEFAULT_COLORS[area], sort_order: all.length, fixed: area }
      await db.categories.add(created)
      all.push(created)
    }
  })
}

/** Deletes a category (never a fixed area). Its events keep the colour they had, without a category. */
export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', db.categories, db.events, async () => {
    const category = await db.categories.get(id)
    if (!category || category.fixed) return
    await db.events.filter((e) => e.category_id === id).modify({ category_id: null, color: category.color })
    await db.categories.delete(id)
  })
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
/** What a free pomodoro was for (subject → topic or exam/project). */
type FocusFor = Pick<FocusState, 'subjectId' | 'topicId' | 'examId'>

async function saveFocusInTx(taskId: string | null, minutes: number, startedAt: string, completed: boolean, study: FocusFor = {}): Promise<void> {
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
    subject_id: task ? null : (study.subjectId ?? null),
    topic_id: task ? null : (study.topicId ?? null),
    exam_id: task ? null : (study.examId ?? null),
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
    if (record !== null && state.startedAt) await saveFocusInTx(state.taskId, record, state.startedAt, true, state)
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
    if (minutes > 0) await saveFocusInTx(state.taskId, minutes, state.startedAt!, false, state)
    await setFocusState(null)
    return minutes
  })
}

// ---------- day journal (opening / closing) ----------

export const DEFAULT_DAY_WINDOW = { start: '08:30', end: '22:30' }

export async function getDay(date: ISODate): Promise<DayEntry | null> {
  return (await db.days.get(date)) ?? null
}

/** Changes one day's entry (creating it if needed). */
export async function updateDay(date: ISODate, changes: Partial<Omit<DayEntry, 'date'>>): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const current = (await db.days.get(date)) ?? { date, must_do: null, mode: null, reflection: '', opened_at: null, closed_at: null }
    await db.days.put({ ...current, ...changes, date })
  })
}

/** Day entries between two dates (both included), oldest first. */
export async function listDays(from: ISODate, to: ISODate): Promise<DayEntry[]> {
  return db.days.where('date').between(from, to, true, true).toArray()
}

export async function getDayWindow(): Promise<{ start: string; end: string }> {
  return (await getSetting('dayWindow')) ?? DEFAULT_DAY_WINDOW
}

// ---------- students: subjects, topics, exams ----------

export async function listSubjects(): Promise<Subject[]> {
  return (await db.subjects.toArray()).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
}

export async function createSubject(name: string): Promise<Subject> {
  const subject: Subject = {
    id: newId(),
    name,
    color: null,
    info: '',
    weekly_hours_target: null,
    archived: false,
    sort_order: await db.subjects.count(),
    created_at: now(),
    updated_at: now(),
  }
  await db.subjects.add(subject)
  return subject
}

export async function updateSubject(id: string, changes: Partial<Omit<Subject, AutoFields>>): Promise<void> {
  await db.subjects.update(id, { ...changes, updated_at: now() })
}

/** Deletes a subject with its topics, exams and logged hours; its tasks are kept (without subject). */
export async function deleteSubject(id: string): Promise<void> {
  await db.transaction('rw', [db.subjects, db.topics, db.exams, db.tasks, db.focus_sessions, db.study_logs, db.projects], async () => {
    await db.topics.where('subject_id').equals(id).delete()
    await db.exams.where('subject_id').equals(id).delete()
    await db.study_logs.where('subject_id').equals(id).delete()
    await db.tasks.where('subject_id').equals(id).modify({ subject_id: null, topic_id: null, exam_id: null })
    await db.projects.filter((p) => p.subject_id === id).modify({ subject_id: null, exam_id: null })
    await db.focus_sessions.filter((s) => s.subject_id === id).modify({ subject_id: null, topic_id: null, exam_id: null })
    await db.subjects.delete(id)
  })
}

export async function listTopics(subjectId?: string): Promise<Topic[]> {
  const list = subjectId ? await db.topics.where('subject_id').equals(subjectId).toArray() : await db.topics.toArray()
  return list.sort((a, b) => a.sort_order - b.sort_order)
}

export async function createTopic(subjectId: string, name: string): Promise<Topic> {
  const topic: Topic = {
    id: newId(),
    subject_id: subjectId,
    name,
    status: 'todo',
    difficult: false,
    notes: '',
    sort_order: await db.topics.where('subject_id').equals(subjectId).count(),
  }
  await db.topics.add(topic)
  return topic
}

export async function updateTopic(id: string, changes: Partial<Omit<Topic, 'id' | 'subject_id'>>): Promise<void> {
  await db.topics.update(id, changes)
}

export async function deleteTopic(id: string): Promise<void> {
  await db.topics.delete(id)
}

/** All exams (or one subject's), soonest first. */
export async function listExams(subjectId?: string): Promise<Exam[]> {
  const list = subjectId ? await db.exams.where('subject_id').equals(subjectId).toArray() : await db.exams.toArray()
  return list.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
}

export type NewExam = Omit<Exam, AutoFields>

export async function createExam(data: NewExam): Promise<Exam> {
  const exam: Exam = { ...data, id: newId(), created_at: now(), updated_at: now() }
  await db.exams.add(exam)
  return exam
}

export async function updateExam(id: string, changes: Partial<NewExam>): Promise<void> {
  await db.exams.update(id, { ...changes, updated_at: now() })
}

export async function deleteExam(id: string): Promise<void> {
  await db.exams.delete(id)
}

/** Tasks linked to a subject (all cycles). */
export async function listSubjectTasks(subjectId: string): Promise<Task[]> {
  return db.tasks.where('subject_id').equals(subjectId).toArray()
}

/** All tasks that have a subject (for study hours). */
export async function listStudyTasks(): Promise<Task[]> {
  return db.tasks.filter((t) => !!t.subject_id).toArray()
}

// ---------- import subjects (from a subjects file) ----------

/**
 * Adds what `planSubjectsImport` found: new subjects with their topics and
 * exams, and new topics/exams for subjects that already exist. Nothing is
 * changed or deleted. One transaction: all or nothing.
 */
export async function importSubjects(plan: SubjectsPlan): Promise<void> {
  await db.transaction('rw', db.subjects, db.topics, db.exams, async () => {
    const addTo = async (subjectId: string, topics: FileTopic[], exams: FileExam[]) => {
      let order = await db.topics.where('subject_id').equals(subjectId).count()
      for (const tp of topics) {
        await db.topics.add({ id: newId(), subject_id: subjectId, name: tp.name, status: 'todo', difficult: false, notes: tp.notes, sort_order: order++ })
      }
      for (const e of exams) {
        await db.exams.add({
          id: newId(),
          subject_id: subjectId,
          kind: e.kind,
          title: e.title,
          date: e.date,
          start_time: e.time,
          weight: e.weight,
          grade: null,
          notes: e.notes,
          ...(e.deliverables.length ? { deliverables: e.deliverables.map((d) => ({ id: newId(), title: d.title, date: d.date, start_time: d.time })) } : {}),
          created_at: now(),
          updated_at: now(),
        })
      }
    }
    let order = await db.subjects.count()
    for (const fs of plan.newSubjects) {
      const id = newId()
      await db.subjects.add({
        id,
        name: fs.name,
        color: null,
        info: fs.info,
        weekly_hours_target: fs.weekly_hours_target,
        archived: false,
        sort_order: order++,
        created_at: now(),
        updated_at: now(),
      })
      await addTo(id, fs.topics, fs.exams)
    }
    for (const a of plan.additions) await addTo(a.subject.id, a.topics, a.exams)
  })
}

// ---------- study time logged by hand ----------

/** All logged study time (or one subject's), newest first. */
export async function listStudyLogs(subjectId?: string): Promise<StudyLog[]> {
  const list = subjectId ? await db.study_logs.where('subject_id').equals(subjectId).toArray() : await db.study_logs.toArray()
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

export async function createStudyLog(data: Omit<StudyLog, 'id' | 'created_at'>): Promise<StudyLog> {
  const log: StudyLog = { ...data, id: newId(), created_at: now() }
  await db.study_logs.add(log)
  return log
}

export async function deleteStudyLog(id: string): Promise<void> {
  await db.study_logs.delete(id)
}

// ---------- projects (steps are tasks with project_id) ----------

export async function listProjects(): Promise<Project[]> {
  return sortProjects(await db.projects.toArray())
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function createProject(name: string): Promise<Project> {
  const stamp = now()
  const project: Project = {
    id: newId(), name: name.trim(), notes: '', status: 'active', deadline: null, subject_id: null, exam_id: null, tactic_id: null,
    manual_progress: null, sort_order: await db.projects.count(), created_at: stamp, updated_at: stamp,
  }
  await db.projects.add(project)
  return project
}

/** Saves changes. New links (tactic, subject, exam) also apply to all its steps. */
export async function updateProject(id: string, changes: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, async () => {
    await db.projects.update(id, { ...changes, updated_at: now() })
    const links: Partial<Task> = {}
    if ('tactic_id' in changes) links.tactic_id = changes.tactic_id ?? null
    if ('subject_id' in changes) Object.assign(links, { subject_id: changes.subject_id ?? null, topic_id: null, exam_id: null })
    if ('exam_id' in changes) links.exam_id = changes.exam_id ?? null
    if (Object.keys(links).length) await db.tasks.where('project_id').equals(id).modify({ ...links, updated_at: now() })
  })
}

/** Deletes the project; its steps stay as normal tasks. */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, async () => {
    await db.tasks.where('project_id').equals(id).modify({ project_id: null })
    await db.projects.delete(id)
  })
}

/** A project's steps (in every cycle), by date then creation. */
export async function listProjectSteps(projectId: string): Promise<Task[]> {
  const steps = await db.tasks.where('project_id').equals(projectId).toArray()
  return steps.sort((a, b) => (a.planned_date ?? '9999').localeCompare(b.planned_date ?? '9999') || a.created_at.localeCompare(b.created_at))
}

/** All steps of all projects (for progress on the list). */
export async function listAllProjectSteps(): Promise<Task[]> {
  return db.tasks.filter((t) => Boolean(t.project_id)).toArray()
}

/**
 * Adds a step: a normal task in the active cycle (the week of its date, or
 * this week), with the project's links. Fails if there is no active cycle or
 * the date is outside it.
 */
export async function addProjectStep(
  projectId: string,
  step: { title: string; date: ISODate | null; time: string | null; hours: number | null },
  today: ISODate,
): Promise<Task> {
  const [cycle, project] = await Promise.all([getActiveCycle(), db.projects.get(projectId)])
  if (!cycle) throw new Error('noCycle')
  if (!project) throw new Error('noProject')
  const week = stepWeek(cycle, step.date, today)
  if (week === null) throw new Error('outsideCycle')
  return createTask({
    cycle_id: cycle.id,
    week_number: week,
    title: step.title.trim(),
    planned_date: step.date,
    start_time: step.date ? step.time : null,
    planned_hours: step.hours,
    tactic_id: project.tactic_id,
    subject_id: project.subject_id,
    exam_id: project.exam_id,
    project_id: project.id,
  })
}

// ---------- tasks that repeat every week ----------

export async function listRoutines(): Promise<Routine[]> {
  return (await db.routines.toArray()).sort((a, b) => (a.weekday ?? 8) - (b.weekday ?? 8) || (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.title.localeCompare(b.title))
}

export async function createRoutine(data: Omit<Routine, 'id' | 'created_at' | 'active'>): Promise<Routine> {
  const routine: Routine = { ...data, title: data.title.trim(), active: true, id: newId(), created_at: now() }
  await db.routines.add(routine)
  return routine
}

/** Changes apply from the next task it creates; tasks already created stay as they are. */
export async function updateRoutine(id: string, changes: Partial<Omit<Routine, 'id' | 'created_at'>>): Promise<void> {
  await db.routines.update(id, changes)
}

/** Deletes the routine; the tasks it already created stay. */
export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id)
}

// ---------- inbox (jotted down on Home, dealt with in Day) ----------

/** Everything in the inbox, oldest first. */
export async function listInbox(): Promise<InboxItem[]> {
  return db.inbox.orderBy('created_at').toArray()
}

export async function addToInbox(text: string): Promise<InboxItem> {
  // Notes are listed by created_at: two saved in the same millisecond keep their order.
  const last = await db.inbox.orderBy('created_at').last()
  let created = now()
  if (last && created <= last.created_at) created = new Date(new Date(last.created_at).getTime() + 1).toISOString()
  const item: InboxItem = { id: newId(), text: text.trim(), created_at: created }
  await db.inbox.add(item)
  return item
}

export async function deleteFromInbox(id: string): Promise<void> {
  await db.inbox.delete(id)
}

/** Turns an inbox item into a task (and takes it out of the inbox), in one step. */
export async function inboxToTask(id: string, task: NewTask): Promise<Task> {
  return db.transaction('rw', [db.inbox, db.tasks], async () => {
    const created = buildTask(task)
    await db.tasks.add(created)
    await db.inbox.delete(id)
    return created
  })
}

/** All focus sessions (used for study hours of free focus). */
export async function listAllFocusSessions(): Promise<FocusSession[]> {
  return db.focus_sessions.toArray()
}

// ---------- whole database (backup / restore / import) ----------

/** The tables a backup contains, in the order they are restored. */
const DATA_TABLES = ['cycles', 'goals', 'tactics', 'tasks', 'habits', 'habit_checks', 'events', 'focus_sessions', 'days', 'subjects', 'topics', 'exams', 'categories', 'study_logs', 'inbox', 'routines', 'projects'] as const
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
  return db.transaction('rw', [db.cycles, db.goals, db.tactics, db.tasks, db.routines], async () => {
    const cycle = await getActiveCycle()
    if (!cycle) return 0
    const weeks = weeksToPrepare(cycle, today)
    if (weeks.length === 0) return 0
    const tactics = await listTacticsForCycle(cycle.id)
    const routines = await db.routines.toArray()
    let generated = cycle.recurring_generated ?? {}
    const toCreate: NewTask[] = []
    for (const week of weeks) {
      const weekTasks = await db.tasks.where('[cycle_id+week_number]').equals([cycle.id, week]).toArray()
      const plan = planRecurring(cycle.id, week, tactics, weekTasks, generated, { weekStart: weekStart(cycle, week), today })
      toCreate.push(...plan.tasks)
      generated = plan.generated
      // Tasks that repeat every week (Tasks → Every week).
      const weekly = planRoutines(cycle.id, week, routines, generated, { weekStart: weekStart(cycle, week), today })
      toCreate.push(...weekly.tasks)
      generated = weekly.generated
    }
    if (JSON.stringify(generated) === JSON.stringify(cycle.recurring_generated ?? {})) return 0
    await db.cycles.update(cycle.id, { recurring_generated: generated })
    const start = Date.now()
    await db.tasks.bulkAdd(toCreate.map((t, i) => buildTask(t, new Date(start + i).toISOString())))
    return toCreate.length
  })
}

/**
 * Saves a tactic's schedule and places the tactic's tasks of this week (and
 * next week, if already prepared) that have no date yet: each goes on a free
 * scheduled day that hasn't passed, at the scheduled time. Tasks already
 * placed or ticked are never moved. With a schedule, times per week = days.
 */
export async function setTacticSchedule(
  tacticId: string,
  schedule: { days: number[]; time: string | null; hours: number | null },
  today: ISODate,
): Promise<void> {
  await db.transaction('rw', db.cycles, db.goals, db.tactics, db.tasks, async () => {
    const days = [...new Set(schedule.days)].sort((a, b) => a - b)
    await db.tactics.update(tacticId, {
      schedule_days: days.length ? days : null,
      schedule_time: days.length ? schedule.time : null,
      schedule_hours: days.length ? schedule.hours : null,
      ...(days.length ? { weekly_frequency: days.length } : {}),
    })
    const tactic = await db.tactics.get(tacticId)
    const sched = tactic && scheduleOf(tactic)
    const cycle = await getActiveCycle()
    if (!tactic || !sched || !cycle) return
    for (const week of weeksToPrepare(cycle, today)) {
      const monday = weekStart(cycle, week)
      const own = (await db.tasks.where('[cycle_id+week_number]').equals([cycle.id, week]).toArray()).filter(
        (t) => t.tactic_id === tacticId,
      )
      const taken = new Set(own.map((t) => t.planned_date).filter(Boolean))
      const free = sched.days.map((d) => addDays(monday, d - 1)).filter((d) => d >= today && !taken.has(d))
      const undated = own
        .filter((t) => t.status === 'todo' && !t.planned_date)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)) // (1/3) gets the first free day
      for (const task of undated) {
        const date = free.shift()
        if (!date) break
        await db.tasks.update(task.id, {
          planned_date: date,
          start_time: sched.time,
          planned_hours: task.planned_hours ?? sched.hours,
          updated_at: now(),
        })
      }
    }
  })
}

/**
 * IMPORT from a file (see logic/exchange.ts): adds the plan's new cycle (if
 * any), new goals, new tactics and tasks, resolving goal/tactic NAMES to ids.
 * Nothing existing is changed. One transaction: all or nothing.
 * Returns the id of the cycle the data went into.
 */
export async function applyImport(plan: ImportPlan, options: { closeActive?: boolean } = {}): Promise<string> {
  return db.transaction('rw', db.cycles, db.goals, db.tactics, db.tasks, async () => {
    let cycleId: string
    if (plan.cycle.kind === 'new') {
      // "Start as a new cycle": the current cycle is closed (kept in history).
      if (options.closeActive) {
        await db.cycles.where('status').equals('active').modify({ status: 'closed', updated_at: now() })
      }
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
