import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Goal, Tactic, Task } from '../data/types'
import { deadlinesRadar, formatMinutes, freeSlots, lagging } from './day'
import { execution } from './metrics'

const H = 60
const WINDOW = { start: 8 * H + 30, end: 22 * H + 30 } // 08:30–22:30 = 14 h

describe('free time', () => {
  it('is the waking window minus busy blocks (overlaps merged)', () => {
    const busy = [
      { start: 9 * H, end: 11 * H }, // study
      { start: 10 * H, end: 12 * H }, // overlapping class
      { start: 15 * H, end: 16 * H + 30 },
    ]
    const r = freeSlots(busy, WINDOW)
    expect(r.slots).toEqual([
      { start: 8 * H + 30, end: 9 * H },
      { start: 12 * H, end: 15 * H },
      { start: 16 * H + 30, end: 22 * H + 30 },
    ])
    expect(r.minutes).toBe(30 + 180 + 360)
  })
  it('today, only from now on; tiny gaps are ignored', () => {
    const r = freeSlots([{ start: 13 * H + 10, end: 14 * H }], WINDOW, 13 * H)
    expect(r.slots).toEqual([{ start: 14 * H, end: 22 * H + 30 }]) // the 10-minute gap is dropped
  })
  it('formats minutes', () => {
    expect(formatMinutes(150)).toBe('2 h 30 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
  })
})

describe('deadlines radar', () => {
  const ev = (id: string, date: string, kind?: 'class' | 'deadline' | 'other', weekly = false): CalendarEvent => ({
    id, title: id, date, start_time: '10:00', end_time: '11:00', repeat_weekly: weekly, repeat_until: null, notes: '', created_at: '', updated_at: '', kind,
  })
  it('lists only deadlines in the next 3 weeks with days left (not classes or other events)', () => {
    const r = deadlinesRadar(
      [
        ev('exam', '2026-12-10', 'deadline'),
        ev('quiz', '2026-11-24', 'deadline'),
        ev('one-off class', '2026-11-25', 'class'),
        ev('meeting', '2026-11-26', 'other'),
        ev('untyped', '2026-11-26'),
        ev('far', '2027-01-20', 'deadline'),
        ev('past', '2026-11-20', 'deadline'),
      ],
      '2026-11-23',
    )
    expect(r.map((d) => [d.event.id, d.daysLeft])).toEqual([
      ['quiz', 1],
      ['exam', 17],
    ])
  })
})

describe('what is lagging', () => {
  const goal = (id: string, target: number): Goal => ({ id, cycle_id: 'c', name: id, description: '', weekly_hours_target: target, weekly_hours_minimum: null, sort_order: 0 })
  const tactics: Tactic[] = [
    { id: 't1', goal_id: 'grades', name: 'Study', description: '', active: true, weekly_frequency: 5, sort_order: 0 },
    { id: 't2', goal_id: 'fit', name: 'Run', description: '', active: true, weekly_frequency: 3, sort_order: 0 },
  ]
  const task = (tactic: string, status: Task['status'], actual: number | null): Task => ({
    id: Math.random().toString(), cycle_id: 'c', week_number: 1, title: 't', tactic_id: tactic, planned_date: null,
    planned_hours: null, actual_hours: actual, status, miss_reason: null, notes: '', created_at: '', updated_at: '',
  })

  it('flags low execution and hours behind the pace for this point of the week', () => {
    // Thursday 26 Nov: 3 days passed → expected 20 × 3/7 ≈ 8.6 h of Grades.
    const tasks = [task('t1', 'done', 4), task('t1', 'done', 2), task('t2', 'missed', null), task('t2', 'done', 1)]
    const goals = [goal('grades', 20), goal('fit', 2)]
    const byGoal = new Map([
      ['grades', execution(tasks.slice(0, 2), '2026-11-29', '2026-11-26')],
      ['fit', execution(tasks.slice(2), '2026-11-29', '2026-11-26')],
    ])
    const lags = lagging(goals, tactics, tasks, byGoal, '2026-11-26')
    expect(lags).toEqual([
      { kind: 'hours', goal: goals[0], actual: 6, expected: 8.6, target: 20 },
      { kind: 'execution', goal: goals[1], pct: 0.5 },
    ])
  })

  it('nothing is behind on Monday morning', () => {
    expect(lagging([goal('grades', 20)], tactics, [], new Map(), '2026-11-23')).toEqual([])
  })
})
