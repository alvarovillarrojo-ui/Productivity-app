import { describe, expect, it } from 'vitest'
import type { Goal, Tactic, Task, TaskStatus } from '../data/types'
import {
  bestAndWorstWeeks,
  cycleExecution,
  cycleTotals,
  execution,
  executionPoints,
  missCauses,
  topCause,
  sumExecution,
  formatHours,
  formatPct,
  hoursLevel,
  taskCounts,
  weekExecution,
  weekHours,
} from './metrics'

// Cycle starting Monday 9 Nov 2026; week 1 = 9–15 Nov, week 2 = 16–22 Nov.
const cycle = { start_date: '2026-11-09', length_weeks: 12 }
const WEEK1_END = '2026-11-15'

const goals: Goal[] = [
  { id: 'g1', cycle_id: 'c', name: 'Fitness', description: '', weekly_hours_target: 5, weekly_hours_minimum: 3, sort_order: 0 },
  { id: 'g2', cycle_id: 'c', name: 'Learning', description: '', weekly_hours_target: 4, weekly_hours_minimum: null, sort_order: 1 },
]
const tactics: Tactic[] = [
  { id: 't1', goal_id: 'g1', name: 'Run', description: '', active: true, weekly_frequency: 3, sort_order: 0 },
  { id: 't2', goal_id: 'g2', name: 'Read', description: '', active: true, weekly_frequency: null, sort_order: 0 },
]

let n = 0
function task(
  status: TaskStatus,
  opts: { tactic?: string | null; date?: string | null; week?: number; planned?: number; actual?: number } = {},
): Task {
  n++
  return {
    id: `task${n}`,
    cycle_id: 'c',
    week_number: opts.week ?? 1,
    title: `Task ${n}`,
    tactic_id: opts.tactic === undefined ? 't1' : opts.tactic,
    planned_date: opts.date ?? null,
    planned_hours: opts.planned ?? null,
    actual_hours: opts.actual ?? null,
    status,
    miss_reason: null,
    notes: '',
    created_at: '2026-11-09T08:00:00.000Z',
    updated_at: '2026-11-09T08:00:00.000Z',
  }
}

describe('execution %', () => {
  it('is done / (done + missed) when nothing is open', () => {
    const e = execution([task('done'), task('done'), task('done'), task('missed')], WEEK1_END, '2026-11-20')
    expect(e.pct).toBe(0.75)
    expect(e.counted).toBe(4)
  })

  it('counts open tasks once the week has ended', () => {
    const e = execution([task('done'), task('todo')], WEEK1_END, '2026-11-16')
    expect(e.overdue).toBe(1)
    expect(e.pct).toBe(0.5)
  })

  it('counts open tasks whose planned date is before today', () => {
    const tasks = [task('done'), task('todo', { date: '2026-11-10' })]
    expect(execution(tasks, WEEK1_END, '2026-11-11').pct).toBe(0.5)
  })

  it('does NOT count open tasks planned for today or later', () => {
    const tasks = [
      task('done'),
      task('todo', { date: '2026-11-11' }), // today
      task('todo', { date: '2026-11-13' }), // later
      task('todo'), // no date, week still running
    ]
    const e = execution(tasks, WEEK1_END, '2026-11-11')
    expect(e.upcoming).toBe(3)
    expect(e.pct).toBe(1)
  })

  it('ignores tasks without a tactic ("Other")', () => {
    const tasks = [task('done'), task('missed', { tactic: null }), task('missed', { tactic: null })]
    expect(execution(tasks, WEEK1_END, '2026-11-20').pct).toBe(1)
  })

  it('returns null (shown as "–") when nothing counts yet', () => {
    const e = execution([task('todo', { date: '2026-11-14' })], WEEK1_END, '2026-11-10')
    expect(e.pct).toBeNull()
    expect(formatPct(e.pct)).toBe('–')
    expect(execution([], WEEK1_END, '2026-11-20').pct).toBeNull()
  })
})

describe('week and cycle execution', () => {
  const tasks = [
    // week 1: Fitness 2 done / 1 missed, Learning 1 done, Other 1 missed
    task('done', { tactic: 't1' }),
    task('done', { tactic: 't1' }),
    task('missed', { tactic: 't1' }),
    task('done', { tactic: 't2' }),
    task('missed', { tactic: null }),
    // week 2: Fitness 1 missed, Learning 1 done
    task('missed', { tactic: 't1', week: 2 }),
    task('done', { tactic: 't2', week: 2 }),
  ]
  const today = '2026-11-25' // week 3, so weeks 1 and 2 are over

  it('splits a week by goal', () => {
    const w1 = weekExecution(cycle, 1, tasks.filter((t) => t.week_number === 1), goals, tactics, today)
    expect(w1.overall.pct).toBe(0.75) // 3 of 4, "Other" ignored
    expect(w1.byGoal.get('g1')!.pct).toBeCloseTo(2 / 3)
    expect(w1.byGoal.get('g2')!.pct).toBe(1)
  })

  it('totals the cycle from all counted tasks, not an average of weeks', () => {
    const weeks = cycleExecution(cycle, tasks, goals, tactics, today)
    expect(weeks).toHaveLength(12)
    expect(weeks[1].overall.pct).toBe(0.5)
    expect(weeks[5].overall.pct).toBeNull() // future week
    const totals = cycleTotals(weeks, goals)
    expect(totals.overall.pct).toBeCloseTo(4 / 6) // not (75% + 50%) / 2
    expect(totals.byGoal.get('g1')!.pct).toBe(0.5)
    expect(totals.byGoal.get('g2')!.pct).toBe(1)
  })

  it('finds best and worst weeks', () => {
    const weeks = cycleExecution(cycle, tasks, goals, tactics, today)
    const bw = bestAndWorstWeeks(weeks)!
    expect(bw.best.week).toBe(1)
    expect(bw.worst.week).toBe(2)
    expect(bestAndWorstWeeks(cycleExecution(cycle, [], goals, tactics, today))).toBeNull()
  })
})

describe('hours', () => {
  it('sums actual hours per goal and separates "Other"', () => {
    const tasks = [
      task('done', { tactic: 't1', actual: 2 }),
      task('done', { tactic: 't1', actual: 1.5 }),
      task('todo', { tactic: 't1', planned: 4 }), // planned only: not counted
      task('done', { tactic: 't2', actual: 4 }),
      task('done', { tactic: null, actual: 1 }),
    ]
    const h = weekHours(tasks, goals, tactics)
    expect(h.byGoal[0]).toMatchObject({ goalId: 'g1', actual: 3.5, target: 5, minimum: 3, level: 'minimum' })
    expect(h.byGoal[1]).toMatchObject({ goalId: 'g2', actual: 4, level: 'target' })
    expect(h.other).toBe(1)
  })

  it('grades hours against target and minimum', () => {
    expect(hoursLevel(5, 5, 3)).toBe('target')
    expect(hoursLevel(3, 5, 3)).toBe('minimum')
    expect(hoursLevel(2.9, 5, 3)).toBe('below')
    expect(hoursLevel(4, 5, null)).toBe('below')
  })
})

describe('counts and formatting', () => {
  it('counts all tasks including "Other"', () => {
    expect(taskCounts([task('done'), task('partial'), task('missed', { tactic: null }), task('todo'), task('todo')])).toEqual({
      done: 1,
      partial: 1,
      missed: 1,
      open: 2,
    })
  })

  it('formats numbers', () => {
    expect(formatPct(0.857)).toBe('86%')
    expect(formatPct(0)).toBe('0%')
    expect(formatHours(2.25)).toBe('2.3 h')
    expect(formatHours(2)).toBe('2 h')
  })
})

describe('minimum version (½)', () => {
  it('a partial task counts half', () => {
    // done 1 + ½ + missed 1 → 1.5 / 3 = 50%
    const e = execution([task('done'), task('partial'), task('missed')], WEEK1_END, '2026-11-20')
    expect(e).toMatchObject({ done: 1, partial: 1, missed: 1, counted: 3 })
    expect(e.pct).toBeCloseTo(0.5)
    expect(executionPoints(e)).toBe(1.5)
  })
  it('two halves equal one done; totals add the halves too', () => {
    const a = execution([task('partial'), task('partial')], WEEK1_END, '2026-11-20')
    expect(a.pct).toBeCloseTo(0.5)
    const total = sumExecution([a, execution([task('done')], WEEK1_END, '2026-11-20')])
    expect(total).toMatchObject({ done: 1, partial: 2, counted: 3 })
    expect(total.pct).toBeCloseTo(2 / 3)
  })
})

describe('fail causes', () => {
  it('counts missed tasks by cause and finds the most frequent', () => {
    const missed = (cause: string | null) => ({ ...task('missed'), miss_reason: cause })
    const counts = missCauses([missed('energy'), missed('energy'), missed('planning'), missed(null), task('done')])
    expect(counts).toEqual({ planning: 1, unforeseen: 0, energy: 2, meaning: 0, none: 1 })
    expect(topCause(counts)).toBe('energy')
    expect(topCause(missCauses([missed(null)]))).toBeNull()
  })
})
