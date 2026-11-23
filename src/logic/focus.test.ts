import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FOCUS_SETTINGS as S,
  finishPhase,
  focusMinutesDone,
  formatClock,
  pause,
  remainingMs,
  resume,
  startFocus,
} from './focus'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 23, 9, 0) // 23 Nov 2026 09:00

describe('pomodoro timer', () => {
  it('a focus round lasts 25 minutes', () => {
    const s = startFocus(null, 'task1', S, T0)
    expect(s).toMatchObject({ taskId: 'task1', phase: 'focus', round: 0 })
    expect(remainingMs(s, T0 + 5 * MIN)).toBe(20 * MIN)
    expect(focusMinutesDone(s, S, T0 + 12.5 * MIN)).toBe(12)
  })

  it('pausing freezes the time left; resuming continues from there', () => {
    const paused = pause(startFocus(null, 't', S, T0), T0 + 10 * MIN)
    expect(remainingMs(paused, T0 + 60 * MIN)).toBe(15 * MIN)
    const resumed = resume(paused, T0 + 60 * MIN)
    expect(remainingMs(resumed, T0 + 65 * MIN)).toBe(10 * MIN)
  })

  it('after focus: records 25 min and starts a short break', () => {
    const { state, record } = finishPhase(startFocus(null, 't', S, T0), S, T0 + 25 * MIN)
    expect(record).toBe(25)
    expect(state).toMatchObject({ phase: 'short', round: 1, finished: { taskId: 't', minutes: 25 } })
    expect(remainingMs(state, T0 + 25 * MIN)).toBe(5 * MIN)
  })

  it('every 4th break is a long one', () => {
    let s = startFocus(null, 't', S, T0)
    const phases: string[] = []
    for (let i = 0; i < 4; i++) {
      s = finishPhase(s, S, T0).state // focus → break
      phases.push(s.phase)
      s = startFocus(finishPhase(s, S, T0).state, 't', S, T0) // break → ready → focus
    }
    expect(phases).toEqual(['short', 'short', 'short', 'long'])
  })

  it('after a break: waits for you (nothing recorded)', () => {
    const afterFocus = finishPhase(startFocus(null, 't', S, T0), S, T0).state
    const { state, record } = finishPhase(afterFocus, S, T0 + 5 * MIN)
    expect(record).toBeNull()
    expect(state).toMatchObject({ phase: 'ready', endsAt: null, round: 1 })
  })

  it('switching task starts a new count', () => {
    const afterFocus = finishPhase(startFocus(null, 'a', S, T0), S, T0).state
    expect(startFocus(afterFocus, 'a', S, T0).round).toBe(1)
    expect(startFocus(afterFocus, 'b', S, T0).round).toBe(0)
  })

  it('formats the clock', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_500)).toBe('01:02')
    expect(formatClock(0)).toBe('00:00')
  })
})
