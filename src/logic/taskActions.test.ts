import { describe, expect, it } from 'vitest'
import type { Routine, Tactic, Task, TaskStatus } from '../data/types'
import { attachableTasks, isBlock, planRecurring, planRoutines, routineKey, tasksInBlock, unfinishedCopies, weeksToPrepare } from './taskActions'

const tactic = (id: string, name: string, freq: number | null, active = true): Tactic => ({
  id,
  goal_id: 'g',
  name,
  description: '',
  active,
  weekly_frequency: freq,
  sort_order: 0,
})

let n = 0
const task = (opts: Partial<Task> & { status?: TaskStatus }): Task => ({
  id: `t${++n}`,
  cycle_id: 'c',
  week_number: 1,
  title: 'x',
  tactic_id: null,
  planned_date: null,
  planned_hours: null,
  actual_hours: null,
  status: 'todo',
  miss_reason: null,
  notes: '',
  created_at: '',
  updated_at: '',
  ...opts,
})

describe('automatic recurring tasks', () => {
  const tactics = [
    tactic('run', 'Run', 3),
    tactic('read', 'Read', 1),
    tactic('free', 'Free tactic', null),
    tactic('old', 'Old tactic', 2, false),
  ]

  it('creates frequency × tasks for active tactics with a frequency', () => {
    const { tasks, generated } = planRecurring('c', 2, tactics, [], {})
    expect(tasks.map((t) => t.title)).toEqual(['Run (1/3)', 'Run (2/3)', 'Run (3/3)', 'Read'])
    expect(tasks.every((t) => t.week_number === 2 && t.cycle_id === 'c')).toBe(true)
    expect(generated).toEqual({ '2|run': 3, '2|read': 1 })
  })

  it('the first time, counts tasks that already exist (no duplicates)', () => {
    const existing = [task({ tactic_id: 'run', title: 'My own run', status: 'done' })]
    const { tasks } = planRecurring('c', 1, [tactic('run', 'Run', 3)], existing, {})
    expect(tasks.map((t) => t.title)).toEqual(['Run (2/3)', 'Run (3/3)'])
  })

  it('does not create deleted tasks again', () => {
    // Created 3 before; the user deleted two of them since.
    const left = [task({ tactic_id: 'run', title: 'Run (1/3)' })]
    expect(planRecurring('c', 1, [tactic('run', 'Run', 3)], left, { '1|run': 3 }).tasks).toEqual([])
  })

  it('running twice creates nothing the second time', () => {
    const first = planRecurring('c', 1, tactics, [], {})
    const asTasks = first.tasks.map((t) => task({ tactic_id: t.tactic_id, title: t.title }))
    const second = planRecurring('c', 1, tactics, asTasks, first.generated)
    expect(second.tasks).toEqual([])
    expect(second.generated).toEqual(first.generated)
  })

  it('raising the frequency adds only the extra tasks; lowering deletes nothing', () => {
    const up = planRecurring('c', 1, [tactic('run', 'Run', 4)], [], { '1|run': 3 })
    expect(up.tasks.map((t) => t.title)).toEqual(['Run (4/4)'])
    expect(up.generated['1|run']).toBe(4)
    const down = planRecurring('c', 1, [tactic('run', 'Run', 2)], [], { '1|run': 4 })
    expect(down.tasks).toEqual([])
    expect(down.generated['1|run']).toBe(4)
  })

  it('weeks are independent', () => {
    const { tasks } = planRecurring('c', 2, [tactic('read', 'Read', 1)], [], { '1|read': 1 })
    expect(tasks.map((t) => t.title)).toEqual(['Read'])
  })
})

describe('which weeks to prepare', () => {
  // Cycle starts Monday 9 Nov 2026: week 1 = 9–15 Nov, week 2 = 16–22 Nov.
  const cycle = { start_date: '2026-11-09', length_weeks: 12 }
  it('current week on weekdays; next week too from Saturday', () => {
    expect(weeksToPrepare(cycle, '2026-11-09')).toEqual([1]) // Monday
    expect(weeksToPrepare(cycle, '2026-11-13')).toEqual([1]) // Friday
    expect(weeksToPrepare(cycle, '2026-11-14')).toEqual([1, 2]) // Saturday
    expect(weeksToPrepare(cycle, '2026-11-15')).toEqual([1, 2]) // Sunday
  })
  it('week 1 from two days before the start; nothing earlier or after the end', () => {
    expect(weeksToPrepare(cycle, '2026-11-06')).toEqual([])
    expect(weeksToPrepare(cycle, '2026-11-07')).toEqual([1])
    expect(weeksToPrepare(cycle, '2027-01-31')).toEqual([12]) // last Sunday: no week 13
    expect(weeksToPrepare(cycle, '2027-02-01')).toEqual([])
  })
})

describe('copy unfinished tasks', () => {
  it('copies only open tasks, moving dates by a week', () => {
    const week = [
      task({ title: 'A', status: 'todo', planned_date: '2026-11-18', planned_hours: 2, tactic_id: 'run' }),
      task({ title: 'B', status: 'done' }),
      task({ title: 'C', status: 'missed' }),
      task({ title: 'D', status: 'todo' }),
    ]
    const copies = unfinishedCopies(week, [])
    expect(copies.map((t) => t.title)).toEqual(['A', 'D'])
    expect(copies[0]).toMatchObject({
      week_number: 2,
      planned_date: '2026-11-25',
      planned_hours: 2,
      tactic_id: 'run',
    })
    expect(copies[1].planned_date).toBeNull()
  })

  it('does not duplicate tasks already copied', () => {
    const week = [task({ title: 'A', tactic_id: 'run' }), task({ title: 'B' })]
    const next = [task({ title: 'A', tactic_id: 'run', week_number: 2 })]
    expect(unfinishedCopies(week, next).map((t) => t.title)).toEqual(['B'])
  })
})

describe('scheduled tactics', () => {
  // Week 2 of a cycle starting Mon 9 Nov 2026 → Mon 16 … Sun 22 Nov.
  const study: Tactic = { ...tactic('study', 'Study', 3), schedule_days: [5, 1, 3], schedule_time: '16:00', schedule_hours: 2 }
  const dates = (today: string) => ({ weekStart: '2026-11-16', today })

  it('puts task i on the i-th day (sorted), at the time and duration', () => {
    const { tasks } = planRecurring('c', 2, [study], [], {}, dates('2026-11-15'))
    expect(tasks.map((t) => [t.title, t.planned_date, t.start_time, t.planned_hours])).toEqual([
      ['Study (1/3)', '2026-11-16', '16:00', 2],
      ['Study (2/3)', '2026-11-18', '16:00', 2],
      ['Study (3/3)', '2026-11-20', '16:00', 2],
    ])
  })

  it('skips days that have already passed (tactic added mid-week)', () => {
    const { tasks, generated } = planRecurring('c', 2, [study], [], {}, dates('2026-11-18'))
    expect(tasks.map((t) => t.planned_date)).toEqual(['2026-11-18', '2026-11-20'])
    expect(generated['2|study']).toBe(3) // the Monday one is not created later
  })

  it('a tactic without days keeps undated tasks', () => {
    const { tasks } = planRecurring('c', 2, [tactic('run', 'Run', 2)], [], {}, dates('2026-11-15'))
    expect(tasks.every((t) => t.planned_date === undefined)).toBe(true)
  })
})

describe('blocks vs tasks', () => {
  const run = tactic('run', 'Study block 09:00–11:00', 5)
  it('automatic items are blocks; older ones are recognised by their title', () => {
    expect(planRecurring('c', 1, [run], [], {}).tasks.every((t) => t.kind === 'block')).toBe(true)
    expect(isBlock(task({ tactic_id: 'run', title: 'Study block 09:00–11:00 (2/5)' }), [run])).toBe(true)
    expect(isBlock(task({ tactic_id: 'run', title: 'Study block 09:00–11:00' }), [run])).toBe(true)
    expect(isBlock(task({ tactic_id: 'run', title: 'Read chapter 3 of the book' }), [run])).toBe(false)
    expect(isBlock(task({ tactic_id: null, title: 'Buy shoes' }), [run])).toBe(false)
    // an explicit kind always wins
    expect(isBlock(task({ tactic_id: 'run', title: 'Study block 09:00–11:00', kind: 'todo' }), [run])).toBe(false)
  })
  it('copying unfinished work to next week skips blocks', () => {
    const copies = unfinishedCopies(
      [task({ tactic_id: 'run', title: 'Study block 09:00–11:00 (3/5)' }), task({ tactic_id: 'run', title: 'Prepare slides' })],
      [],
      [run],
    )
    expect(copies.map((c) => [c.title, c.kind])).toEqual([['Prepare slides', 'todo']])
  })
})

describe('tasks inside a block', () => {
  const study = tactic('st', 'Study', 3)
  const block = task({ id: 'b1', tactic_id: 'st', kind: 'block' })
  const other = task({ id: 'b2', tactic_id: 'st', kind: 'block' })
  it('offers open to-dos of the same week that are not in another block', () => {
    const free = task({ id: 'free', title: 'DCF exercise', kind: 'todo' })
    const mine = task({ id: 'mine', title: 'Read ch. 3', kind: 'todo', block_id: 'b1' })
    const inOther = task({ id: 'inOther', kind: 'todo', block_id: 'b2' })
    const orphan = task({ id: 'orphan', kind: 'todo', block_id: 'gone' })
    const done = task({ id: 'done', kind: 'todo', status: 'done' })
    const nextWeek = task({ id: 'next', kind: 'todo', week_number: 2 })
    const all = [block, other, free, mine, inOther, orphan, done, nextWeek]
    expect(attachableTasks(block, all, [study]).map((t) => t.id)).toEqual(['free', 'orphan'])
    expect(tasksInBlock('b1', all).map((t) => t.id)).toEqual(['mine'])
  })
})

describe('tasks that repeat every week (plan)', () => {
  const routine = (over: Partial<Routine>): Routine => ({ id: 'r', title: 'Laundry', tactic_id: null, weekday: 7, start_time: '10:00', planned_hours: 1, active: true, created_at: '', ...over })
  const dates = { weekStart: '2026-11-23', today: '2026-11-25' } // Wednesday
  it('places it on its day, or leaves it without a day', () => {
    const r = planRoutines('c', 1, [routine({}), routine({ id: 'r2', title: 'Plan', weekday: null })], {}, dates)
    expect(r.tasks.map((x) => [x.title, x.planned_date, x.start_time])).toEqual([['Laundry', '2026-11-29', '10:00'], ['Plan', null, null]])
    expect(r.generated).toEqual({ [routineKey(1, 'r')]: 1, [routineKey(1, 'r2')]: 1 })
  })
  it('skips a day that has passed, paused routines and weeks already done', () => {
    const r = planRoutines('c', 1, [routine({ weekday: 1 }), routine({ id: 'p', active: false }), routine({ id: 'd' })], { [routineKey(1, 'd')]: 1 }, dates)
    expect(r.tasks).toEqual([])
    expect(r.generated[routineKey(1, 'r')]).toBe(0)
  })
})
