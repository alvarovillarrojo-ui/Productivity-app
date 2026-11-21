import { describe, expect, it } from 'vitest'
import type { Tactic, Task, TaskStatus } from '../data/types'
import { recurringTasks, unfinishedCopies } from './taskActions'

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

describe('recurring tasks', () => {
  const tactics = [
    tactic('run', 'Run', 3),
    tactic('read', 'Read', 1),
    tactic('free', 'Free tactic', null),
    tactic('old', 'Old tactic', 2, false),
  ]

  it('creates frequency × tasks for active tactics with a frequency', () => {
    const created = recurringTasks('c', 2, tactics, [])
    expect(created.map((t) => t.title)).toEqual(['Run (1/3)', 'Run (2/3)', 'Run (3/3)', 'Read'])
    expect(created.every((t) => t.week_number === 2 && t.cycle_id === 'c')).toBe(true)
    expect(created[0].tactic_id).toBe('run')
  })

  it('skips tasks that already exist for the tactic', () => {
    const existing = [task({ tactic_id: 'run', title: 'Long run' }), task({ tactic_id: 'read' })]
    const created = recurringTasks('c', 1, tactics, existing)
    expect(created.map((t) => t.title)).toEqual(['Run (2/3)', 'Run (3/3)'])
  })

  it('creates nothing when everything already exists (pressing twice is safe)', () => {
    const first = recurringTasks('c', 1, tactics, [])
    const asTasks = first.map((t) => task({ tactic_id: t.tactic_id, title: t.title }))
    expect(recurringTasks('c', 1, tactics, asTasks)).toEqual([])
  })

  it('counts done and missed tasks as existing too', () => {
    const existing = [
      task({ tactic_id: 'run', status: 'done' }),
      task({ tactic_id: 'run', status: 'missed' }),
      task({ tactic_id: 'run' }),
    ]
    expect(recurringTasks('c', 1, [tactic('run', 'Run', 3)], existing)).toEqual([])
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
