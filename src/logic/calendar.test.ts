import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Task } from '../data/types'
import { addMonths, calendarItems, eventDates, fromMinutes, isValidTime, layoutDay, monthGrid, toMinutes } from './calendar'

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e', title: 'Class', date: '2026-11-10', start_time: '09:00', end_time: '10:30',
  repeat_weekly: false, repeat_until: null, notes: '', created_at: '', updated_at: '', ...over,
})
const task = (over: Partial<Task> = {}): Task => ({
  id: 't', cycle_id: 'c', week_number: 1, title: 'Study', tactic_id: null, planned_date: '2026-11-11',
  start_time: '10:00', planned_hours: 2, actual_hours: null, status: 'todo', miss_reason: null, notes: '',
  created_at: '', updated_at: '', ...over,
})

describe('times', () => {
  it('converts and validates', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(fromMinutes(570)).toBe('09:30')
    expect(fromMinutes(-5)).toBe('00:00')
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:30')).toBe(false)
  })
})

describe('repeating events', () => {
  it('a one-off event appears only on its date', () => {
    expect(eventDates(event(), '2026-11-09', '2026-11-15')).toEqual(['2026-11-10'])
    expect(eventDates(event(), '2026-11-16', '2026-11-22')).toEqual([])
  })
  it('a weekly event repeats every 7 days, until its end date', () => {
    const weekly = event({ repeat_weekly: true, repeat_until: '2026-11-24' })
    expect(eventDates(weekly, '2026-11-01', '2026-11-30')).toEqual(['2026-11-10', '2026-11-17', '2026-11-24'])
    expect(eventDates(weekly, '2026-11-16', '2026-11-22')).toEqual(['2026-11-17'])
    expect(eventDates(event({ repeat_weekly: true }), '2027-01-04', '2027-01-10')).toEqual(['2027-01-05'])
  })
})

describe('calendar items', () => {
  it('turns events and dated tasks into items, timed by planned hours', () => {
    const items = calendarItems([event()], [task(), task({ id: 'u', planned_date: null })], '2026-11-09', '2026-11-15')
    expect(items.map((i) => [i.kind, i.date, i.start, i.end])).toEqual([
      ['event', '2026-11-10', 540, 630],
      ['task', '2026-11-11', 600, 720],
    ])
  })
  it('a task without a time is an all-day item; without hours it takes 1 h', () => {
    const items = calendarItems([], [task({ start_time: null }), task({ id: 'x', planned_hours: null })], '2026-11-09', '2026-11-15')
    expect(items.map((i) => [i.start, i.end])).toEqual([[null, null], [600, 660]])
  })
})

describe('layoutDay', () => {
  it('puts overlapping blocks side by side, others full width', () => {
    const lanes = layoutDay([
      { key: 'a', start: 540, end: 600 },
      { key: 'b', start: 570, end: 630 },
      { key: 'c', start: 700, end: 760 },
    ])
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 })
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 })
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 1 })
  })
  it('reuses a free column', () => {
    const lanes = layoutDay([
      { key: 'a', start: 540, end: 660 },
      { key: 'b', start: 540, end: 570 },
      { key: 'c', start: 600, end: 630 },
    ])
    expect(lanes.get('c')).toEqual({ lane: 1, lanes: 2 })
  })
})

describe('month', () => {
  it('grid starts on the Monday before the 1st and has 42 days', () => {
    const grid = monthGrid('2026-11-23') // 1 Nov 2026 is a Sunday
    expect(grid[0]).toBe('2026-10-26')
    expect(grid[6]).toBe('2026-11-01')
    expect(grid).toHaveLength(42)
  })
  it('adds months, keeping the day when possible', () => {
    expect(addMonths('2026-11-23', 1)).toBe('2026-12-23')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2026-01-10', -1)).toBe('2025-12-10')
  })
})
