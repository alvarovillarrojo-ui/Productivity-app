// Always mounted (once): moves the pomodoro timer on every second,
// on whatever screen you are, plays the ding, keeps the browser tab title up
// to date ("12:34 · Focus"). The visible ⏱ badge is FocusBadge below.
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import * as repo from '../data/repo'
import { useLive } from '../data/useLive'
import { useI18n } from '../i18n'
import { formatClock, remainingMs, type FocusState } from '../logic/focus'
import { ding } from './sound'

/** Ticking clock for screens that show the timer. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function useFocusState(): FocusState | null {
  return useLive(repo.getFocusState, [], null as FocusState | null)
}

export default function FocusRunner() {
  const { t } = useI18n()
  const now = useNow()
  const state = useFocusState()

  useEffect(() => {
    repo
      .focusTick(now)
      .then((ended) => ended && ding())
      .catch((e) => console.error('Focus timer:', e))
  }, [now])

  const active = state !== null && state.phase !== 'ready'
  const clock = active ? formatClock(remainingMs(state, now)) : ''
  const phase = state ? t.focus.phase[state.phase] : ''

  useEffect(() => {
    document.title = active ? `${clock} · ${phase}` : t.appName
  }, [active, clock, phase, t.appName])

  return null
}

/** The small ⏱ badge (shown in the sidebar and the phone's top bar). */
export function FocusBadge() {
  const { t } = useI18n()
  const now = useNow()
  const state = useFocusState()
  if (state === null || state.phase === 'ready') return null
  return (
    <NavLink to="/focus" className={`focus-badge ${state.phase}${state.endsAt === null ? ' paused' : ''}`}>
      {t.focus.badge(formatClock(remainingMs(state, now)), t.focus.phase[state.phase])}
    </NavLink>
  )
}
