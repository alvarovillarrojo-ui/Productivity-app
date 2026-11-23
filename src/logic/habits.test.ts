import { describe, expect, it } from 'vitest'
import type { Habit, HabitCheck } from '../data/types'
import { checkSet, consistency, isPlanned, missedLastTime, streak } from './habits'

// Week of Monday 16 – Sunday 22 Nov 2026.
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h', name: 'Read', category: 'saw', identity: '', intention: '', stack: '', attractive: '',
  two_minute: '', reward: '', days: [1, 2, 3, 4, 5, 6, 7], active: true, start_date: '2026-11-01',
  sort_order: 0, created_at: '', updated_at: '', ...over,
})
const ticks = (...dates: string[]): Set<string> =>
  checkSet(dates.map((date): HabitCheck => ({ id: `h|${date}`, habit_id: 'h', date })))

describe('isPlanned', () => {
  it('uses the chosen weekdays and the start date', () => {
    const weekdays = habit({ days: [1, 3, 5], start_date: '2026-11-17' })
    expect(isPlanned(weekdays, '2026-11-16')).toBe(false) // Monday, before the start
    expect(isPlanned(weekdays, '2026-11-18')).toBe(true) // Wednesday
    expect(isPlanned(weekdays, '2026-11-19')).toBe(false) // Thursday
  })
})

describe('streak', () => {
  it('counts consecutive days back from today', () => {
    expect(streak(habit(), ticks('2026-11-18', '2026-11-19', '2026-11-20'), '2026-11-20')).toBe(3)
  })
  it('an unticked today does not break it yet', () => {
    expect(streak(habit(), ticks('2026-11-18', '2026-11-19'), '2026-11-20')).toBe(2)
  })
  it('a missed day breaks it', () => {
    expect(streak(habit(), ticks('2026-11-17', '2026-11-19'), '2026-11-20')).toBe(1)
  })
  it('skips days the habit is not planned', () => {
    const mwf = habit({ days: [1, 3, 5] })
    // Mon 16, Wed 18, Fri 20 done; Tue/Thu not planned.
    expect(streak(mwf, ticks('2026-11-16', '2026-11-18', '2026-11-20'), '2026-11-21')).toBe(3)
  })
})

describe('never miss twice', () => {
  it('warns when the last planned day was missed', () => {
    expect(missedLastTime(habit(), ticks('2026-11-18'), '2026-11-20')).toBe(true) // missed Thu 19
    expect(missedLastTime(habit(), ticks('2026-11-19'), '2026-11-20')).toBe(false)
  })
  it('looks at the last PLANNED day, and not before the start', () => {
    const mwf = habit({ days: [1, 3, 5] })
    expect(missedLastTime(mwf, ticks('2026-11-18'), '2026-11-20')).toBe(false) // Thu wasn't planned
    expect(missedLastTime(habit({ start_date: '2026-11-20' }), ticks(), '2026-11-20')).toBe(false)
  })
})

describe('consistency', () => {
  it('counts planned days up to today; today only once ticked', () => {
    const c = consistency([habit()], ticks('2026-11-16', '2026-11-17', '2026-11-19'), '2026-11-16', '2026-11-22', '2026-11-19')
    expect(c).toEqual({ done: 3, planned: 4, pct: 0.75 })
    const notYet = consistency([habit()], ticks('2026-11-16'), '2026-11-16', '2026-11-22', '2026-11-17')
    expect(notYet).toEqual({ done: 1, planned: 1, pct: 1 })
  })
  it('is null when nothing was planned', () => {
    expect(consistency([habit({ start_date: '2026-12-01' })], ticks(), '2026-11-16', '2026-11-22', '2026-11-22').pct).toBeNull()
  })
})
