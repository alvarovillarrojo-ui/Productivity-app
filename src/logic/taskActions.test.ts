import { describe, expect, it } from 'vitest'
import type { Tactic, Task, TaskStatus } from '../data/types'
import { planRecurring, unfinishedCopies, weeksToPrepare } from './taskActions'

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
