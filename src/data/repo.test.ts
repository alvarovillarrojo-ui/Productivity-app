// Tests for the data-access layer, run against an in-memory fake IndexedDB.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import * as repo from './repo'
import { buildBackup, parseBackup, parseImport } from '../logic/exchange'
import { startFocus } from '../logic/focus'

async function seed() {
  const cycle = await repo.createCycle({
    name: 'Test cycle',
    start_date: '2026-01-05',
    length_weeks: 12,
    vision: null,
    notes: '',
    status: 'active',
  })
  const goal = await repo.createGoal({
    cycle_id: cycle.id,
    name: 'Fitness',
    description: '',
    weekly_hours_target: 5,
    weekly_hours_minimum: 3,
  })
  const tactic = await repo.createTactic({
    goal_id: goal.id,
    name: 'Run',
    description: '',
    weekly_frequency: 3,
  })
  return { cycle, goal, tactic }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('cycles', () => {
  it('finds the active cycle', async () => {
    const { cycle } = await seed()
    expect((await repo.getActiveCycle())?.id).toBe(cycle.id)
  })

  it('refuses a second active cycle', async () => {
    await seed()
    await expect(
      repo.createCycle({
        name: 'Second',
        start_date: '2026-04-06',
        length_weeks: 12,
        vision: null,
        notes: '',
        status: 'active',
      }),
    ).rejects.toThrow(/still active/)
  })

  it('startNewCycle closes the old cycle and creates the new one with goals and tactics', async () => {
    const { cycle: old } = await seed()
    const created = await repo.startNewCycle({
      cycle: { name: 'Cycle 2', start_date: '2026-04-06', length_weeks: 12, vision: null, notes: '' },
      goals: [
        {
          name: 'Learning',
          description: '',
          weekly_hours_target: 4,
          weekly_hours_minimum: null,
          tactics: [
            { name: 'Read', description: '', weekly_frequency: 5 },
            { name: 'Write', description: '', weekly_frequency: null },
          ],
        },
      ],
    })
    expect((await repo.getCycle(old.id))?.status).toBe('closed')
    expect((await repo.getActiveCycle())?.id).toBe(created.id)
    const [goal] = await repo.listGoals(created.id)
    expect(goal.name).toBe('Learning')
    expect((await repo.listTactics(goal.id)).map((t) => [t.name, t.sort_order])).toEqual([
      ['Read', 0],
      ['Write', 1],
    ])
  })

  it('deleting a cycle removes its goals, tactics and tasks', async () => {
    const { cycle, tactic } = await seed()
    await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'x', tactic_id: tactic.id })
    await repo.deleteCycle(cycle.id)
    const all = await repo.exportAll()
    expect(all).toEqual({ cycles: [], goals: [], tactics: [], tasks: [], habits: [], habit_checks: [], events: [], focus_sessions: [], days: [], subjects: [], topics: [], exams: [], categories: [] })
  })
})

describe('goals and tactics', () => {
  it('keeps display order', async () => {
    const { cycle, goal } = await seed()
    const g2 = await repo.createGoal({
      cycle_id: cycle.id,
      name: 'Learning',
      description: '',
      weekly_hours_target: 3,
      weekly_hours_minimum: null,
    })
    expect(g2.sort_order).toBe(1)
    expect((await repo.listGoals(cycle.id)).map((g) => g.name)).toEqual(['Fitness', 'Learning'])
    await repo.createTactic({ goal_id: g2.id, name: 'Read', description: '', weekly_frequency: null })
    await repo.createTactic({ goal_id: goal.id, name: 'Gym', description: '', weekly_frequency: 2 })
    const names = (await repo.listTacticsForCycle(cycle.id)).map((t) => t.name)
    expect(names).toEqual(['Run', 'Gym', 'Read'])
  })

  it('deleting a goal keeps its tasks as "Other"', async () => {
    const { cycle, goal, tactic } = await seed()
    const task = await repo.createTask({
      cycle_id: cycle.id,
      week_number: 1,
      title: 'Run 5k',
      tactic_id: tactic.id,
    })
    await repo.deleteGoal(goal.id)
    expect(await repo.listTactics(goal.id)).toEqual([])
    const after = await db.tasks.get(task.id)
    expect(after?.tactic_id).toBeNull()
  })
})

describe('tasks', () => {
  it('lists a week sorted by date, undated last', async () => {
    const { cycle } = await seed()
    await repo.createTask({ cycle_id: cycle.id, week_number: 2, title: 'undated' })
    await repo.createTask({ cycle_id: cycle.id, week_number: 2, title: 'wed', planned_date: '2026-01-14' })
    await repo.createTask({ cycle_id: cycle.id, week_number: 2, title: 'mon', planned_date: '2026-01-12' })
    await repo.createTask({ cycle_id: cycle.id, week_number: 3, title: 'other week' })
    const titles = (await repo.listTasksForWeek(cycle.id, 2)).map((t) => t.title)
    expect(titles).toEqual(['mon', 'wed', 'undated'])
  })

  it('createTasks keeps the given order', async () => {
    const { cycle } = await seed()
    const titles = ['A (1/3)', 'A (2/3)', 'A (3/3)', 'B', 'C']
    await repo.createTasks(titles.map((title) => ({ cycle_id: cycle.id, week_number: 1, title })))
    expect((await repo.listTasksForWeek(cycle.id, 1)).map((t) => t.title)).toEqual(titles)
  })

  it('marking done copies planned hours; undoing removes them', async () => {
    const { cycle } = await seed()
    const t = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'x', planned_hours: 2 })
    await repo.setTaskStatus(t.id, 'done')
    expect((await db.tasks.get(t.id))?.actual_hours).toBe(2)
    await repo.setTaskStatus(t.id, 'todo')
    expect((await db.tasks.get(t.id))?.actual_hours).toBeNull()
  })

  it('marking done keeps actual hours that were typed in', async () => {
    const { cycle } = await seed()
    const t = await repo.createTask({
      cycle_id: cycle.id,
      week_number: 1,
      title: 'x',
      planned_hours: 2,
      actual_hours: 3,
    })
    await repo.setTaskStatus(t.id, 'done')
    await repo.setTaskStatus(t.id, 'missed')
    const after = await db.tasks.get(t.id)
    expect(after?.status).toBe('missed')
    expect(after?.actual_hours).toBe(3)
  })
})

describe('backup data', () => {
  it('replaceAll restores exactly what exportAll returned', async () => {
    const { cycle } = await seed()
    await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'x' })
    const snapshot = await repo.exportAll()
    await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'added after backup' })
    await repo.replaceAll(snapshot)
    expect(await repo.exportAll()).toEqual(snapshot)
  })

  it('settings survive a restore', async () => {
    await repo.setSetting('lastBackupAt', '2026-01-01T00:00:00.000Z')
    await repo.replaceAll({ cycles: [], goals: [], tactics: [], tasks: [], habits: [], habit_checks: [], events: [], focus_sessions: [], days: [], subjects: [], topics: [], exams: [], categories: [] })
    expect(await repo.getSetting('lastBackupAt')).toBe('2026-01-01T00:00:00.000Z')
  })

  it('addAll adds without touching existing data', async () => {
    const { cycle } = await seed()
    const before = await repo.exportAll()
    await repo.addAll({
      cycles: [],
      goals: [],
      tactics: [],
      habits: [],
      habit_checks: [],
      events: [],
      focus_sessions: [],
      days: [],
      subjects: [],
      topics: [],
      exams: [],
      categories: [],
      tasks: [
        {
          id: repo.newId(),
          cycle_id: cycle.id,
          week_number: 1,
          title: 'imported',
          tactic_id: null,
          planned_date: null,
          planned_hours: null,
          actual_hours: null,
          status: 'todo',
          miss_reason: null,
          notes: '',
          created_at: '2026-01-05T08:00:00.000Z',
          updated_at: '2026-01-05T08:00:00.000Z',
        },
      ],
    })
    const after = await repo.exportAll()
    expect(after.cycles).toEqual(before.cycles)
    expect(after.tasks).toHaveLength(1)
  })
})

describe('applyImport', () => {
  const file = {
    schema_version: '1.0',
    cycle: { name: 'Imported', start_date: '2026-11-09', length_weeks: 12 },
    goals: [
      { name: 'Fitness', weekly_hours_target: 5, tactics: [{ name: 'Run' }, { name: 'Swim' }] },
      { name: 'Learning', weekly_hours_target: 3, tactics: [{ name: 'Read', weekly_frequency: 2 }] },
    ],
    tasks: [
      { week_number: 1, title: 'Swim 1 km', goal: 'Fitness', tactic: 'Swim', status: 'done', actual_hours: 1 },
      { week_number: 1, title: 'Book ch. 1', goal: 'learning', tactic: 'read' },
      { week_number: 2, title: 'Groceries' },
    ],
  }

  it('creates a new active cycle with goals, tactics and linked tasks', async () => {
    const { plan } = parseImport(file, null)
    const cycleId = await repo.applyImport(plan!)
    expect((await repo.getActiveCycle())?.name).toBe('Imported')
    const goals = await repo.listGoals(cycleId)
    expect(goals.map((g) => g.name)).toEqual(['Fitness', 'Learning'])
    const tactics = await repo.listTacticsForCycle(cycleId)
    expect(tactics.map((t) => t.name)).toEqual(['Run', 'Swim', 'Read'])
    const tasks = await repo.listTasksForCycle(cycleId)
    const byTitle = Object.fromEntries(tasks.map((t) => [t.title, t]))
    expect(byTitle['Swim 1 km'].tactic_id).toBe(tactics[1].id)
    expect(byTitle['Book ch. 1'].tactic_id).toBe(tactics[2].id)
    expect(byTitle['Groceries'].tactic_id).toBeNull()
    expect(byTitle['Swim 1 km']).toMatchObject({ status: 'done', actual_hours: 1 })
  })

  it('adds into the active cycle without changing what exists', async () => {
    const { cycle, goal, tactic } = await seed()
    const target = {
      cycle,
      goals: await repo.listGoals(cycle.id),
      tactics: await repo.listTacticsForCycle(cycle.id),
      tasks: [],
    }
    const { plan } = parseImport(
      {
        schema_version: '1.0',
        goals: [{ name: 'fitness', weekly_hours_target: 99, tactics: [{ name: 'Run' }, { name: 'Gym' }] }],
        tasks: [
          { week_number: 1, title: 'Run', goal: 'Fitness', tactic: 'Run' },
          { week_number: 1, title: 'Gym', goal: 'Fitness', tactic: 'Gym' },
        ],
      },
      target,
    )
    await repo.applyImport(plan!)
    const goals = await repo.listGoals(cycle.id)
    expect(goals).toHaveLength(1)
    expect(goals[0].weekly_hours_target).toBe(goal.weekly_hours_target) // unchanged
    const tactics = await repo.listTactics(goal.id)
    expect(tactics.map((t) => [t.name, t.sort_order])).toEqual([['Run', 0], ['Gym', 1]])
    const tasks = await repo.listTasksForCycle(cycle.id)
    expect(tasks.map((t) => t.tactic_id)).toEqual([tactic.id, tactics[1].id])
  })

  it('refuses to create a second active cycle', async () => {
    await seed()
    const { plan } = parseImport(file, null) // planned as if nothing were active
    await expect(repo.applyImport(plan!)).rejects.toThrow()
    expect(await repo.listCycles()).toHaveLength(1)
  })
})

describe('ensureRecurringTasks', () => {
  // seed(): cycle starts Monday 5 Jan 2026; tactic "Run" 3× per week.
  const WED_WEEK1 = '2026-01-07'
  const SAT_WEEK1 = '2026-01-10'

  it('creates this week’s tasks once, and remembers them on the cycle', async () => {
    const { cycle } = await seed()
    expect(await repo.ensureRecurringTasks(WED_WEEK1)).toBe(3)
    expect(await repo.ensureRecurringTasks(WED_WEEK1)).toBe(0)
    const tasks = await repo.listTasksForWeek(cycle.id, 1)
    expect(tasks.map((t) => t.title)).toEqual(['Run (1/3)', 'Run (2/3)', 'Run (3/3)'])
    expect((await repo.getCycle(cycle.id))?.recurring_generated).toEqual({ ['1|' + tasks[0].tactic_id]: 3 })
  })

  it('does not bring back a deleted task', async () => {
    const { cycle } = await seed()
    await repo.ensureRecurringTasks(WED_WEEK1)
    const [first] = await repo.listTasksForWeek(cycle.id, 1)
    await repo.deleteTask(first.id)
    expect(await repo.ensureRecurringTasks(WED_WEEK1)).toBe(0)
    expect(await repo.listTasksForWeek(cycle.id, 1)).toHaveLength(2)
  })

  it('prepares next week from Saturday', async () => {
    const { cycle } = await seed()
    expect(await repo.ensureRecurringTasks(SAT_WEEK1)).toBe(6)
    expect(await repo.listTasksForWeek(cycle.id, 2)).toHaveLength(3)
  })

  it('a new tactic gets its tasks in the current week', async () => {
    const { cycle, goal } = await seed()
    await repo.ensureRecurringTasks(WED_WEEK1)
    await repo.createTactic({ goal_id: goal.id, name: 'Swim', description: '', weekly_frequency: 1 })
    expect(await repo.ensureRecurringTasks(WED_WEEK1)).toBe(1)
    expect((await repo.listTasksForWeek(cycle.id, 1)).map((t) => t.title)).toContain('Swim')
  })

  it('survives a backup and restore', async () => {
    const { cycle } = await seed()
    await repo.ensureRecurringTasks(WED_WEEK1)
    const [first] = await repo.listTasksForWeek(cycle.id, 1)
    await repo.deleteTask(first.id)
    const backup = parseBackup(JSON.parse(JSON.stringify(buildBackup(await repo.exportAll(), 'x'))))
    expect(backup.issues).toEqual([])
    await repo.replaceAll(backup.data!)
    expect(await repo.ensureRecurringTasks(WED_WEEK1)).toBe(0)
  })
})

describe('habits', () => {
  const newHabit = {
    name: 'Read 10 pages', category: 'saw' as const, identity: 'I am a reader', intention: '', stack: '',
    attractive: '', two_minute: 'Read 1 page', reward: '', days: [1, 2, 3, 4, 5, 6, 7],
  }

  it('creates, ticks and unticks a habit', async () => {
    const h = await repo.createHabit(newHabit, '2026-11-23')
    expect(h).toMatchObject({ active: true, start_date: '2026-11-23', sort_order: 0 })
    expect(await repo.toggleHabitCheck(h.id, '2026-11-23')).toBe(true)
    expect(await repo.listHabitChecks('2026-11-01')).toEqual([{ id: `${h.id}|2026-11-23`, habit_id: h.id, date: '2026-11-23' }])
    expect(await repo.toggleHabitCheck(h.id, '2026-11-23')).toBe(false)
    expect(await repo.listHabitChecks('2026-11-01')).toEqual([])
  })

  it('deleting a habit deletes its ticks', async () => {
    const h = await repo.createHabit(newHabit, '2026-11-23')
    await repo.toggleHabitCheck(h.id, '2026-11-23')
    await repo.deleteHabit(h.id)
    expect(await repo.listHabits()).toEqual([])
    expect(await repo.listHabitChecks('2000-01-01')).toEqual([])
  })

  it('habits are part of backups', async () => {
    const h = await repo.createHabit(newHabit, '2026-11-23')
    await repo.toggleHabitCheck(h.id, '2026-11-23')
    const all = await repo.exportAll()
    await repo.deleteHabit(h.id)
    await repo.replaceAll(all)
    expect((await repo.listHabits()).map((x) => x.name)).toEqual(['Read 10 pages'])
    expect(await repo.listHabitChecks('2026-11-23')).toHaveLength(1)
  })
})

describe('focus (pomodoro)', () => {
  const MIN = 60_000
  const T0 = Date.UTC(2026, 0, 7, 9, 0)
  const S = { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }

  it('a finished focus round is recorded once and adds 25 min to the task', async () => {
    const { cycle, tactic } = await seed()
    const task = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Study', tactic_id: tactic.id, actual_hours: 0.5 })
    await repo.setFocusState(startFocus(null, task.id, S, T0))
    expect(await repo.focusTick(T0 + 10 * MIN)).toBeNull() // still running
    expect(await repo.focusTick(T0 + 25 * MIN)).toBe('focus')
    expect(await repo.focusTick(T0 + 25 * MIN + 1000)).toBeNull() // not twice
    const sessions = await repo.listFocusSessions('2026-01-01')
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ task_id: task.id, task_title: 'Study', minutes: 25, completed: true })
    expect((await db.tasks.get(task.id))?.actual_hours).toBeCloseTo(0.92, 2) // 0.5 h + 25 min
    expect((await repo.getFocusState())?.phase).toBe('short')
    expect(await repo.focusTick(T0 + 30 * MIN)).toBe('short') // break over
    expect((await repo.getFocusState())?.phase).toBe('ready')
  })

  it('stopping early saves the whole minutes done, or nothing when discarded', async () => {
    const { cycle } = await seed()
    const task = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Read' })
    await repo.setFocusState(startFocus(null, task.id, S, T0))
    expect(await repo.stopFocus(T0 + 12.7 * MIN, true)).toBe(12)
    expect((await db.tasks.get(task.id))?.actual_hours).toBe(0.2)
    expect((await repo.listFocusSessions('2026-01-01'))[0]).toMatchObject({ minutes: 12, completed: false })
    expect(await repo.getFocusState()).toBeNull()

    await repo.setFocusState(startFocus(null, task.id, S, T0))
    expect(await repo.stopFocus(T0 + 20 * MIN, false)).toBe(0)
    expect(await repo.listFocusSessions('2026-01-01')).toHaveLength(1)
  })
})

describe('tactic schedule', () => {
  // seed(): cycle from Mon 5 Jan 2026, tactic "Run" 3× per week. Wednesday of week 1:
  const WED = '2026-01-07'

  it('new weeks get their tasks on the scheduled days and time', async () => {
    const { cycle, tactic } = await seed()
    await repo.setTacticSchedule(tactic.id, { days: [3, 5, 6], time: '07:30', hours: 0.5 }, WED)
    expect((await db.tactics.get(tactic.id))?.weekly_frequency).toBe(3)
    await repo.ensureRecurringTasks(WED)
    const tasks = await repo.listTasksForWeek(cycle.id, 1)
    expect(tasks.map((t) => [t.planned_date, t.start_time, t.planned_hours])).toEqual([
      ['2026-01-07', '07:30', 0.5],
      ['2026-01-09', '07:30', 0.5],
      ['2026-01-10', '07:30', 0.5],
    ])
  })

  it('saving a schedule places this week’s undated tasks on free days, never moving placed ones', async () => {
    const { cycle, tactic } = await seed()
    await repo.ensureRecurringTasks(WED) // 3 undated tasks
    const [first] = await repo.listTasksForWeek(cycle.id, 1)
    await repo.updateTask(first.id, { planned_date: '2026-01-09', start_time: '18:00' }) // placed by hand on Friday
    await repo.setTacticSchedule(tactic.id, { days: [1, 3, 5, 7], time: '07:00', hours: 1 }, WED)
    const tasks = await repo.listTasksForWeek(cycle.id, 1)
    const byId = new Map(tasks.map((t) => [t.id, t]))
    expect(byId.get(first.id)).toMatchObject({ planned_date: '2026-01-09', start_time: '18:00' }) // untouched
    // Monday has passed; Friday is taken → Wednesday and Sunday.
    expect(tasks.filter((t) => t.id !== first.id).map((t) => t.planned_date).sort()).toEqual(['2026-01-07', '2026-01-11'])
    // The 4th day raised the frequency: one more task, created for the free day left.
    expect(await repo.ensureRecurringTasks(WED)).toBe(1)
  })

  it('clearing the days removes the schedule but keeps the tasks', async () => {
    const { cycle, tactic } = await seed()
    await repo.setTacticSchedule(tactic.id, { days: [3], time: '07:00', hours: 1 }, WED)
    await repo.setTacticSchedule(tactic.id, { days: [], time: null, hours: null }, WED)
    expect(await db.tactics.get(tactic.id)).toMatchObject({ schedule_days: null, weekly_frequency: 1 })
    expect(await repo.listTasksForWeek(cycle.id, 1)).toHaveLength(0)
  })
})

describe('importIcsEvents', () => {
  const ev = (over = {}) => ({
    ics_uid: 'u1', title: 'Class', date: '2026-11-24', start_time: '09:00', end_time: '10:30',
    repeat_weekly: true, repeat_until: null, notes: '', ...over,
  })
  it('adds new events and updates ones imported before (same calendar id)', async () => {
    expect(await repo.importIcsEvents([ev(), ev({ ics_uid: 'u2', title: 'Exam' })])).toEqual({ added: 2, updated: 0 })
    expect(await repo.importIcsEvents([ev({ start_time: '10:00', end_time: '11:30' })])).toEqual({ added: 0, updated: 1 })
    const events = await repo.listEvents()
    expect(events).toHaveLength(2)
    expect(events.find((e) => e.ics_uid === 'u1')).toMatchObject({ start_time: '10:00', end_time: '11:30' })
  })
})

describe('import as a new cycle', () => {
  it('closes the active cycle and makes the imported one active', async () => {
    const { cycle } = await seed()
    const { plan } = parseImport(
      { schema_version: '1.0', cycle: { name: 'Plan from Claude', start_date: '2026-11-30' }, goals: [{ name: 'G', weekly_hours_target: 3 }] },
      null,
    )
    await repo.applyImport(plan!, { closeActive: true })
    expect((await repo.getActiveCycle())?.name).toBe('Plan from Claude')
    expect((await repo.getCycle(cycle.id))?.status).toBe('closed')
  })
})

describe('cycles list and delete', () => {
  it('counts goals and tasks per cycle', async () => {
    const { cycle } = await seed()
    await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'A' })
    expect(await repo.listCyclesWithCounts()).toEqual([{ cycle: expect.objectContaining({ id: cycle.id }), goals: 1, tasks: 1 }])
  })

  it('deleting a cycle keeps habits and calendar events', async () => {
    const { cycle } = await seed()
    await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'A' })
    await repo.createHabit({ name: 'Read', category: 'saw', identity: '', intention: '', stack: '', attractive: '', two_minute: '', reward: '', days: [1] }, '2026-01-05')
    await repo.createEvent({ title: 'Class', date: '2026-01-06', start_time: '09:00', end_time: '10:00', repeat_weekly: true, repeat_until: null, notes: '', color: '#0891b2' })
    await repo.deleteCycle(cycle.id)
    expect(await repo.listCyclesWithCounts()).toEqual([])
    expect(await db.tasks.count()).toBe(0)
    expect(await db.goals.count()).toBe(0)
    expect(await repo.listHabits()).toHaveLength(1)
    expect((await repo.listEvents())[0].color).toBe('#0891b2')
  })
})

describe('fail causes on tasks', () => {
  it('saves the cause of a missed task and clears it when the status changes', async () => {
    const { cycle } = await seed()
    const task = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Run' })
    await repo.setTaskStatus(task.id, 'missed')
    await repo.setMissReason(task.id, 'energy')
    expect((await db.tasks.get(task.id))?.miss_reason).toBe('energy')
    await repo.setTaskStatus(task.id, 'done')
    expect((await db.tasks.get(task.id))?.miss_reason).toBeNull()
  })
})

describe('day journal', () => {
  it('creates and updates one entry per day, and keeps it in backups', async () => {
    await repo.updateDay('2026-11-23', { must_do: 'task1', mode: 'planned' })
    await repo.updateDay('2026-11-23', { reflection: 'Good focus' })
    expect(await repo.getDay('2026-11-23')).toMatchObject({ must_do: 'task1', mode: 'planned', reflection: 'Good focus' })
    const all = await repo.exportAll()
    expect(all.days).toHaveLength(1)
    await repo.replaceAll({ ...all, days: [], subjects: [], topics: [], exams: [], categories: [] })
    expect(await repo.getDay('2026-11-23')).toBeNull()
  })
})

describe('students', () => {
  it('creates subjects, topics and exams; deleting a subject keeps its tasks', async () => {
    const { cycle } = await seed()
    const s = await repo.createSubject('Corporate Finance')
    await repo.createTopic(s.id, 'WACC')
    await repo.createExam({ subject_id: s.id, kind: 'final', title: 'Final', date: '2027-01-14', start_time: '18:30', weight: 60, grade: null, notes: '' })
    const task = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Study WACC', subject_id: s.id, actual_hours: 2 })
    expect((await repo.listSubjectTasks(s.id)).map((t) => t.id)).toEqual([task.id])
    const backup = await repo.exportAll()
    expect([backup.subjects.length, backup.topics.length, backup.exams.length]).toEqual([1, 1, 1])
    await repo.deleteSubject(s.id)
    expect(await repo.listSubjects()).toEqual([])
    expect(await repo.listTopics()).toEqual([])
    expect(await repo.listExams()).toEqual([])
    expect((await db.tasks.get(task.id))?.subject_id).toBeNull()
  })
})

describe('free pomodoro with a subject', () => {
  it('records the subject on the session (and not when there is a task)', async () => {
    const s = await repo.createSubject('Macro')
    const T0 = Date.UTC(2026, 10, 24, 9, 0)
    const settings = { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }
    await repo.setFocusState({ ...startFocus(null, null, settings, T0), subjectId: s.id })
    await repo.focusTick(T0 + 25 * 60_000)
    const [session] = await repo.listAllFocusSessions()
    expect(session).toMatchObject({ task_id: null, subject_id: s.id, minutes: 25 })
  })
})

describe('.ics import with a type', () => {
  it('tags the file’s events, and re-importing changes the type without duplicating', async () => {
    const ev = { ics_uid: 'd1', title: 'Quiz', date: '2026-11-30', start_time: '10:00', end_time: '11:00', repeat_weekly: false, repeat_until: null, notes: '' }
    await repo.importIcsEvents([ev])
    expect((await repo.listEvents())[0].kind).toBe('other')
    expect(await repo.importIcsEvents([ev], 'deadline')).toEqual({ added: 0, updated: 1 })
    const events = await repo.listEvents()
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('deadline')
  })
})

describe('task kind', () => {
  it('tasks created by hand are tasks; automatic ones are blocks', async () => {
    const { cycle } = await seed()
    const mine = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Buy shoes' })
    expect(mine.kind).toBe('todo')
    await repo.ensureRecurringTasks('2026-01-07')
    const auto = (await repo.listTasksForWeek(cycle.id, 1)).filter((t) => t.id !== mine.id)
    expect(auto.length).toBeGreaterThan(0)
    expect(auto.every((t) => t.kind === 'block')).toBe(true)
  })
})

describe('event colour categories', () => {
  it('deleting a category keeps its events’ colour', async () => {
    const uni = await repo.createCategory('Uni', '#2a78d6')
    const gym = await repo.createCategory('Gym', '#1baf7a')
    expect((await repo.listCategories()).map((c) => c.name)).toEqual(['Uni', 'Gym'])
    const ev = await repo.createEvent({
      title: 'Class', date: '2026-11-30', start_time: '10:00', end_time: '11:00', repeat_weekly: false, repeat_until: null, notes: '', category_id: uni.id,
    })
    await repo.updateCategory(gym.id, { name: 'Gimnasio' })
    await repo.deleteCategory(uni.id)
    expect((await repo.listCategories()).map((c) => c.name)).toEqual(['Gimnasio'])
    expect(await db.events.get(ev.id)).toMatchObject({ category_id: null, color: '#2a78d6' })
    expect((await repo.exportAll()).categories).toHaveLength(1)
  })
})

describe('tasks inside a block', () => {
  it('deleting a block keeps its tasks, unlinked', async () => {
    const { cycle } = await seed()
    const block = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'Study', kind: 'block' })
    const inside = await repo.createTask({ cycle_id: cycle.id, week_number: 1, title: 'DCF exercise' })
    await repo.updateTask(inside.id, { block_id: block.id })
    await repo.deleteTask(block.id)
    expect(await db.tasks.get(inside.id)).toMatchObject({ title: 'DCF exercise', block_id: null })
  })
})
