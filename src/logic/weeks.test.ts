import { describe, expect, it } from 'vitest'
import {
  addDays,
  cycleEnd,
  cyclePosition,
  daysBetween,
  defaultWeek,
  isMonday,
  isValidDate,
  lastCompletedWeek,
  mondayOf,
  nextMonday,
  todayISO,
  weekEnd,
  weekNumberOf,
  weekStart,
  weekday,
} from './weeks'

// 9 Nov 2026 is a Monday.
const cycle = { start_date: '2026-11-09', length_weeks: 12 }

describe('basic dates', () => {
  it('formats today in local time', () => {
    expect(todayISO(new Date(2026, 10, 21, 23, 59))).toBe('2026-11-21')
    expect(todayISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })

  it('validates dates', () => {
    expect(isValidDate('2026-11-09')).toBe(true)
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('9/11/2026')).toBe(false)
  })

  it('adds days across month, year and daylight-saving changes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // EU clocks change 29 Mar
    expect(daysBetween('2026-03-23', '2026-03-30')).toBe(7)
  })

  it('knows weekdays', () => {
    expect(weekday('2026-11-09')).toBe(1)
    expect(weekday('2026-11-15')).toBe(7)
    expect(isMonday('2026-11-09')).toBe(true)
    expect(mondayOf('2026-11-15')).toBe('2026-11-09')
  })

  it('suggests the next Monday', () => {
    expect(nextMonday('2026-11-22')).toBe('2026-11-23') // Sunday → tomorrow
    expect(nextMonday('2026-11-23')).toBe('2026-11-23') // Monday → today
    expect(nextMonday('2026-11-25')).toBe('2026-11-30') // Wednesday → next week
  })
})

describe('cycle weeks', () => {
  it('computes week boundaries', () => {
    expect(weekStart(cycle, 1)).toBe('2026-11-09')
    expect(weekEnd(cycle, 1)).toBe('2026-11-15')
    expect(weekStart(cycle, 3)).toBe('2026-11-23')
    expect(cycleEnd(cycle)).toBe('2027-01-31')
  })

  it('finds the week of a date', () => {
    expect(weekNumberOf(cycle, '2026-11-09')).toBe(1)
    expect(weekNumberOf(cycle, '2026-11-15')).toBe(1)
    expect(weekNumberOf(cycle, '2026-11-16')).toBe(2)
    expect(weekNumberOf(cycle, '2026-11-08')).toBe(0)
    expect(weekNumberOf(cycle, '2027-02-01')).toBe(13)
  })

  it('describes where today is in the cycle', () => {
    expect(cyclePosition(cycle, '2026-11-21')).toEqual({
      phase: 'during',
      week: 2,
      daysLeftInWeek: 2, // Saturday + Sunday
    })
    expect(cyclePosition(cycle, '2026-11-09')).toMatchObject({ daysLeftInWeek: 7 })
    expect(cyclePosition(cycle, '2026-11-06')).toEqual({ phase: 'before', daysUntilStart: 3 })
    expect(cyclePosition(cycle, '2027-02-01')).toEqual({ phase: 'after' })
  })

  it('picks a sensible default week', () => {
    expect(defaultWeek(cycle, '2026-11-01')).toBe(1)
    expect(defaultWeek(cycle, '2026-11-21')).toBe(2)
    expect(defaultWeek(cycle, '2027-05-01')).toBe(12)
  })

  it('finds the last completed week', () => {
    expect(lastCompletedWeek(cycle, '2026-11-12')).toBeNull()
    expect(lastCompletedWeek(cycle, '2026-11-16')).toBe(1)
    expect(lastCompletedWeek(cycle, '2026-11-22')).toBe(1) // Sunday: week 2 not over yet
    expect(lastCompletedWeek(cycle, '2027-06-01')).toBe(12)
  })
})
