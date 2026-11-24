// Pomodoro timer: pure state changes, no clock and no storage, so they can be
// tested. The current state is saved in the device settings, which is why the
// timer keeps running when you switch screens or reload the page.
//
// Cycle: focus (25 min) → short break (5) → focus → … every 4th break is a
// long break (15). A finished focus adds its minutes to the task's actual
// hours; stopping early saves the minutes done so far.

export interface FocusSettings {
  focus: number
  shortBreak: number
  longBreak: number
  /** A long break after this many focus rounds. */
  longEvery: number
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = { focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 }

export type FocusPhase = 'focus' | 'short' | 'long' | 'ready'

export interface FocusState {
  /** The task being worked on, or null for a free focus session. */
  taskId: string | null
  /** 'ready' = waiting for you to start the next focus round. */
  phase: FocusPhase
  /** When the running phase ends (ms since 1970); null when paused/ready. */
  endsAt: number | null
  /** Time left when paused (ms); null when running/ready. */
  remainingMs: number | null
  /** When the current focus round started (ISO), for the session log. */
  startedAt: string | null
  /** Focus rounds completed in this run (for the long break). */
  round: number
  /** For a free focus (no task): the subject studied, if chosen. */
  subjectId?: string | null
  /** Set right after a focus round ends: asks "mark the task done?". */
  finished: { taskId: string | null; minutes: number } | null
}

const MIN = 60_000

export const isRunning = (s: FocusState | null): boolean => s !== null && s.endsAt !== null
export const isPaused = (s: FocusState | null): boolean => s !== null && s.remainingMs !== null

/** Length of a phase in minutes. */
export function phaseMinutes(phase: FocusPhase, settings: FocusSettings): number {
  if (phase === 'focus') return settings.focus
  if (phase === 'short') return settings.shortBreak
  if (phase === 'long') return settings.longBreak
  return 0
}

/** Starts a focus round (keeps the round count when continuing). */
export function startFocus(prev: FocusState | null, taskId: string | null, settings: FocusSettings, now: number): FocusState {
  const sameRun = prev !== null && prev.taskId === taskId
  return {
    taskId,
    phase: 'focus',
    endsAt: now + settings.focus * MIN,
    remainingMs: null,
    startedAt: new Date(now).toISOString(),
    round: sameRun ? prev.round : 0,
    finished: null,
  }
}

/** Milliseconds left in the current phase (0 when ready). */
export function remainingMs(s: FocusState, now: number): number {
  if (s.endsAt !== null) return Math.max(0, s.endsAt - now)
  return s.remainingMs ?? 0
}

export function pause(s: FocusState, now: number): FocusState {
  if (s.endsAt === null) return s
  return { ...s, endsAt: null, remainingMs: Math.max(0, s.endsAt - now) }
}

export function resume(s: FocusState, now: number): FocusState {
  if (s.remainingMs === null) return s
  return { ...s, endsAt: now + s.remainingMs, remainingMs: null }
}

/** Whole minutes of focus done so far in the current focus round. */
export function focusMinutesDone(s: FocusState, settings: FocusSettings, now: number): number {
  if (s.phase !== 'focus') return 0
  return Math.floor((settings.focus * MIN - remainingMs(s, now)) / MIN)
}

/**
 * What happens when the running phase has ended (call when now ≥ endsAt):
 *  - after FOCUS: record `minutes`, start the break (long every N rounds);
 *  - after a BREAK: wait ('ready') for you to start the next focus round.
 * Returns the new state and, after a focus round, the minutes to record.
 */
export function finishPhase(s: FocusState, settings: FocusSettings, now: number): { state: FocusState; record: number | null } {
  if (s.phase === 'focus') {
    const round = s.round + 1
    const phase = round % settings.longEvery === 0 ? 'long' : 'short'
    return {
      state: {
        ...s,
        phase,
        round,
        endsAt: now + phaseMinutes(phase, settings) * MIN,
        remainingMs: null,
        finished: { taskId: s.taskId, minutes: settings.focus },
      },
      record: settings.focus,
    }
  }
  return { state: { ...s, phase: 'ready', endsAt: null, remainingMs: null, startedAt: null }, record: null }
}

/** "mm:ss" for a number of milliseconds (rounded up, so it never shows 00:00 while running). */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
