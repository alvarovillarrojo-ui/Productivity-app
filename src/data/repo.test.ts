// Tests for the data-access layer, run against an in-memory fake IndexedDB.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import * as repo from './repo'

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
    expect(all).toEqual({ cycles: [], goals: [], tactics: [], tasks: [] })
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
    await repo.replaceAll({ cycles: [], goals: [], tactics: [], tasks: [] })
    expect(await repo.getSetting('lastBackupAt')).toBe('2026-01-01T00:00:00.000Z')
  })

  it('addAll adds without touching existing data', async () => {
    const { cycle } = await seed()
    const before = await repo.exportAll()
    await repo.addAll({
      cycles: [],
      goals: [],
      tactics: [],
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
