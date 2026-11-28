import { describe, expect, it } from 'vitest'
import type { CalendarEvent, EventCategory } from '../data/types'
import { AREA_DEFAULT_COLORS, areaColors, examArea, isPickableArea, missingFixedAreas, resolveEventColor } from './areas'

const event = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e', title: 'x', date: '2026-12-01', start_time: null, end_time: null, repeat_weekly: false, repeat_until: null, notes: '', created_at: '', updated_at: '', ...over,
})
const uni: EventCategory = { id: 'c-uni', name: 'Uni', color: '#111111', sort_order: 0, fixed: 'uni' }
const gym: EventCategory = { id: 'c-gym', name: 'Gym', color: '#00aa00', sort_order: 5 }
const deadlines: EventCategory = { id: 'c-dl', name: 'Entregas', color: '#ffaa00', sort_order: 4, fixed: 'deadline' }

describe('calendar colours', () => {
  it('an area wins, then the chosen colour, then the type', () => {
    const cats = [uni, gym, deadlines]
    expect(resolveEventColor(event({ category_id: 'c-gym', color: '#123456' }), cats)).toBe('#00aa00')
    expect(resolveEventColor(event({ color: '#123456', kind: 'class' }), cats)).toBe('#123456')
    expect(resolveEventColor(event({ kind: 'class' }), cats)).toBe('#111111') // your Uni colour
    expect(resolveEventColor(event({ kind: 'deadline' }), cats)).toBe('#ffaa00')
    expect(resolveEventColor(event({ kind: 'other' }), cats)).toBeNull()
  })
  it('uses the default colours when an area is missing (e.g. after restoring an old backup)', () => {
    expect(areaColors([])).toEqual(AREA_DEFAULT_COLORS)
    expect(resolveEventColor(event({ kind: 'class' }), [])).toBe(AREA_DEFAULT_COLORS.uni)
    expect(resolveEventColor(event({ category_id: 'gone' }), [])).toBeNull()
  })
  it('separates exams from things to hand in', () => {
    expect(['quiz', 'midterm', 'final', 'other'].map((k) => examArea({ kind: k as never }, false))).toEqual(['exam', 'exam', 'exam', 'exam'])
    expect(['assignment', 'project', 'group'].map((k) => examArea({ kind: k as never }, false))).toEqual(['deadline', 'deadline', 'deadline'])
    expect(examArea({ kind: 'final' }, true)).toBe('deadline') // an extra date (presentation, draft)
  })
  it('knows which fixed areas are missing, and which can be picked for an event', () => {
    expect(missingFixedAreas([uni, gym, deadlines])).toEqual(['daily', 'travel', 'exam'])
    expect([uni, gym, deadlines].filter(isPickableArea).map((c) => c.name)).toEqual(['Uni', 'Gym'])
  })
})
